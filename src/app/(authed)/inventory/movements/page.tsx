import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowDown01Icon, ArrowUp01Icon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { MovementTable } from "./movement-table";

export const metadata = { title: "Stock movements — POS App" };
export const dynamic = "force-dynamic";

type SearchParams = {
  from?: string;
  to?: string;
  menuItemId?: string;
  type?: string;
};

export default async function MovementsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requireRole(["ADMIN", "MANAGER"]);
  const sp = await searchParams;

  const where: import("@prisma/client").Prisma.StockMovementWhereInput = {};
  if (sp.menuItemId) where.stockItem = { menuItemId: sp.menuItemId };
  if (sp.type) where.type = sp.type as import("@prisma/client").MovementType;

  if (sp.from || sp.to) {
    where.createdAt = {};
    if (sp.from) {
      const d = new Date(sp.from);
      if (!isNaN(d.getTime())) where.createdAt.gte = d;
    }
    if (sp.to) {
      const d = new Date(sp.to);
      if (!isNaN(d.getTime())) {
        d.setHours(23, 59, 59, 999);
        where.createdAt.lte = d;
      }
    }
  }

  const [movements, items] = await Promise.all([
    db.stockMovement.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        stockItem: {
          include: { menuItem: { select: { id: true, name: true, category: { select: { name: true, color: true } } } } },
        },
        createdBy: { select: { name: true } },
      },
    }),
    db.menuItem.findMany({
      where: { trackStock: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const rows = movements.map((m) => ({
    id: m.id,
    itemName: m.stockItem.menuItem.name,
    categoryName: m.stockItem.menuItem.category.name,
    categoryColor: m.stockItem.menuItem.category.color,
    type: m.type,
    qty: m.qty.toString(),
    unit: m.stockItem.unit,
    reason: m.reason ?? null,
    refType: m.refType ?? null,
    refId: m.refId ?? null,
    createdByName: m.createdBy?.name ?? "—",
    createdAt: m.createdAt.toISOString(),
  }));

  return (
    <div className="mx-auto w-full space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl border border-border bg-muted shrink-0">
          <HugeiconsIcon icon={ArrowDown01Icon} className="size-5 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Stock movements</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {movements.length} movement{movements.length === 1 ? "" : "s"} (max 200)
          </p>
        </div>
      </div>

      <MovementTable
        rows={rows}
        items={items}
        current={{
          from: sp.from ?? "",
          to: sp.to ?? "",
          menuItemId: sp.menuItemId ?? "",
          type: sp.type ?? "",
        }}
      />
    </div>
  );
}
