import { describe, it, expect, afterAll } from "vitest";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ensureStockItemForMenuItem } from "@/lib/inventory/stock-helpers";

describe("StockItem model + helper", () => {
  let testCategoryId: string;
  let itemWithStock: string;
  let itemWithoutStock: string;
  const created: string[] = [];

  afterAll(async () => {
    // delete items (cascade to StockItem)
    for (const id of [itemWithStock, itemWithoutStock].filter(Boolean) as string[]) {
      await db.menuItem.delete({ where: { id } }).catch(() => {});
    }
    if (testCategoryId) {
      await db.category.delete({ where: { id: testCategoryId } }).catch(() => {});
    }
    for (const id of created) {
      await db.stockItem.delete({ where: { id } }).catch(() => {});
    }
    await db.$disconnect();
  });

  it("creates a StockItem manually", async () => {
    testCategoryId = (await db.category.create({ data: { name: "StockTest-" + Date.now() } })).id;
    const item = await db.menuItem.create({
      data: {
        categoryId: testCategoryId,
        name: "With Stock",
        price: new Prisma.Decimal("1000"),
        trackStock: true,
      },
    });
    itemWithStock = item.id;

    const stock = await db.stockItem.create({
      data: { menuItemId: item.id, currentQty: new Prisma.Decimal("50"), minQty: new Prisma.Decimal("10"), unit: "pcs" },
    });
    created.push(stock.id);

    expect(stock.currentQty.toString()).toBe("50");
    expect(stock.minQty.toString()).toBe("10");
    expect(stock.unit).toBe("pcs");
  });

  it("enforces unique menuItemId", async () => {
    await expect(
      db.stockItem.create({
        data: { menuItemId: itemWithStock, currentQty: new Prisma.Decimal("1") },
      }),
    ).rejects.toThrow();
  });

  it("ensureStockItemForMenuItem is idempotent", async () => {
    const a = await ensureStockItemForMenuItem(itemWithStock);
    const b = await ensureStockItemForMenuItem(itemWithStock);
    expect(a.id).toBe(b.id);
  });

  it("ensureStockItemForMenuItem creates a stock row when one doesn't exist", async () => {
    const item = await db.menuItem.create({
      data: {
        categoryId: testCategoryId,
        name: "Without Stock",
        price: new Prisma.Decimal("2000"),
        trackStock: false,
      },
    });
    itemWithoutStock = item.id;

    const stock = await ensureStockItemForMenuItem(item.id);
    expect(stock.menuItemId).toBe(item.id);
    expect(stock.currentQty.toString()).toBe("0");

    // calling again returns the same id
    const again = await ensureStockItemForMenuItem(item.id);
    expect(again.id).toBe(stock.id);
  });

  it("cascade-deletes stock when menu item is deleted", async () => {
    const item = await db.menuItem.create({
      data: {
        categoryId: testCategoryId,
        name: "Cascade",
        price: new Prisma.Decimal("500"),
        trackStock: true,
        stock: { create: { currentQty: new Prisma.Decimal("5") } },
      },
    });
    await db.menuItem.delete({ where: { id: item.id } });
    const found = await db.stockItem.findUnique({ where: { menuItemId: item.id } });
    expect(found).toBeNull();
  });
});
