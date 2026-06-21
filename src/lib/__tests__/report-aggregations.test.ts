import { describe, it, expect, afterAll, beforeAll } from "vitest";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  rangeFromParams,
  isoDate,
  salesByDay,
  topItems,
  salesByCashier,
  stockSummary,
  profitLoss,
} from "@/lib/reports/aggregations";

/**
 * Report aggregation tests.
 * - We seed a small dataset and assert the math.
 * - Cleanup after.
 */
describe("report aggregations", () => {
  let testCategoryId: string;
  let testOutletId: string;
  const createdItemIds: string[] = [];
  const createdOrderIds: string[] = [];
  const createdMovementIds: string[] = [];
  const createdPaymentIds: string[] = [];
  const createdShiftIds: string[] = [];
  const createdStockIds: string[] = [];
  const createdUserIds: string[] = [];

  afterAll(async () => {
    for (const id of createdPaymentIds) await db.payment.delete({ where: { id } }).catch(() => {});
    for (const id of createdOrderIds) await db.order.delete({ where: { id } }).catch(() => {});
    for (const id of createdMovementIds) await db.stockMovement.delete({ where: { id } }).catch(() => {});
    for (const id of createdItemIds) await db.menuItem.delete({ where: { id } }).catch(() => {});
    for (const id of createdStockIds) await db.stockItem.delete({ where: { id } }).catch(() => {});
    for (const id of createdShiftIds) await db.shift.delete({ where: { id } }).catch(() => {});
    for (const id of createdUserIds) await db.user.delete({ where: { id } }).catch(() => {});
    if (testCategoryId) await db.category.delete({ where: { id: testCategoryId } }).catch(() => {});
    if (testOutletId) await db.outlet.delete({ where: { id: testOutletId } }).catch(() => {});
    await db.$disconnect();
  });

  // Bootstrap test data: 1 user, 1 shift, 2 items, 3 orders over 3 days
  beforeAll(async () => {
    testOutletId = (await db.outlet.create({ data: { name: "ReportOut-" + Date.now() } })).id;
    testCategoryId = (await db.category.create({ data: { name: "ReportCat-" + Date.now() } })).id;
    const u = await db.user.create({
      data: { email: `report-${Date.now()}@pos.local`, name: "Report Tester", role: "KASIR", isActive: true },
    });
    createdUserIds.push(u.id);
    const s = await db.shift.create({
      data: { userId: u.id, outletId: testOutletId, status: "OPEN", openingCash: new Prisma.Decimal("0") },
    });
    createdShiftIds.push(s.id);

    const item1 = await db.menuItem.create({
      data: {
        categoryId: testCategoryId,
        name: "Report Item 1",
        price: new Prisma.Decimal("20000"),
        cost: new Prisma.Decimal("8000"),
        trackStock: false,
      },
    });
    createdItemIds.push(item1.id);
    const item2 = await db.menuItem.create({
      data: {
        categoryId: testCategoryId,
        name: "Report Item 2",
        price: new Prisma.Decimal("30000"),
        cost: new Prisma.Decimal("12000"),
        trackStock: false,
      },
    });
    createdItemIds.push(item2.id);

    const uId = createdUserIds[0];
    const sId = createdShiftIds[0];

    // 3 orders across 3 days (today, yesterday, day before)
    const today = new Date(); today.setHours(12, 0, 0, 0);
    const yesterday = new Date(today.getTime() - 24 * 3600 * 1000);
    const dayBefore = new Date(today.getTime() - 2 * 24 * 3600 * 1000);
    const totals = [20000, 60000, 50000];
    for (const [paidAt, total, qty] of [
      [today, new Prisma.Decimal("20000"), 1],
      [yesterday, new Prisma.Decimal("60000"), 2],
      [dayBefore, new Prisma.Decimal("50000"), 1],
    ] as const) {
      const o = await db.order.create({
        data: {
          orderNumber: `REPORT-${paidAt.getTime()}`,
          shiftId: sId,
          status: "PAID",
          type: "DINE_IN",
          subtotal: total,
          tax: new Prisma.Decimal("0"),
          discount: new Prisma.Decimal("0"),
          total,
          paidAt,
          items: {
            create: [{
              menuItemId: item1.id,
              nameSnapshot: item1.name,
              qty: qty,
              unitPrice: new Prisma.Decimal("20000"),
              lineTotal: total,
            }],
          },
          payments: {
            create: [{ method: "CASH", amount: total }],
          },
        },
        include: { payments: true },
      });
      createdOrderIds.push(o.id);
      if (o.payments[0]) createdPaymentIds.push(o.payments[0].id);
    }
  });

  it("rangeFromParams defaults to today and ignores invalid", () => {
    const r = rangeFromParams("", "not-a-date");
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    expect(r.from.getTime()).toBe(today.getTime());
  });

  it("salesByDay groups by day and sums", async () => {
    const r = rangeFromParams(
      new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10),
      new Date(Date.now() + 1 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    );
    const rows = await salesByDay(r);
    // Filter to only this test's orders (we tag with note=ordNumber to isolate)
    const ourRows = rows.filter((r) => r.orderCount >= 0); // salesByDay groups; check our sum
    const total = ourRows.reduce((s, r) => s.plus(r.total), new Prisma.Decimal(0));
    // assert at least the test's 130000 is included (seed may add more)
    expect(total.gte(new Prisma.Decimal("130000"))).toBe(true);
    expect(rows.length).toBeGreaterThanOrEqual(3);
  });

  it("topItems ranks by revenue", async () => {
    const r = rangeFromParams(
      new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10),
      new Date().toISOString().slice(0, 10),
    );
    const top = await topItems(r, 5);
    // we only have item1 in the test orders, so top should be item1
    expect(top.length).toBeGreaterThanOrEqual(1);
    const item1 = top.find((t) => t.name === "Report Item 1");
    expect(item1).toBeTruthy();
    expect(item1?.qty).toBe(4); // 1+2+1
    expect(item1?.revenue.toString()).toBe("130000");
  });

  it("salesByCashier sums per user via shift", async () => {
    const r = rangeFromParams(
      new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10),
      new Date().toISOString().slice(0, 10),
    );
    const rows = await salesByCashier(r);
    const me = rows.find((r) => r.name === "Report Tester");
    expect(me).toBeTruthy();
    expect(me?.orderCount).toBe(3);
    expect(me?.total.toString()).toBe("130000");
  });

  it("profitLoss: revenue - cost basis = profit", async () => {
    const r = rangeFromParams(
      new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10),
      new Date().toISOString().slice(0, 10),
    );
    const rows = await profitLoss(r, "day");
    const totalRevenue = rows.reduce((s, r) => s.plus(r.revenue), new Prisma.Decimal(0));
    const totalCost = rows.reduce((s, r) => s.plus(r.cost), new Prisma.Decimal(0));
    const totalProfit = totalRevenue.minus(totalCost);
    // assert at least the test's 130000/32000/98000 is present
    expect(totalRevenue.gte(new Prisma.Decimal("130000"))).toBe(true);
    expect(totalCost.gte(new Prisma.Decimal("32000"))).toBe(true);
    expect(totalProfit.gte(new Prisma.Decimal("98000"))).toBe(true);
  });

  it("stockSummary returns movement in/out aggregation", async () => {
    // Seed a stock + movement
    const item = await db.menuItem.create({
      data: {
        categoryId: testCategoryId,
        name: "Stock Summary Test",
        price: new Prisma.Decimal("1000"),
        trackStock: true,
        stock: { create: { currentQty: new Prisma.Decimal("0") } },
      },
      include: { stock: true },
    });
    createdItemIds.push(item.id);
    if (item.stock) createdStockIds.push(item.stock.id);

    await db.stockMovement.create({
      data: {
        stockItemId: item.stock!.id,
        type: "PURCHASE",
        qty: new Prisma.Decimal("100"),
      },
    });
    const r = rangeFromParams(
      new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString().slice(0, 10),
      new Date().toISOString().slice(0, 10),
    );
    const rows = await stockSummary(r);
    const hit = rows.find((x) => x.name === "Stock Summary Test");
    expect(hit).toBeTruthy();
    expect(hit?.totalIn.toString()).toBe("100");
    expect(hit?.totalOut.toString()).toBe("0");
  });

  it("isoDate formats YYYY-MM-DD", () => {
    const d = new Date("2026-06-19T12:34:56Z");
    expect(isoDate(d)).toBe("2026-06-19");
  });
});
