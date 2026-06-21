import { describe, it, expect, afterAll } from "vitest";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { recordStockMovement, findLowStockItems, isLowStock } from "@/lib/inventory/stock-helpers";

/**
 * End-to-end stock math + low-stock detection.
 * Covers the "T3.12" TDD-worthy bits from the plan:
 * - stock math (current + movement = new) across many types
 * - low-stock detection (currentQty <= minQty)
 */
describe("stock math end-to-end", () => {
  let testCategoryId: string;
  const items: { id: string; name: string; stockId: string }[] = [];
  const createdMovements: string[] = [];

  afterAll(async () => {
    for (const id of createdMovements) {
      await db.stockMovement.delete({ where: { id } }).catch(() => {});
    }
    for (const it of items) {
      await db.stockItem.delete({ where: { id: it.stockId } }).catch(() => {});
    }
    for (const it of items) {
      await db.menuItem.delete({ where: { id: it.id } }).catch(() => {});
    }
    if (testCategoryId) {
      await db.category.delete({ where: { id: testCategoryId } }).catch(() => {});
    }
    await db.$disconnect();
  });

  it("a sequence of movements produces the correct final stock", async () => {
    testCategoryId = (await db.category.create({ data: { name: "MathCat-" + Date.now() } })).id;
    const item = await db.menuItem.create({
      data: {
        categoryId: testCategoryId,
        name: "Math Item",
        price: new Prisma.Decimal("100"),
        trackStock: true,
        stock: { create: { currentQty: new Prisma.Decimal("100"), minQty: new Prisma.Decimal("20"), maxQty: new Prisma.Decimal("200") } },
      },
      include: { stock: true },
    });
    items.push({ id: item.id, name: item.name, stockId: item.stock!.id });

    // sequence: +50 (purchase), -10 (sale), -5 (sale), +20 (opname), -100 (sale)
    const m1 = await recordStockMovement({ stockItemId: item.stock!.id, type: "PURCHASE", qty: new Prisma.Decimal("50") });
    createdMovements.push(m1.id);
    const m2 = await recordStockMovement({ stockItemId: item.stock!.id, type: "SALE", qty: new Prisma.Decimal("-10") });
    createdMovements.push(m2.id);
    const m3 = await recordStockMovement({ stockItemId: item.stock!.id, type: "SALE", qty: new Prisma.Decimal("-5") });
    createdMovements.push(m3.id);
    const m4 = await recordStockMovement({ stockItemId: item.stock!.id, type: "OPNAME", qty: new Prisma.Decimal("20") });
    createdMovements.push(m4.id);
    const m5 = await recordStockMovement({ stockItemId: item.stock!.id, type: "SALE", qty: new Prisma.Decimal("-100") });
    createdMovements.push(m5.id);

    const stock = await db.stockItem.findUnique({ where: { id: item.stock!.id } });
    // 100 + 50 - 10 - 5 + 20 - 100 = 55
    expect(stock?.currentQty.toString()).toBe("55");
  });

  it("isLowStock returns true when currentQty <= minQty", () => {
    expect(isLowStock(new Prisma.Decimal("5"),  new Prisma.Decimal("10"))).toBe(true);
    expect(isLowStock(new Prisma.Decimal("10"), new Prisma.Decimal("10"))).toBe(true); // boundary
    expect(isLowStock(new Prisma.Decimal("11"), new Prisma.Decimal("10"))).toBe(false);
    expect(isLowStock(new Prisma.Decimal("0"),  new Prisma.Decimal("0"))).toBe(true); // boundary 0/0
  });

  it("findLowStockItems picks up items at or below min", async () => {
    // create an extra item that's low
    const lowItem = await db.menuItem.create({
      data: {
        categoryId: testCategoryId,
        name: "Low Item",
        price: new Prisma.Decimal("1"),
        trackStock: true,
        stock: { create: { currentQty: new Prisma.Decimal("2"), minQty: new Prisma.Decimal("10") } },
      },
      include: { stock: true },
    });
    items.push({ id: lowItem.id, name: lowItem.name, stockId: lowItem.stock!.id });

    const lows = await findLowStockItems();
    const hit = lows.find((s) => s.menuItemId === lowItem.id);
    expect(hit).toBeTruthy();
    expect(hit?.currentQty.toString()).toBe("2");
  });

  it("cumulative movement list (audit trail) is complete", async () => {
    const item = items[0];
    const list = await db.stockMovement.findMany({
      where: { stockItemId: item.stockId },
      orderBy: { createdAt: "asc" },
    });
    // 5 movements from the first test in this file
    expect(list.length).toBeGreaterThanOrEqual(5);
    const sum = list.reduce(
      (s, m) => s.plus(m.qty),
      new Prisma.Decimal(0),
    );
    // 100 (initial) + sum of movements
    const stock = await db.stockItem.findUnique({ where: { id: item.stockId } });
    expect(stock?.currentQty.toString()).toBe("55");
    expect(sum.toString()).toBe("-45"); // 50 -10 -5 +20 -100
  });
});
