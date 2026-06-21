import Link from "next/link";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { formatIDR } from "@/lib/money";
import { HugeiconsIcon } from "@hugeicons/react";
import { PauseIcon } from "@hugeicons/core-free-icons";
import { ResumeButton } from "./resume-button";

export const metadata = { title: "Held orders — POS App" };
export const dynamic = "force-dynamic";

export default async function HeldOrdersPage() {
  const session = await requireAuth();
  const userId = (session.user as { id?: string }).id;
  const role = (session.user as { role?: "ADMIN" | "MANAGER" | "KASIR" }).role ?? "KASIR";

  const where: import("@prisma/client").Prisma.OrderWhereInput =
    role === "KASIR" && userId
      ? { status: "HELD", shift: { userId } }
      : { status: "HELD" };
  const orders = await db.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      shift: { include: { user: { select: { name: true } } } },
      _count: { select: { items: true } },
    },
  });

  return (
    <div className="mx-auto w-full space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl border border-border bg-muted shrink-0">
          <HugeiconsIcon icon={PauseIcon} className="size-5 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Held orders</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {orders.length} held order{orders.length === 1 ? "" : "s"} · resume to continue checkout
          </p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card py-20 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl border border-border bg-muted">
            <HugeiconsIcon icon={PauseIcon} className="size-7 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-foreground">No held orders</p>
            <p className="text-sm text-muted-foreground mt-1">
              Held orders will appear here. Use Hold in the cart to save an order for later.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {orders.map((o) => (
            <div
              key={o.id}
              className="group flex flex-col rounded-xl border border-border bg-card p-4 transition-all hover:border-foreground/20 hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <Link href={`/pos/orders/${o.id}`} className="font-mono text-sm font-medium text-primary hover:underline">
                  {o.orderNumber}
                </Link>
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-600 dark:text-amber-400">
                  <HugeiconsIcon icon={PauseIcon} className="size-2.5" />
                  Held
                </span>
              </div>

              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-lg font-bold tabular-nums">{formatIDR(o.total)}</span>
                <span className="text-xs text-muted-foreground">{o._count.items} item{o._count.items === 1 ? "" : "s"}</span>
              </div>

              <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground border-t border-border pt-3">
                <span className="truncate">{o.shift?.user.name ?? "—"}</span>
                <span>·</span>
                <span className="shrink-0">
                  {o.createdAt.toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                </span>
                <span className="shrink-0">
                  {o.createdAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>

              {o.customerName && (
                <div className="mt-1 text-xs text-muted-foreground">
                  Customer: {o.customerName}
                </div>
              )}

              <div className="mt-3 border-t border-border pt-3">
                <ResumeButton orderId={o.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
