/**
 * Report aggregation helpers.
 *
 * All queries use paidAt within the date range (status=PAID only).
 * Times are in UTC; we use simple date-string bucketing.
 */

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export type DateRange = { from: Date; to: Date };

/** Return the date range covering the given ISO-date strings. `to` is end-of-day. */
export function rangeFromParams(fromStr?: string, toStr?: string): DateRange {
  const to = new Date();
  to.setHours(23, 59, 59, 999);
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  if (fromStr) {
    const d = new Date(fromStr);
    if (!isNaN(d.getTime())) {
      d.setHours(0, 0, 0, 0);
      from.setTime(d.getTime());
    }
  }
  if (toStr) {
    const d = new Date(toStr);
    if (!isNaN(d.getTime())) {
      d.setHours(23, 59, 59, 999);
      to.setTime(d.getTime());
    }
  }
  return { from, to };
}

/** Convert a Date to YYYY-MM-DD in local time. */
export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// --------------------------------------------------------------------
// T6.1 — Sales by day
// --------------------------------------------------------------------

export type DailySalesRow = {
  date: string; // YYYY-MM-DD
  orderCount: number;
  total: Prisma.Decimal;
};

/**
 * Group paid orders by paidAt date, summing total.
 * Note: SQLite has limited date functions; we use raw SQL via $queryRaw.
 */
export async function salesByDay(range: DateRange): Promise<DailySalesRow[]> {
  const rows = await db.$queryRaw<{ date: string; total: number; cnt: number }[]>`
    SELECT
      date(paidAt / 1000, 'unixepoch', 'localtime') AS date,
      SUM(total)                                       AS total,
      COUNT(*)                                         AS cnt
    FROM "Order"
    WHERE status = 'PAID'
      AND paidAt IS NOT NULL
      AND paidAt >= ${range.from}
      AND paidAt <= ${range.to}
    GROUP BY date(paidAt / 1000, 'unixepoch', 'localtime')
    ORDER BY date ASC
  `;
  return rows.map((r) => ({
    date: r.date,
    orderCount: Number(r.cnt),
    total: new Prisma.Decimal(r.total.toString()),
  }));
}

// --------------------------------------------------------------------
// T6.2 — Top-selling items
// --------------------------------------------------------------------

export type TopItemRow = {
  menuItemId: string;
  name: string;
  qty: number;
  revenue: Prisma.Decimal;
};

export async function topItems(range: DateRange, limit = 10): Promise<TopItemRow[]> {
  const items = await db.orderItem.findMany({
    where: {
      order: { status: "PAID", paidAt: { gte: range.from, lte: range.to } },
    },
    include: { menuItem: { select: { name: true } } },
  });
  const byId = new Map<string, { name: string; qty: number; revenue: Prisma.Decimal }>();
  for (const it of items) {
    const cur = byId.get(it.menuItemId) ?? { name: it.menuItem.name, qty: 0, revenue: new Prisma.Decimal(0) };
    cur.qty += it.qty;
    cur.revenue = cur.revenue.plus(it.lineTotal);
    byId.set(it.menuItemId, cur);
  }
  return Array.from(byId.entries())
    .map(([menuItemId, v]) => ({ menuItemId, ...v }))
    .sort((a, b) => b.revenue.minus(a.revenue).toNumber())
    .slice(0, limit);
}

// --------------------------------------------------------------------
// T6.3 — Sales by cashier (via shift.user)
// --------------------------------------------------------------------

export type CashierSalesRow = {
  userId: string;
  name: string;
  orderCount: number;
  total: Prisma.Decimal;
};

export async function salesByCashier(range: DateRange): Promise<CashierSalesRow[]> {
  const orders = await db.order.findMany({
    where: {
      status: "PAID",
      paidAt: { gte: range.from, lte: range.to },
      shift: { isNot: null },
    },
    include: { shift: { include: { user: { select: { id: true, name: true } } } } },
  });
  const byId = new Map<string, { name: string; orderCount: number; total: Prisma.Decimal }>();
  for (const o of orders) {
    if (!o.shift) continue;
    const id = o.shift.user.id;
    const cur = byId.get(id) ?? { name: o.shift.user.name, orderCount: 0, total: new Prisma.Decimal(0) };
    cur.orderCount++;
    cur.total = cur.total.plus(o.total);
    byId.set(id, cur);
  }
  return Array.from(byId.entries())
    .map(([userId, v]) => ({ userId, ...v }))
    .sort((a, b) => b.total.minus(a.total).toNumber());
}

