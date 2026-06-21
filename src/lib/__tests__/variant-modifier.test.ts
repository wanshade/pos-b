import { describe, it, expect, afterAll } from "vitest";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

describe("MenuVariant + Modifier models", () => {
  let testItemId: string;
  let testCategoryId: string;
  const variantIds: string[] = [];
  const modifierIds: string[] = [];

  afterAll(async () => {
    if (variantIds.length > 0) {
      await db.menuVariant.deleteMany({ where: { id: { in: variantIds } } });
    }
    if (modifierIds.length > 0) {
      await db.modifier.deleteMany({ where: { id: { in: modifierIds } } });
    }
    if (testItemId) {
      await db.menuItem.delete({ where: { id: testItemId } }).catch(() => {});
    }
    if (testCategoryId) {
      await db.category.delete({ where: { id: testCategoryId } }).catch(() => {});
    }
    await db.$disconnect();
  });

  it("creates an item and reads variants/modifiers", async () => {
    testCategoryId = (await db.category.create({ data: { name: "VarMod-Test-" + Date.now() } })).id;
    testItemId = (
      await db.menuItem.create({
        data: {
          categoryId: testCategoryId,
          name: "Test",
          price: new Prisma.Decimal("20000"),
        },
      })
    ).id;

    const v = await db.menuVariant.create({
      data: { menuItemId: testItemId, name: "Small", priceDelta: new Prisma.Decimal("-3000") },
    });
    variantIds.push(v.id);

    const m = await db.modifier.create({
      data: { menuItemId: testItemId, groupName: "Milk", name: "Oat", priceDelta: new Prisma.Decimal("5000") },
    });
    modifierIds.push(m.id);

    const fetched = await db.menuItem.findUnique({
      where: { id: testItemId },
      include: { variants: true, modifiers: true },
    });
    expect(fetched?.variants).toHaveLength(1);
    expect(fetched?.modifiers).toHaveLength(1);
    expect(fetched?.variants[0].priceDelta.toString()).toBe("-3000");
    expect(fetched?.modifiers[0].priceDelta.toString()).toBe("5000");
  });

  it("cascade-deletes variants + modifiers when item is deleted", async () => {
    // create a fresh item
    const item = await db.menuItem.create({
      data: {
        categoryId: testCategoryId,
        name: "Cascade Test",
        price: new Prisma.Decimal("1000"),
        variants: { create: { name: "M", priceDelta: new Prisma.Decimal("0") } },
        modifiers: { create: { groupName: "G", name: "X", priceDelta: new Prisma.Decimal("0") } },
      },
      include: { variants: true, modifiers: true },
    });

    await db.menuItem.delete({ where: { id: item.id } });

    const vCount = await db.menuVariant.count({ where: { menuItemId: item.id } });
    const mCount = await db.modifier.count({ where: { menuItemId: item.id } });
    expect(vCount).toBe(0);
    expect(mCount).toBe(0);
  });

  it("list modifiers grouped by groupName", async () => {
    const mod = await db.modifier.create({
      data: { menuItemId: testItemId, groupName: "Sweetness", name: "Less", priceDelta: new Prisma.Decimal("0") },
    });
    modifierIds.push(mod.id);

    const mods = await db.modifier.findMany({
      where: { menuItemId: testItemId },
      orderBy: [{ groupName: "asc" }, { sortOrder: "asc" }],
    });
    const groups = new Set(mods.map((m) => m.groupName));
    expect(groups.has("Milk")).toBe(true);
    expect(groups.has("Sweetness")).toBe(true);
  });
});

/**
 * Money math: this is the test that catches float-drift bugs.
 * The POS adds base price + variant priceDelta + sum(modifier priceDeltas).
 * Each step must use Prisma.Decimal, never Number, to stay exact.
 */
describe("money math (no float drift)", () => {
  it("base + variant + 2 modifiers stays exact", () => {
    const base = new Prisma.Decimal("25000.00");
    const variant = new Prisma.Decimal("-3000.00");
    const modA = new Prisma.Decimal("5000.00");
    const modB = new Prisma.Decimal("2000.00");

    const total = base.plus(variant).plus(modA).plus(modB);
    expect(total.toString()).toBe("29000");
  });

  it("sub-penny values stay exact", () => {
    // 0.10 + 0.20 = 0.30 — classic float trap.
    // Prisma.Decimal normalizes trailing zeros, so the result is "0.3"
    // (still exactly 0.30 in value, just no trailing zero). Use .toFixed(2)
    // for display when trailing zeros matter.
    const a = new Prisma.Decimal("0.10");
    const b = new Prisma.Decimal("0.20");
    expect(a.plus(b).toString()).toBe("0.3");
    expect(a.plus(b).toFixed(2)).toBe("0.30");
    // Same operation in JavaScript: 0.1 + 0.2 === 0.30000000000000004
    expect(0.1 + 0.2).not.toBe(0.3);
  });

  it("multi-line cart subtotal stays exact", () => {
    // 3x at 12500.50 = 37501.50
    const line = new Prisma.Decimal("12500.50");
    const total = line.times(3);
    expect(total.toString()).toBe("37501.5");
  });
});
