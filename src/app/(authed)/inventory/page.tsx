import Link from "next/link";
import type { Role } from "@prisma/client";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  PackageOpenIcon,
  ArrowRight01Icon,
  AlertCircleIcon,
  Cancel01Icon,
  Search01Icon,
  Settings01Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { StockTable } from "./stock-table";

export const metadata = { title: "Inventory — POS App" };
export const dynamic = "force-dynamic";

function status(current: Prisma.Decimal, min: Prisma.Decimal): "ok" | "low" | "empty" {
  if (current.lte(0)) return "empty";
  if (current.lte(min)) return "low";
  return "ok";
}

export default async function InventoryPage() {
  const session = await requireAuth();
  const role = ((session.user as { role?: Role }).role ?? "KASIR") as Role;
  const canAdjust = role === "ADMIN" || role === "MANAGER";

  const [items, allStock] = await Promise.all([
    db.menuItem.findMany({
      where: { trackStock: true },
      orderBy: [{ categoryId: "asc" }, { name: "asc" }],
      include: { category: { select: { id: true, name: true, color: true } } },
    }),
    db.stockItem.findMany(),
  ]);
  const stockByMenuItem = new Map(allStock.map((s) => [s.menuItemId, s]));

  const lowCount = items.filter((i) => {
    const s = stockByMenuItem.get(i.id);
    if (!s) return true;
    return status(s.currentQty, s.minQty) !== "ok";
  }).length;

  const rows = items.map((item) => {
    const s = stockByMenuItem.get(item.id);
    const st = s ? status(s.currentQty, s.minQty) : "empty";
    return {
      id: item.id,
      name: item.name,
      categoryName: item.category.name,
      categoryColor: item.category.color,
      currentQty: s ? s.currentQty.toString() : "0",
      minQty: s ? s.minQty.toString() : "0",
      maxQty: s ? s.maxQty.toString() : "0",
      unit: s?.unit ?? "pcs",
      status: st,
    };
  });

  return (
    <div className="mx-auto w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl border border-border bg-muted shrink-0">
            <HugeiconsIcon icon={PackageOpenIcon} className="size-5 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Inventory</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {items.length} tracked item{items.length === 1 ? "" : "s"}
              {lowCount > 0 && (
                <span className="ml-1 text-amber-600 dark:text-amber-400">· {lowCount} need restock</span>
              )}
            </p>
          </div>
        </div>
        {canAdjust && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" nativeButton={false} render={<Link href="/inventory/opname" />}>
              <HugeiconsIcon icon={Settings01Icon} className="size-4" />
              Opname
            </Button>
            <Button size="sm" className="gap-1.5" nativeButton={false} render={<Link href="/inventory/adjust" />}>
              Adjust stock
              <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
            </Button>
          </div>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card py-20 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl border border-border bg-muted">
            <HugeiconsIcon icon={PackageOpenIcon} className="size-7 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-foreground">No tracked items</p>
            <p className="text-sm text-muted-foreground mt-1">
              Edit a menu item and turn on &quot;Track stock&quot;.
            </p>
          </div>
        </div>
      ) : (
        <StockTable rows={rows} canAdjust={canAdjust} />
      )}
    </div>
  );
}
