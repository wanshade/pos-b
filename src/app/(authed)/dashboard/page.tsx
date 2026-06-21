/**
 * Dashboard — role-aware landing page after sign-in.
 *
 * Design language: professional, data-first, card-based.
 * - Time-aware greeting + Indonesian date + role badge
 * - Stat cards with icons, trend indicators, and sub-text
 * - 7-day revenue sparkline chart
 * - Recent orders list
 * - Top items today (MANAGER+)
 * - Low stock alerts (MANAGER+)
 * - Quick access grid
 */

import Link from "next/link";
import {
  ShoppingCartIcon,
  ClipboardListIcon,
  BarChart3Icon,
  UsersIcon,
  SettingsIcon,
  PackageOpenIcon,
  CircleDollarSignIcon,
  ScrollTextIcon,
  TrendingUpIcon,
  ReceiptIcon,
  ClockIcon,
  PackageIcon,
  ArrowUpRightIcon,
  ArrowDownRightIcon,
  MinusIcon,
  ChevronRightIcon,
  AlertTriangleIcon,
  CoffeeIcon,
} from "lucide-react";
import type { Role } from "@prisma/client";
import { requireAuth } from "@/lib/session";
import { db } from "@/lib/db";
import { findLowStockItems } from "@/lib/inventory/stock-helpers";
import { formatIDR } from "@/lib/money";
import { RevenueSparkline } from "./sparkline";
import { salesByDay, type DateRange } from "@/lib/reports/aggregations";

export const metadata = { title: "Dashboard — POS App" };
export const dynamic = "force-dynamic";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 11) return "Good morning";
  if (h < 15) return "Good afternoon";
  if (h < 18) return "Good evening";
  return "Good night";
}

type QuickAction = {
  href: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
};

function quickActionsForRole(role: Role): QuickAction[] {
  if (role === "KITCHEN") {
    return [{ href: "/kitchen", title: "Kitchen Display", icon: CoffeeIcon }];
  }
  const actions: QuickAction[] = [
    { href: "/pos", title: "POS Terminal", icon: ShoppingCartIcon },
    { href: "/shifts", title: "My Shifts", icon: ClipboardListIcon },
  ];
  if (role === "MANAGER" || role === "ADMIN") {
    actions.push(
      { href: "/kitchen", title: "Kitchen Display", icon: CoffeeIcon },
      { href: "/reports", title: "Sales Reports", icon: BarChart3Icon },
      { href: "/inventory", title: "Inventory", icon: PackageOpenIcon },
    );
  }
  if (role === "ADMIN") {
    actions.push(
      { href: "/admin/users", title: "Users", icon: UsersIcon },
      { href: "/admin/settings", title: "Settings", icon: SettingsIcon },
      { href: "/admin/audit", title: "Audit Log", icon: ScrollTextIcon },
      { href: "/reports/profit", title: "Profit & Loss", icon: CircleDollarSignIcon },
    );
  }
  return actions;
}

function TrendIndicator({ value }: { value: number | null }) {
  if (value === null || value === 0) {
    return (
      <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
        <MinusIcon className="size-3" />
        <span>No change</span>
      </div>
    );
  }
  const isUp = value > 0;
  const pct = Math.abs(value);
  return (
    <div
      className={`flex items-center gap-1 text-xs font-bold ${
        isUp ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
      }`}
    >
      {isUp ? <ArrowUpRightIcon className="size-3.5" /> : <ArrowDownRightIcon className="size-3.5" />}
      <span>{pct.toFixed(1)}%</span>
    </div>
  );
}

