import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { ACTIVE_KITCHEN_STATUSES } from "@/lib/kitchen/status";
import { KitchenBoard, type KitchenOrder } from "./kitchen-board";

export const metadata = { title: "Kitchen — POS App" };
export const dynamic = "force-dynamic";

export default async function KitchenPage() {
  await requireRole(["KITCHEN", "MANAGER", "ADMIN"]);

  const orders = await db.order.findMany({
    where: { status: "PAID", kitchenStatus: { in: ACTIVE_KITCHEN_STATUSES } },
    orderBy: { paidAt: "asc" }, // oldest first — FIFO prep
    include: {
      items: {
        orderBy: { createdAt: "asc" },
        include: { modifiers: true },
      },
      shift: { include: { user: { select: { name: true } } } },
    },
  });

  const rows: KitchenOrder[] = orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    type: o.type,
    kitchenStatus: o.kitchenStatus,
    customerName: o.customerName,
    notes: o.notes,
    cashierName: o.shift?.user.name ?? null,
    paidAt: o.paidAt ? o.paidAt.toISOString() : null,
    queuedAt: o.kitchenQueuedAt ? o.kitchenQueuedAt.toISOString() : null,
    preparingAt: o.kitchenPreparingAt ? o.kitchenPreparingAt.toISOString() : null,
    readyAt: o.kitchenReadyAt ? o.kitchenReadyAt.toISOString() : null,
    items: o.items.map((it) => ({
      id: it.id,
      name: it.nameSnapshot,
      variant: it.variantNameSnapshot,
      qty: it.qty,
      notes: it.notes,
      modifiers: it.modifiers.map((m) => m.nameSnapshot),
    })),
  }));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Kitchen</h1>
        <p className="text-sm text-muted-foreground">
          {rows.length} active order{rows.length === 1 ? "" : "s"} · auto-refreshes every 15s
        </p>
      </div>
      <KitchenBoard initialOrders={rows} />
    </div>
  );
}
