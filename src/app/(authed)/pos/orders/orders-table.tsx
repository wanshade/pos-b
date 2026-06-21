"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { OrderStatus } from "@prisma/client";
import { cn } from "@/lib/utils";
import { formatIDR } from "@/lib/money";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Search01Icon,
  Cancel01Icon,
  ReceiptTextIcon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import { DeleteOrderButton } from "./delete-order-button";

type Row = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  total: string;
  itemCount: number;
  cashierName: string;
  customerName: string | null;
  createdAt: string;
};

type TabKey = "today" | "yesterday" | "week" | "month" | "all";

const TABS: { key: TabKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "all", label: "All" },
];

const STATUS_STYLE: Record<OrderStatus, { label: string; cls: string; dot: string }> = {
  DRAFT: { label: "Draft", cls: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
  HELD: { label: "Held", cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400", dot: "bg-amber-500" },
  PAID: { label: "Paid", cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400", dot: "bg-emerald-500" },
  VOIDED: { label: "Voided", cls: "bg-destructive/10 text-destructive", dot: "bg-destructive" },
  REFUNDED: { label: "Refunded", cls: "bg-orange-500/10 text-orange-600 dark:text-orange-400", dot: "bg-orange-500" },
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function OrdersTable({
  rows,
  isAdmin,
}: {
  rows: Row[];
  isAdmin: boolean;
}) {
  const [tab, setTab] = useState<TabKey>("today");
  const [q, setQ] = useState("");

  const tabCounts = useMemo(() => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const yStart = startOfDay(new Date(now.getTime() - 86400000));
    const yEnd = endOfDay(new Date(now.getTime() - 86400000));
    const weekStart = startOfDay(new Date(now.getTime() - 6 * 86400000));
    const monthStart = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));

    const counts: Record<TabKey, number> = { today: 0, yesterday: 0, week: 0, month: 0, all: rows.length };
    for (const r of rows) {
      const d = new Date(r.createdAt);
      if (d >= todayStart && d <= todayEnd) counts.today++;
      if (d >= yStart && d <= yEnd) counts.yesterday++;
      if (d >= weekStart) counts.week++;
      if (d >= monthStart) counts.month++;
    }
    return counts;
  }, [rows]);

  const filtered = useMemo(() => {
    const now = new Date();
    let from: Date | null = null;
    let to: Date | null = null;

    switch (tab) {
      case "today":
        from = startOfDay(now);
        to = endOfDay(now);
        break;
      case "yesterday":
        from = startOfDay(new Date(now.getTime() - 86400000));
        to = endOfDay(new Date(now.getTime() - 86400000));
        break;
      case "week":
        from = startOfDay(new Date(now.getTime() - 6 * 86400000));
        to = endOfDay(now);
        break;
      case "month":
        from = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1));
        to = endOfDay(now);
        break;
      case "all":
        from = null;
        to = null;
        break;
    }

    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      const d = new Date(r.createdAt);
      if (from && d < from) return false;
      if (to && d > to) return false;
      if (!needle) return true;
      return (
        r.orderNumber.toLowerCase().includes(needle) ||
        r.cashierName.toLowerCase().includes(needle) ||
        (r.customerName ?? "").toLowerCase().includes(needle) ||
        r.status.toLowerCase().includes(needle)
      );
    });
  }, [rows, tab, q]);

  const tabRevenue = useMemo(() => {
    return filtered
      .filter((r) => r.status === "PAID")
      .reduce((s, r) => s + Number(r.total), 0);
  }, [filtered]);

  return (
    <div className="space-y-4">
      {/* ── Tabs ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-medium transition-all",
              tab === t.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {t.label}
            <span
              className={cn(
                "inline-flex items-center justify-center rounded px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
                tab === t.key ? "bg-primary-foreground/15" : "bg-muted",
              )}
            >
              {tabCounts[t.key]}
            </span>
          </button>
        ))}
      </div>

      {/* ── Search + summary ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <HugeiconsIcon
            icon={Search01Icon}
            className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
          />
          <input
            type="text"
            placeholder="Search order #, cashier, customer, status…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-10 w-full rounded-lg border border-border bg-card pl-9 pr-9 text-sm shadow-xs outline-none transition-all placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          />
          {q && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => setQ("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <HugeiconsIcon icon={Cancel01Icon} className="size-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground shrink-0">
          <span>
            <span className="font-semibold text-foreground tabular-nums">{filtered.length}</span> orders
          </span>
          <span className="hidden sm:inline">·</span>
          <span className="hidden sm:inline">
            <span className="font-semibold text-foreground tabular-nums">{formatIDR(tabRevenue)}</span> revenue
          </span>
        </div>
      </div>

      {/* ── Table ────────────────────────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card py-16 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl border border-border bg-muted">
            <HugeiconsIcon icon={ReceiptTextIcon} className="size-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-foreground">
              {rows.length === 0 ? "No orders yet" : "No orders in this period"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {rows.length === 0
                ? "Orders will appear here once payments are processed."
                : "Try a different date filter or search term."}
            </p>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {/* Header row — hidden on mobile */}
          <div className="hidden sm:flex items-center gap-4 border-b border-border bg-muted/40 px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            <span className="w-28 shrink-0">Order #</span>
            <span className="w-16 shrink-0">Status</span>
            <span className="w-28 shrink-0 text-right">Total</span>
            <span className="w-14 shrink-0 text-right">Items</span>
            <span className="flex-1 min-w-0">Cashier</span>
            <span className="w-32 shrink-0 text-right">Date / Time</span>
            <span className="w-20 shrink-0 text-right">Actions</span>
          </div>

          {/* Rows */}
          <div className="divide-y">
            {filtered.map((r) => {
              const st = STATUS_STYLE[r.status];
              const d = new Date(r.createdAt);
              return (
                <Link
                  key={r.id}
                  href={`/pos/orders/${r.id}`}
                  className="group flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 py-3 transition-colors hover:bg-muted/30 sm:flex-nowrap"
                >
                  {/* Order # */}
                  <span className="w-full sm:w-28 shrink-0 font-mono text-sm font-medium text-primary group-hover:underline">
                    {r.orderNumber}
                  </span>

                  {/* Status */}
                  <span className="flex items-center gap-1.5 sm:w-16 shrink-0">
                    <span className={cn("size-1.5 rounded-full shrink-0", st.dot)} />
                    <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide sm:hidden", st.cls)}>
                      {st.label}
                    </span>
                    <span className={cn("hidden sm:inline rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide", st.cls)}>
                      {st.label}
                    </span>
                  </span>

                  {/* Total */}
                  <span className="w-24 sm:w-28 shrink-0 text-right text-sm font-semibold tabular-nums">
                    {formatIDR(r.total)}
                  </span>

                  {/* Items */}
                  <span className="w-14 shrink-0 text-right text-sm text-muted-foreground tabular-nums">
                    {r.itemCount}
                  </span>

                  {/* Cashier */}
                  <span className="order-last sm:order-none w-full sm:flex-1 min-w-0 text-sm text-muted-foreground truncate">
                    <span className="sm:hidden">· </span>
                    {r.cashierName}
                    {r.customerName && (
                      <span className="text-muted-foreground/60"> · {r.customerName}</span>
                    )}
                  </span>

                  {/* Date/Time */}
                  <span className="w-full sm:w-32 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
                    {d.toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                    {" "}
                    {d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                  </span>

                  {/* Actions */}
                  <span className="w-20 shrink-0 flex items-center justify-end gap-1">
                    <span className="hidden sm:flex items-center text-muted-foreground/40 transition-colors group-hover:text-foreground">
                      <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
                    </span>
                    {isAdmin && (
                      <span onClick={(e) => e.preventDefault()}>
                        <DeleteOrderButton orderId={r.id} orderNumber={r.orderNumber} status={r.status} />
                      </span>
                    )}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
