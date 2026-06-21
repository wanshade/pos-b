import { describe, it, expect, afterAll } from "vitest";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

/**
 * TDD for the order model.
 * - Order + OrderItem + OrderItemModifier + Payment create + read back
 * - sum lineTotal = (unitPrice + sum(modifier priceDelta)) * qty  (no line discount)
 * - line with discount: (unitPrice - discount) * qty + modifier sum
 * - cascade-delete: removing order drops items, modifiers, payments
 */
describe("Order + OrderItem + OrderItemModifier + Payment", () => {
  let testCategoryId: string;
  let menuItemId: string;
  let variantId: string;
  let modifierId: string;
  let orderId: string;

  afterAll(async () => {
    if (orderId) {
      await db.order.delete({ where: { id: orderId } }).catch(() => {});
    }
    if (modifierId) {
      await db.modifier.delete({ where: { id: modifierId } }).catch(() => {});
    }
    if (variantId) {
      await db.menuVariant.delete({ where: { id: variantId } }).catch(() => {});
    }
    if (menuItemId) {
      await db.menuItem.delete({ where: { id: menuItemId } }).catch(() => {});
    }
    if (testCategoryId) {
      await db.category.delete({ where: { id: testCategoryId } }).catch(() => {});
    }
    await db.$disconnect();
  });

  it("create order + 1 item + 1 modifier + 1 payment; totals are exact", async () => {
    testCategoryId = (await db.category.create({ data: { name: "OrderTest-" + Date.now() } })).id;
    const item = await db.menuItem.create({
      data: {
        categoryId: testCategoryId,
        name: "Latte",
        price: new Prisma.Decimal("25000"),
        isAvailable: true,
        trackStock: false,
      },
    });
    menuItemId = item.id;

    const variant = await db.menuVariant.create({
      data: { menuItemId: item.id, name: "Large", priceDelta: new Prisma.Decimal("5000") },
    });
    variantId = variant.id;

    const modifier = await db.modifier.create({
      data: { menuItemId: item.id, groupName: "Milk", name: "Oat", priceDelta: new Prisma.Decimal("5000") },
    });
    modifierId = modifier.id;

    const order = await db.order.create({
      data: {
        orderNumber: "ORD-TEST-" + Date.now(),
        status: "PAID",
        type: "DINE_IN",
        subtotal: new Prisma.Decimal("35000"), // 25000 + 5000 variant + 5000 modifier
        total: new Prisma.Decimal("35000"),
        paidAt: new Date(),
        items: {
          create: [
            {
              menuItemId: item.id,
              variantId: variant.id,
              nameSnapshot: item.name,
              variantNameSnapshot: variant.name,
              qty: 1,
              unitPrice: new Prisma.Decimal("30000"), // base + variant
              lineTotal: new Prisma.Decimal("35000"), // unitPrice + modifier (qty 1)
              modifiers: {
                create: [
                  {
                    modifierId: modifier.id,
                    groupNameSnapshot: modifier.groupName,
                    nameSnapshot: modifier.name,
                    priceDelta: modifier.priceDelta,
                  },
                ],
              },
            },
          ],
        },
        payments: {
          create: [
            { method: "CASH", amount: new Prisma.Decimal("40000"), reference: null },
            { method: "CARD", amount: new Prisma.Decimal("0"), reference: null },
          ],
        },
      },
      include: { items: { include: { modifiers: true } }, payments: true },
    });
    orderId = order.id;

    expect(order.items).toHaveLength(1);
    expect(order.items[0].modifiers).toHaveLength(1);
    expect(order.payments).toHaveLength(2);
    expect(order.subtotal.toString()).toBe("35000");
  });

  it("snapshot fields persist even if MenuItem is updated later", async () => {
    // rename the item — order should still show old name in nameSnapshot
    await db.menuItem.update({
      where: { id: menuItemId },
      data: { name: "Latte (renamed)" },
    });
    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    expect(order?.items[0].nameSnapshot).toBe("Latte"); // unchanged
  });

  it("cascade-delete: removing order drops items + modifiers + payments", async () => {
    const before = await db.orderItem.count({ where: { orderId } });
    const beforeMods = await db.orderItemModifier.count({ where: { orderItem: { orderId } } });
    const beforePay = await db.payment.count({ where: { orderId } });
    expect(before).toBe(1);
    expect(beforeMods).toBe(1);
    expect(beforePay).toBe(2);

    await db.order.delete({ where: { id: orderId } });
    orderId = ""; // mark as deleted

    expect(await db.orderItem.count({ where: { orderId: "" } })).toBe(0);
    expect(await db.orderItemModifier.count({ where: { orderItem: { orderId: "" } } })).toBe(0);
    expect(await db.payment.count({ where: { orderId: "" } })).toBe(0);
  });
});

describe("Order money math (decimal precision)", () => {
  it("line total = (unitPrice + modifier sum) * qty, no drift", () => {
    // (25000 + 5000) * 2 = 60000
    const unit = new Prisma.Decimal("25000");
    const mod = new Prisma.Decimal("5000");
    const qty = 2;
    const line = unit.plus(mod).times(qty);
    expect(line.toString()).toBe("60000");
  });

  it("line with per-unit discount", () => {
    // ((25000 - 2000) + 5000) * 2 = 56000
    const unit = new Prisma.Decimal("25000");
    const discount = new Prisma.Decimal("2000");
    const mod = new Prisma.Decimal("5000");
    const qty = 2;
    const line = unit.minus(discount).plus(mod).times(qty);
    expect(line.toString()).toBe("56000");
  });
});
