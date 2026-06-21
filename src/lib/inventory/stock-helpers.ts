/**
 * Stock-related helpers.
 *
 * Used by menu item actions to auto-create StockItem, and (later) by
 * stock adjustment / PO receive flows to create movements.
 */

import { Prisma, type MovementType } from "@prisma/client";
import { db } from "@/lib/db";

/**
 * Ensure a StockItem exists for the given menu item.
 * Idempotent: if one already exists, returns it.
 * Used when trackStock is enabled (either on create or via update).
 */
export async function ensureStockItemForMenuItem(menuItemId: string) {
  const existing = await db.stockItem.findUnique({ where: { menuItemId } });
  if (existing) return existing;
  return db.stockItem.create({ data: { menuItemId } });
}

/**
 * Find a stock item by menu item id, or null if not tracking.
 */
export function stockByMenuItemId(map: Map<string, { id: string; currentQty: Prisma.Decimal; minQty: Prisma.Decimal; unit: string }>, menuItemId: string) {
  return map.get(menuItemId) ?? null;
}

/** Check if stock is at or below the minimum threshold. */
export function isLowStock(currentQty: Prisma.Decimal, minQty: Prisma.Decimal): boolean {
  return currentQty.lte(minQty);
}

export type RecordStockMovementInput = {
  stockItemId: string;
  type: MovementType;
  qty: Prisma.Decimal | string | number; // signed: positive = in, negative = out
  refType?: string;
  refId?: string;
  reason?: string;
  createdById?: string | null;
};

/**
 * Insert a StockMovement AND update StockItem.currentQty in a single
 * transaction. Throws on insufficient stock for outbound moves.
 */
export async function recordStockMovement(input: RecordStockMovementInput) {
  const qty = new Prisma.Decimal(input.qty.toString());
  return db.$transaction(async (tx) => {
    const stock = await tx.stockItem.findUnique({ where: { id: input.stockItemId } });
    if (!stock) throw new Error("StockItem not found: " + input.stockItemId);

    const newQty = stock.currentQty.plus(qty);
    if (newQty.lt(0)) {
      throw new Error(
        `Insufficient stock for ${input.stockItemId}: have ${stock.currentQty.toString()}, would go to ${newQty.toString()}`,
      );
    }

    const movement = await tx.stockMovement.create({
      data: {
        stockItemId: input.stockItemId,
        type: input.type,
        qty,
        refType: input.refType,
        refId: input.refId,
        reason: input.reason,
        createdById: input.createdById ?? null,
      },
    });

    await tx.stockItem.update({
      where: { id: input.stockItemId },
      data: { currentQty: newQty },
    });

    return movement;
  });
}

/**
 * List stock levels that are at or below their minimum threshold.
 * Used by the low-stock badge on the dashboard.
 */
export async function findLowStockItems() {
  // Fetch all (SQLite doesn't support column-vs-column comparisons directly)
  const stocks = await db.stockItem.findMany({
    include: { menuItem: { select: { id: true, name: true, isAvailable: true } } },
  });
  return stocks.filter((s) => isLowStock(s.currentQty, s.minQty));
}
