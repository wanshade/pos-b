import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { formatIDR } from "@/lib/money";
import { HugeiconsIcon } from "@hugeicons/react";
import { DeliveryTruck01Icon } from "@hugeicons/core-free-icons";
import { NewPOModal } from "./new-po-modal";
import { PurchaseOrdersTable } from "./po-table";

export const metadata = { title: "Purchase Orders — POS App" };
export const dynamic = "force-dynamic";

export default async function PurchaseOrdersPage() {
  await requireRole(["ADMIN", "MANAGER"]);
  const [pos, menuItems] = await Promise.all([
    db.purchaseOrder.findMany({
      orderBy: { createdAt: "desc" },
      include: { items: true },
    }),
    db.menuItem.findMany({
      orderBy: [{ name: "asc" }],
      include: { stock: true, category: { select: { name: true } } },
    }),
  ]);

  const stocks = menuItems.map((i) => ({
    id: i.id,
    name: i.name,
    category: i.category.name,
    currentQty: i.stock ? i.stock.currentQty.toString() : null,
    unit: i.stock?.unit ?? "pcs",
    cost: i.cost.toString(),
  }));

  const rows = pos.map((p) => ({
    id: p.id,
    poNumber: p.poNumber,
    status: p.status,
    supplierName: p.supplierName,
    total: p.total.toString(),
    lineCount: p.items.length,
    createdAt: p.createdAt.toISOString(),
  }));

  return (
    <div className="mx-auto w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl border border-border bg-muted shrink-0">
            <HugeiconsIcon icon={DeliveryTruck01Icon} className="size-5 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Purchase Orders</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {pos.length} total order{pos.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        {stocks.length > 0 && <NewPOModal stocks={stocks} />}
      </div>

      <PurchaseOrdersTable rows={rows} />
    </div>
  );
}