// --------------------------------------------------------------------
// T6.4 — Stock movement summary (in/out per item)
// --------------------------------------------------------------------

export type StockSummaryRow = {
  stockItemId: string;
  name: string;
  unit: string;
  currentQty: Prisma.Decimal;
  totalIn: Prisma.Decimal;
  totalOut: Prisma.Decimal;
};

export async function stockSummary(range: DateRange): Promise<StockSummaryRow[]> {
  const stocks = await db.stockItem.findMany({
    include: { menuItem: { select: { name: true } } },
  });
  const movements = await db.stockMovement.findMany({
    where: { createdAt: { gte: range.from, lte: range.to } },
  });
  const byStock = new Map<string, { totalIn: Prisma.Decimal; totalOut: Prisma.Decimal }>();
  for (const m of movements) {
    const cur = byStock.get(m.stockItemId) ?? { totalIn: new Prisma.Decimal(0), totalOut: new Prisma.Decimal(0) };
    if (m.qty.gte(0)) cur.totalIn = cur.totalIn.plus(m.qty);
    else cur.totalOut = cur.totalOut.plus(m.qty.abs());
    byStock.set(m.stockItemId, cur);
  }
  return stocks.map((s) => {
    const sum = byStock.get(s.id) ?? { totalIn: new Prisma.Decimal(0), totalOut: new Prisma.Decimal(0) };
    return {
      stockItemId: s.id,
      name: s.menuItem.name,
      unit: s.unit,
      currentQty: s.currentQty,
      totalIn: sum.totalIn,
      totalOut: sum.totalOut,
    };
  }).sort((a, b) => b.totalIn.plus(b.totalOut).minus(a.totalIn.plus(a.totalOut)).toNumber());
}

// --------------------------------------------------------------------
// T6.5 — Profit / loss (admin)
// --------------------------------------------------------------------

export type ProfitLossRow = {
  period: string; // YYYY-MM-DD or "week of …" or "YYYY-MM"
  revenue: Prisma.Decimal;
  cost: Prisma.Decimal;
  profit: Prisma.Decimal;
};

