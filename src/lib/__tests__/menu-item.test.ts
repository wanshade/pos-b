import { describe, it, expect, afterAll } from "vitest";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

describe("MenuItem model", () => {
  let testCategoryId: string;
  const created: string[] = [];

  afterAll(async () => {
    if (created.length > 0) {
      await db.menuItem.deleteMany({ where: { id: { in: created } } });
    }
    if (testCategoryId) {
      await db.category.delete({ where: { id: testCategoryId } }).catch(() => {});
    }
    await db.$disconnect();
  });

  it("can create a menu item with price as Decimal and read it back", async () => {
    testCategoryId = (
      await db.category.create({ data: { name: "MenuItem-Test-" + Date.now() } })
    ).id;

    const item = await db.menuItem.create({
      data: {
        categoryId: testCategoryId,
        name: "Test Latte",
        sku: "TEST-LATTE-" + Date.now(),
        price: new Prisma.Decimal("25000.00"),
        cost: new Prisma.Decimal("8000.00"),
      },
    });
    created.push(item.id);

    expect(item.id).toBeTruthy();
    expect(item.name).toBe("Test Latte");
    expect(item.price.toString()).toBe("25000");
    expect(item.cost.toString()).toBe("8000");
    expect(item.isAvailable).toBe(true);
    expect(item.trackStock).toBe(false);
  });

  it("decimal arithmetic on MenuItem stays exact (no float drift)", async () => {
    const item = await db.menuItem.create({
      data: {
        categoryId: testCategoryId,
        name: "Decimal Test",
        price: new Prisma.Decimal("0.10"),
        cost: new Prisma.Decimal("0.03"),
      },
    });
    created.push(item.id);

    const margin = item.price.minus(item.cost);
    expect(margin.toString()).toBe("0.07");
  });

  it("enforces unique sku", async () => {
    const sku = "DUP-SKU-" + Date.now();
    const a = await db.menuItem.create({
      data: { categoryId: testCategoryId, name: "A", price: new Prisma.Decimal("1"), sku },
    });
    created.push(a.id);

    await expect(
      db.menuItem.create({
        data: { categoryId: testCategoryId, name: "B", price: new Prisma.Decimal("1"), sku },
      }),
    ).rejects.toThrow();
  });

  it("null sku is allowed (not unique)", async () => {
    const a = await db.menuItem.create({
      data: { categoryId: testCategoryId, name: "NoSku-A", price: new Prisma.Decimal("1"), sku: null },
    });
    const b = await db.menuItem.create({
      data: { categoryId: testCategoryId, name: "NoSku-B", price: new Prisma.Decimal("1"), sku: null },
    });
    created.push(a.id, b.id);
    expect(a.id).not.toBe(b.id);
  });

  it("category relation works (MenuItem → Category)", async () => {
    const item = await db.menuItem.create({
      data: { categoryId: testCategoryId, name: "Rel", price: new Prisma.Decimal("1") },
      include: { category: true },
    });
    created.push(item.id);
    expect(item.category.id).toBe(testCategoryId);
    expect(item.category.name.startsWith("MenuItem-Test-")).toBe(true);
  });

  it("cannot delete a category that has menu items (Restrict)", async () => {
    const cat = await db.category.create({ data: { name: "Restrict-Test-" + Date.now() } });
    const item = await db.menuItem.create({
      data: { categoryId: cat.id, name: "X", price: new Prisma.Decimal("1") },
    });
    created.push(item.id);

    await expect(db.category.delete({ where: { id: cat.id } })).rejects.toThrow();
    // cleanup: delete item, then category
    await db.menuItem.delete({ where: { id: item.id } });
    await db.category.delete({ where: { id: cat.id } });
  });
});
