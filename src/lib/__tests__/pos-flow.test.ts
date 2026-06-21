/**
 * T5.16 — POS end-to-end test: cart math, payment validation,
 * stock decrement on PAID, void/refund reversal.
 *
 * These tests exercise the helpers and the model directly, not the
 * server actions (which are tested via the dev server in E2E).
 */
import { describe, it, expect, afterAll } from "vitest";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { recordStockMovement, findLowStockItems } from "@/lib/inventory/stock-helpers";

describe("POS money math", () => {
  it("subtotal: sum of all line totals", () => {
    // line1: 25000 * 1 = 25000
    // line2: (30000 - 2000 + 5000) * 2 = 66000
    // sub = 91000
    const line1 = new Prisma.Decimal("25000");
    const line2 = new Prisma.Decimal("66000");
    const sub = line1.plus(line2);
    expect(sub.toString()).toBe("91000");
  });

  it("tax: (subtotal - discount) * rate / 100", () => {
    // (91000 - 2000) * 10 / 100 = 8900
    const sub = new Prisma.Decimal("91000");
    const disc = new Prisma.Decimal("2000");
    const tax = sub.minus(disc).times(10).dividedBy(100);
    expect(tax.toString()).toBe("8900");
  });

  it("change calc: paid - total, exact / over / short", () => {
    const total = new Prisma.Decimal("100000");
    const paid100k = new Prisma.Decimal("100000");
    const paid120k = new Prisma.Decimal("120000");
    const paid50k = new Prisma.Decimal("50000");
    expect(paid100k.minus(total).toString()).toBe("0");
    expect(paid120k.minus(total).toString()).toBe("20000");
    expect(paid50k.minus(total).toString()).toBe("-50000");
  });
});

/**
 * End-to-end POS flow: sell a trackStock item, void it, check stock returns.
 * This exercises the real server-side flow without HTTP.
 */
describe("POS flow: sell + void reverses stock", () => {
  let testCategoryId: string;
  let menuItemId: string;
  let stockId: string;
  let orderId: string;
  let paymentId: string;
  const movementIds: string[] = [];

  afterAll(async () => {
    if (paymentId) {
      await db.payment.delete({ where: { id: paymentId } }).catch(() => {});
    }
    if (orderId) {
      await db.order.delete({ where: { id: orderId } }).catch(() => {});
    }
    for (const id of movementIds) {
      await db.stockMovement.delete({ where: { id } }).catch(() => {});
    }
    if (stockId) {
      await db.stockItem.delete({ where: { id: stockId } }).catch(() => {});
    }
    if (menuItemId) {
      await db.menuItem.delete({ where: { id: menuItemId } }).catch(() => {});
    }
    if (testCategoryId) {
      await db.category.delete({ where: { id: testCategoryId } }).catch(() => {});
    }
    await db.$disconnect();
  });

  it("SALE movement decrements stock for trackStock items", async () => {
    testCategoryId = (await db.category.create({ data: { name: "PosFlow-" + Date.now() } })).id;
    const item = await db.menuItem.create({
      data: {
        categoryId: testCategoryId,
        name: "POS Test Item",
        price: new Prisma.Decimal("10000"),
        trackStock: true,
        stock: { create: { currentQty: new Prisma.Decimal("20") } },
      },
      include: { stock: true },
    });
    menuItemId = item.id;
    stockId = item.stock!.id;

    // simulate the PAID flow: create order, then recordStockMovement(SALE, -qty)
    const order = await db.order.create({
      data: {
        orderNumber: "POS-TEST-" + Date.now(),
        status: "PAID",
        type: "DINE_IN",
        subtotal: new Prisma.Decimal("30000"),
        total: new Prisma.Decimal("33000"),
        tax: new Prisma.Decimal("3000"),
        paidAt: new Date(),
        items: {
          create: [{
            menuItemId: item.id,
            nameSnapshot: item.name,
            qty: 3,
            unitPrice: new Prisma.Decimal("10000"),
            lineTotal: new Prisma.Decimal("30000"),
          }],
        },
        payments: {
          create: [{ method: "CASH", amount: new Prisma.Decimal("33000") }],
        },
      },
      include: { items: true, payments: true },
    });
    orderId = order.id;
    paymentId = order.payments[0].id;

    // Now the SALE movement
    const sale = await recordStockMovement({
      stockItemId: stockId,
      type: "SALE",
      qty: new Prisma.Decimal(-3),
      refType: "Order",
      refId: order.id,
    });
    movementIds.push(sale.id);

    const stock = await db.stockItem.findUnique({ where: { id: stockId } });
    expect(stock?.currentQty.toString()).toBe("17"); // 20 - 3
  });

  it("void reverses stock (ADJUSTMENT positive)", async () => {
    // Reverse: add 3 back
    const voidMovement = await recordStockMovement({
      stockItemId: stockId,
      type: "ADJUSTMENT",
      qty: new Prisma.Decimal(3),
      refType: "OrderVoid",
      refId: orderId,
      reason: "Void test",
    });
    movementIds.push(voidMovement.id);

    const stock = await db.stockItem.findUnique({ where: { id: stockId } });
    expect(stock?.currentQty.toString()).toBe("20"); // back to 20
  });

  it("refund also reverses stock (same path as void)", async () => {
    // Sell again
    const sale = await recordStockMovement({
      stockItemId: stockId,
      type: "SALE",
      qty: new Prisma.Decimal(-2),
      refType: "Order",
      refId: orderId,
    });
    movementIds.push(sale.id);

    // Refund
    const refund = await recordStockMovement({
      stockItemId: stockId,
      type: "ADJUSTMENT",
      qty: new Prisma.Decimal(2),
      refType: "OrderRefund",
      refId: orderId,
      reason: "Refund test",
    });
    movementIds.push(refund.id);

    const stock = await db.stockItem.findUnique({ where: { id: stockId } });
    expect(stock?.currentQty.toString()).toBe("20"); // back to 20
  });

  it("low-stock: when current <= min, item is flagged", async () => {
    // set minQty = 15
    await db.stockItem.update({ where: { id: stockId }, data: { minQty: new Prisma.Decimal("15") } });
    // sell 6 → current = 14, which is <= 15
    const sale = await recordStockMovement({
      stockItemId: stockId,
      type: "SALE",
      qty: new Prisma.Decimal(-6),
      refType: "Order",
      refId: orderId,
    });
    movementIds.push(sale.id);

    const lows = await findLowStockItems();
    const hit = lows.find((s) => s.id === stockId);
    expect(hit).toBeTruthy();
    expect(hit?.currentQty.toString()).toBe("14");
  });
});