export async function profitLoss(range: DateRange, bucket: "day" | "week" | "month" = "day"): Promise<ProfitLossRow[]> {
  // For each paid order in range, sum revenue and cost basis
  // (cost basis = sum(item.qty * menuItem.cost) per order).
  const orders = await db.order.findMany({
    where: {
      status: "PAID",
      paidAt: { gte: range.from, lte: range.to },
    },
    include: {
      items: {
        include: { menuItem: { select: { cost: true } } },
      },
    },
  });

  const byBucket = new Map<string, { revenue: Prisma.Decimal; cost: Prisma.Decimal }>();
  for (const o of orders) {
    if (!o.paidAt) continue;
    const key = bucketKey(o.paidAt, bucket);
    const cur = byBucket.get(key) ?? { revenue: new Prisma.Decimal(0), cost: new Prisma.Decimal(0) };
    cur.revenue = cur.revenue.plus(o.total);
    for (const it of o.items) {
      const lineCost = it.menuItem.cost.times(it.qty);
      cur.cost = cur.cost.plus(lineCost);
    }
    byBucket.set(key, cur);
  }
  return Array.from(byBucket.entries())
    .map(([period, v]) => ({ period, revenue: v.revenue, cost: v.cost, profit: v.revenue.minus(v.cost) }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

function bucketKey(d: Date, bucket: "day" | "week" | "month"): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  if (bucket === "day") return `${y}-${m}-${day}`;
  if (bucket === "month") return `${y}-${m}`;
  const weekday = d.getDay();
  const diff = (weekday + 6) % 7;
  const monday = new Date(d);
  monday.setDate(d.getDate() - diff);
  const my = monday.getFullYear();
  const mm = String(monday.getMonth() + 1).padStart(2, "0");
  const md = String(monday.getDate()).padStart(2, "0");
  return `week of ${my}-${mm}-${md}`;
}

// --------------------------------------------------------------------
// T6.6 — Finance / accounting summary
// --------------------------------------------------------------------

export type FinanceSummary = {
  totalRevenue: Prisma.Decimal;
  totalTax: Prisma.Decimal;
  totalDiscount: Prisma.Decimal;
  totalCost: Prisma.Decimal;
  grossProfit: Prisma.Decimal;
  netProfit: Prisma.Decimal;
  paidOrders: number;
  voidedOrders: number;
  refundedOrders: number;
  refundedAmount: Prisma.Decimal;
  avgOrderValue: Prisma.Decimal;
  byPaymentMethod: {
    method: string;
    count: number;
    amount: Prisma.Decimal;
  }[];
  daily: {
    date: string;
    revenue: Prisma.Decimal;
    tax: Prisma.Decimal;
    discount: Prisma.Decimal;
    cost: Prisma.Decimal;
    profit: Prisma.Decimal;
    orders: number;
  }[];
};

export async function financeSummary(range: DateRange): Promise<FinanceSummary> {
  const [paidOrders, voidedOrders, refundedOrders, payments] = await Promise.all([
    db.order.findMany({
      where: { status: "PAID", paidAt: { gte: range.from, lte: range.to } },
      include: {
        items: { include: { menuItem: { select: { cost: true } } } },
        payments: true,
      },
    }),
    db.order.count({
      where: { status: "VOIDED", voidedAt: { gte: range.from, lte: range.to } },
    }),
    db.order.findMany({
      where: { status: "REFUNDED", refundedAt: { gte: range.from, lte: range.to } },
      select: { total: true },
    }),
    db.payment.findMany({
      where: {
        order: { status: "PAID" },
        paidAt: { gte: range.from, lte: range.to },
      },
      select: { method: true, amount: true },
    }),
  ]);

  let totalRevenue = new Prisma.Decimal(0);
  let totalTax = new Prisma.Decimal(0);
  let totalDiscount = new Prisma.Decimal(0);
  let totalCost = new Prisma.Decimal(0);

  const dailyMap = new Map<string, {
    revenue: Prisma.Decimal;
    tax: Prisma.Decimal;
    discount: Prisma.Decimal;
    cost: Prisma.Decimal;
    orders: number;
  }>();

  for (const o of paidOrders) {
    totalRevenue = totalRevenue.plus(o.total);
    totalTax = totalTax.plus(o.tax);
    totalDiscount = totalDiscount.plus(o.discount);

    let orderCost = new Prisma.Decimal(0);
    for (const it of o.items) {
      orderCost = orderCost.plus(it.menuItem.cost.times(it.qty));
    }
    totalCost = totalCost.plus(orderCost);

    if (o.paidAt) {
      const y = o.paidAt.getFullYear();
      const m = String(o.paidAt.getMonth() + 1).padStart(2, "0");
      const d = String(o.paidAt.getDate()).padStart(2, "0");
      const key = `${y}-${m}-${d}`;
      const cur = dailyMap.get(key) ?? {
        revenue: new Prisma.Decimal(0),
        tax: new Prisma.Decimal(0),
        discount: new Prisma.Decimal(0),
        cost: new Prisma.Decimal(0),
        orders: 0,
      };
      cur.revenue = cur.revenue.plus(o.total);
      cur.tax = cur.tax.plus(o.tax);
      cur.discount = cur.discount.plus(o.discount);
      cur.cost = cur.cost.plus(orderCost);
      cur.orders += 1;
      dailyMap.set(key, cur);
    }
  }

  const refundedAmount = refundedOrders.reduce(
    (s, o) => s.plus(o.total),
    new Prisma.Decimal(0),
  );

  const payByMethod = new Map<string, { count: number; amount: Prisma.Decimal }>();
  for (const p of payments) {
    const cur = payByMethod.get(p.method) ?? { count: 0, amount: new Prisma.Decimal(0) };
    cur.count += 1;
    cur.amount = cur.amount.plus(p.amount);
    payByMethod.set(p.method, cur);
  }

  const byPaymentMethod = Array.from(payByMethod.entries())
    .map(([method, v]) => ({ method, count: v.count, amount: v.amount }))
    .sort((a, b) => b.amount.minus(a.amount).toNumber());

  const daily = Array.from(dailyMap.entries())
    .map(([date, v]) => ({
      date,
      revenue: v.revenue,
      tax: v.tax,
      discount: v.discount,
      cost: v.cost,
      profit: v.revenue.minus(v.cost),
      orders: v.orders,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const grossProfit = totalRevenue.minus(totalCost);
  const netProfit = grossProfit;
  const avgOrderValue = paidOrders.length > 0
    ? totalRevenue.dividedBy(paidOrders.length)
    : new Prisma.Decimal(0);

  return {
    totalRevenue,
    totalTax,
    totalDiscount,
    totalCost,
    grossProfit,
    netProfit,
    paidOrders: paidOrders.length,
    voidedOrders,
    refundedOrders: refundedOrders.length,
    refundedAmount,
    avgOrderValue,
    byPaymentMethod,
    daily,
  };
}