export default async function DashboardPage() {
  const session = await requireAuth();
  const user = session.user as { name: string; id?: string; role?: Role };
  const role: Role = user.role ?? "KASIR";
  const actions = quickActionsForRole(role);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const yesterdayStart = new Date();
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  yesterdayStart.setHours(0, 0, 0, 0);
  const yesterdayEnd = new Date();
  yesterdayEnd.setDate(yesterdayEnd.getDate() - 1);
  yesterdayEnd.setHours(23, 59, 59, 999);

  const [todayAgg, yesterdayAgg] = await Promise.all([
    db.order.aggregate({
      where: { status: "PAID", paidAt: { gte: todayStart, lte: todayEnd } },
      _sum: { total: true },
      _count: true,
    }),
    db.order.aggregate({
      where: { status: "PAID", paidAt: { gte: yesterdayStart, lte: yesterdayEnd } },
      _sum: { total: true },
      _count: true,
    }),
  ]);

  const todayRevenue = todayAgg._sum.total;
  const todayOrderCount = todayAgg._count;
  const yesterdayRevenue = yesterdayAgg._sum.total;
  const yesterdayOrderCount = yesterdayAgg._count;

  const revenueTrend =
    yesterdayRevenue && yesterdayRevenue.toNumber() > 0
      ? ((todayRevenue?.toNumber() ?? 0) - yesterdayRevenue.toNumber()) / yesterdayRevenue.toNumber() * 100
      : null;
  const orderTrend =
    yesterdayOrderCount > 0
      ? ((todayOrderCount - yesterdayOrderCount) / yesterdayOrderCount) * 100
      : null;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);
  const sparkRange: DateRange = { from: sevenDaysAgo, to: todayEnd };
  const sparkData = await salesByDay(sparkRange);

  const sparkRows = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(sevenDaysAgo);
    d.setDate(d.getDate() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const row = sparkData.find((r) => r.date === key);
    return {
      date: key,
      total: row ? Number(row.total.toString()) : 0,
      orderCount: row ? row.orderCount : 0,
    };
  });

  const weekTotal = sparkRows.reduce((s, r) => s + r.total, 0);
  const weekOrders = sparkRows.reduce((s, r) => s + r.orderCount, 0);

  const openShift = user.id
    ? await db.shift.findFirst({
        where: { userId: user.id, status: "OPEN" },
        select: { id: true, openedAt: true, openingCash: true },
      })
    : null;

  const recentOrders = await db.order.findMany({
    where: { status: "PAID", paidAt: { gte: todayStart, lte: todayEnd } },
    select: {
      id: true,
      orderNumber: true,
      total: true,
      paidAt: true,
      type: true,
      customerName: true,
      shift: { select: { user: { select: { name: true } } } },
    },
    orderBy: { paidAt: "desc" },
    take: 5,
  });

  let topItems: { name: string; qty: number; revenue: number }[] = [];
  let lowStockItems: { menuItem: { id: string; name: string; isAvailable: boolean }; currentQty: string; unit: string; minQty: string }[] = [];
  if (role === "MANAGER" || role === "ADMIN") {
    const todayOrderItems = await db.orderItem.findMany({
      where: {
        order: { status: "PAID", paidAt: { gte: todayStart, lte: todayEnd } },
      },
      include: { menuItem: { select: { name: true } } },
    });
    const byName = new Map<string, { qty: number; revenue: number }>();
    for (const it of todayOrderItems) {
      const cur = byName.get(it.nameSnapshot) ?? { qty: 0, revenue: 0 };
      cur.qty += it.qty;
      cur.revenue += Number(it.lineTotal.toString());
      byName.set(it.nameSnapshot, cur);
    }
    topItems = Array.from(byName.entries())
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const lows = await findLowStockItems();
    lowStockItems = lows.slice(0, 5).map((s) => ({
      menuItem: { id: s.menuItem.id, name: s.menuItem.name, isAvailable: s.menuItem.isAvailable },
      currentQty: s.currentQty.toString(),
      unit: s.unit,
      minQty: s.minQty.toString(),
    }));
  }

  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const canSeeInsights = role === "MANAGER" || role === "ADMIN";

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* ── Greeting ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
          {getGreeting()}, {user.name}
        </h1>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{today}</span>
          <span className="text-muted-foreground/30">·</span>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
            {role}
          </span>
        </div>
      </div>

      {/* ── Stat cards ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <TrendingUpIcon className="size-4.5" />
            </div>
            <TrendIndicator value={revenueTrend} />
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Today&apos;s Revenue
          </p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight">
            {formatIDR(todayRevenue ?? 0)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            vs {formatIDR(yesterdayRevenue ?? 0)} yesterday
          </p>
        </div>

        {/* Orders */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <div className="flex size-9 items-center justify-center rounded-xl bg-chart-2/10 text-chart-2">
              <ReceiptIcon className="size-4.5" />
            </div>
            <TrendIndicator value={orderTrend} />
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Today&apos;s Orders
          </p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight">
            {todayOrderCount}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            vs {yesterdayOrderCount} yesterday
          </p>
        </div>

        {/* Shift */}
        <Link
          href={openShift ? `/shifts/${openShift.id}` : "/shifts/open"}
          className="rounded-xl border border-border bg-card p-5 transition-all hover:border-foreground/20 hover:shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div
              className={`flex size-9 items-center justify-center rounded-xl ${
                openShift
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
              }`}
            >
              <ClockIcon className="size-4.5" />
            </div>
            <ChevronRightIcon className="size-4 text-muted-foreground/40" />
          </div>
          <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Shift
          </p>
          <p className="mt-1.5 text-2xl font-bold tracking-tight">
            {openShift ? "Active" : "Closed"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {openShift
              ? `Opened ${new Date(openShift.openedAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`
              : "Tap to open"}
          </p>
        </Link>

        {/* Low stock / Quick start */}
        {canSeeInsights ? (
          <Link
            href="/inventory"
            className="rounded-xl border border-border bg-card p-5 transition-all hover:border-foreground/20 hover:shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div
                className={`flex size-9 items-center justify-center rounded-xl ${
                  lowStockItems.length > 0
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <PackageIcon className="size-4.5" />
              </div>
              <ChevronRightIcon className="size-4 text-muted-foreground/40" />
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Low Stock
            </p>
            <p
              className={`mt-1.5 text-2xl font-bold tracking-tight ${
                lowStockItems.length > 0 ? "text-amber-600 dark:text-amber-400" : ""
              }`}
            >
              {lowStockItems.length}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {lowStockItems.length > 0 ? "Need restock" : "All good"}
            </p>
          </Link>
        ) : (
          <Link
            href="/pos"
            className="rounded-xl border border-border bg-card p-5 transition-all hover:border-foreground/20 hover:shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <ShoppingCartIcon className="size-4.5" />
              </div>
              <ChevronRightIcon className="size-4 text-muted-foreground/40" />
            </div>
            <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Quick Start
            </p>
            <p className="mt-1.5 text-2xl font-bold tracking-tight text-primary">
              Open POS →
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Start a new transaction
            </p>
          </Link>
        )}
      </div>

      {/* ── Revenue chart + Recent orders ────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Revenue sparkline — spans 2 cols */}
        <div className="rounded-xl border border-border bg-card p-5 lg:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-base font-semibold tracking-tight">Revenue — Last 7 Days</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {weekOrders} orders · {formatIDR(weekTotal)} total
              </p>
            </div>
            {canSeeInsights && (
              <Link
                href="/reports"
                className="text-xs font-bold text-primary hover:underline"
              >
                View report →
              </Link>
            )}
          </div>
          <div className="mt-4">
            {sparkRows.every((r) => r.total === 0) ? (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                No sales data for the past 7 days.
              </div>
            ) : (
              <RevenueSparkline data={sparkRows} />
            )}
          </div>
        </div>

        {/* Recent orders */}
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold tracking-tight">Recent Orders</h2>
            {canSeeInsights && (
              <Link
                href="/pos/orders"
                className="text-xs font-bold text-primary hover:underline"
              >
                All →
              </Link>
            )}
          </div>
          <div className="mt-3 space-y-1">
            {recentOrders.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                No orders today yet.
              </div>
            ) : (
              recentOrders.map((o) => (
                <Link
                  key={o.id}
                  href={canSeeInsights ? `/pos/orders/${o.id}` : "/pos"}
                  className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/60"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <ReceiptIcon className="size-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{o.orderNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {o.paidAt
                          ? new Date(o.paidAt).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
                          : "—"}
                        {o.shift?.user?.name ? ` · ${o.shift.user.name}` : ""}
                      </p>
                    </div>
                  </div>
                  <p className="shrink-0 font-mono text-sm font-semibold">
                    {formatIDR(o.total)}
                  </p>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Top items + Low stock alerts (MANAGER+) ──────────── */}
      {canSeeInsights && (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Top items today */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <CoffeeIcon className="size-4 text-muted-foreground" />
              <h2 className="text-base font-semibold tracking-tight">Top Items Today</h2>
            </div>
            <div className="mt-3 space-y-1">
              {topItems.length === 0 ? (
                <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                  No items sold today yet.
                </div>
              ) : (
                topItems.map((item, idx) => (
                  <div
                    key={item.name}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-bold text-muted-foreground">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.qty} sold</p>
                    </div>
                    <p className="shrink-0 font-mono text-sm font-semibold">
                      {formatIDR(item.revenue)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Low stock alerts */}
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangleIcon
                  className={`size-4 ${
                    lowStockItems.length > 0
                      ? "text-amber-500"
                      : "text-muted-foreground/40"
                  }`}
                />
                <h2 className="text-base font-semibold tracking-tight">Stock Alerts</h2>
              </div>
              <Link
                href="/inventory"
                className="text-xs font-bold text-primary hover:underline"
              >
                Manage →
              </Link>
            </div>
            <div className="mt-3 space-y-1">
              {lowStockItems.length === 0 ? (
                <div className="flex h-40 flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                  <PackageIcon className="size-8 text-muted-foreground/20" />
                  <span>All stock levels are healthy.</span>
                </div>
              ) : (
                lowStockItems.map((s) => (
                  <Link
                    key={s.menuItem.id}
                    href="/inventory"
                    className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/60"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                        <PackageIcon className="size-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{s.menuItem.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.currentQty} {s.unit} left · min {s.minQty}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-600 dark:text-amber-400">
                      Low
                    </span>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Quick access ─────────────────────────────────────── */}
      <div className="space-y-3">
        <h2
          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          style={{ fontFeatureSettings: '"ss01", "ss02"' }}
        >
          Quick Access
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {actions.map((a) => {
            const Icon = a.icon;
            return (
              <Link
                key={a.href}
                href={a.href}
                className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-foreground/20 hover:shadow-sm"
              >
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-muted-foreground transition-all group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="size-5" />
                </div>
                <span className="text-sm font-medium">{a.title}</span>
                <ChevronRightIcon className="ml-auto size-4 shrink-0 text-muted-foreground/30 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
