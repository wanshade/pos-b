import { describe, it, expect, afterAll } from "vitest";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { recordStockMovement, findLowStockItems } from "@/lib/inventory/stock-helpers";

describe("StockMovement model + recordStockMovement", () => {
  let testCategoryId: string;
  let menuItemId: string;
  let stockItemId: string;
  const createdMenuIds: string[] = [];
  const createdMovementIds: string[] = [];

  afterAll(async () => {
    for (const id of createdMovementIds) {
      await db.stockMovement.delete({ where: { id } }).catch(() => {});
    }
    if (stockItemId) {
      await db.stockItem.delete({ where: { id: stockItemId } }).catch(() => {});
    }
    for (const id of createdMenuIds) {
      await db.menuItem.delete({ where: { id } }).catch(() => {});
    }
    if (testCategoryId) {
      await db.category.delete({ where: { id: testCategoryId } }).catch(() => {});
    }
    await db.$disconnect();
  });

  it("records an inbound movement and increases currentQty", async () => {
    testCategoryId = (await db.category.create({ data: { name: "MovTest-" + Date.now() } })).id;
    const item = await db.menuItem.create({
      data: {
        categoryId: testCategoryId,
        name: "MovTest",
        price: new Prisma.Decimal("1000"),
        trackStock: true,
        stock: { create: { currentQty: new Prisma.Decimal("10"), minQty: new Prisma.Decimal("5") } },
      },
      include: { stock: true },
    });
    menuItemId = item.id;
    createdMenuIds.push(item.id);
    stockItemId = item.stock!.id;

    const m = await recordStockMovement({
      stockItemId,
      type: "PURCHASE",
      qty: new Prisma.Decimal("50"),
      reason: "Restock from PO #42",
    });
    createdMovementIds.push(m.id);

    expect(m.type).toBe("PURCHASE");
    expect(m.qty.toString()).toBe("50");
    const stock = await db.stockItem.findUnique({ where: { id: stockItemId } });
    expect(stock?.currentQty.toString()).toBe("60");
  });

  it("records an outbound movement and decreases currentQty", async () => {
    const m = await recordStockMovement({
      stockItemId,
      type: "SALE",
      qty: new Prisma.Decimal("-3"),
      refType: "Order",
      refId: "order-1",
    });
    createdMovementIds.push(m.id);
    const stock = await db.stockItem.findUnique({ where: { id: stockItemId } });
    expect(stock?.currentQty.toString()).toBe("57");
  });

  it("throws on outbound that would go negative", async () => {
    await expect(
      recordStockMovement({
        stockItemId,
        type: "SALE",
        qty: new Prisma.Decimal("-9999"),
      }),
    ).rejects.toThrow(/Insufficient stock/);
    // currentQty unchanged
    const stock = await db.stockItem.findUnique({ where: { id: stockItemId } });
    expect(stock?.currentQty.toString()).toBe("57");
  });

  it("opname adjustment with negative qty brings stock down", async () => {
    const m = await recordStockMovement({
      stockItemId,
      type: "OPNAME",
      qty: new Prisma.Decimal("-2"),
      reason: "Physical count was 55",
    });
    createdMovementIds.push(m.id);
    const stock = await db.stockItem.findUnique({ where: { id: stockItemId } });
    expect(stock?.currentQty.toString()).toBe("55");
  });

  it("list movements by stockItemId ordered by createdAt", async () => {
    const list = await db.stockMovement.findMany({
      where: { stockItemId },
      orderBy: { createdAt: "asc" },
    });
    expect(list.length).toBeGreaterThanOrEqual(3);
    expect(list[0].type).toBe("PURCHASE");
  });
});

describe("findLowStockItems", () => {
  it("returns items where currentQty <= minQty", async () => {
    // ensure a fresh low-stock row
    const cat = await db.category.create({ data: { name: "LowTest-" + Date.now() } });
    const item = await db.menuItem.create({
      data: {
        categoryId: cat.id,
        name: "Low Test",
        price: new Prisma.Decimal("1"),
        trackStock: true,
        stock: { create: { currentQty: new Prisma.Decimal("1"), minQty: new Prisma.Decimal("10") } },
      },
    });
    const lows = await findLowStockItems();
    const found = lows.find((s) => s.menuItemId === item.id);
    expect(found).toBeTruthy();

    await db.menuItem.delete({ where: { id: item.id } }); // cascade
    await db.category.delete({ where: { id: cat.id } });
  });
});
