/**
 * Server action to commit a paid order.
 *
 * Steps in a single transaction:
 *  1. Create Order (status=PAID, paidAt) with lines + modifiers
 *  2. For each line whose menuItem.trackStock=true: create a SALE
 *     StockMovement with qty = -line.qty (decrements stock via the
 *     recordStockMovement helper)
 *  3. Create Payment rows (split support)
 *  4. Revalidate /pos and /inventory
 *
 * Returns the new orderId so the UI can redirect to the receipt.
 */

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAuth, getSession } from "@/lib/session";
import { recordStockMovement } from "@/lib/inventory/stock-helpers";

type PaymentInput = {
  method: "CASH" | "CARD" | "EWALLET" | "QRIS" | "TRANSFER";
  amount: string;
  reference: string;
};

export type PayOrderInput = {
  shiftId: string;
  type: "DINE_IN" | "TAKEOUT" | "DELIVERY";
  customerName: string;
  discount: string;
  discountCode: string;
  notes: string;
  subtotal: string;
  discountAmount: string;
  tax: string;
  total: string;
  lines: Array<{
    menuItemId: string;
    nameSnapshot: string;
    variantId: string | null;
    variantNameSnapshot: string | null;
    qty: number;
    unitPrice: string;
    discount: string;
    lineTotal: string;
    notes: string;
    modifiers: Array<{
      modifierId: string;
      groupNameSnapshot: string;
      nameSnapshot: string;
      priceDelta: string;
    }>;
  }>;
  payments: PaymentInput[];
};

async function nextOrderNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `ORD-${year}-`;
  const last = await db.order.findFirst({
    where: { orderNumber: { startsWith: prefix } },
    orderBy: { orderNumber: "desc" },
  });
  const lastNum = last ? parseInt(last.orderNumber.slice(prefix.length), 10) : 0;
  return prefix + String(lastNum + 1).padStart(4, "0");
}

export async function payOrder(input: PayOrderInput): Promise<{ orderId: string; orderNumber: string }> {
  await requireAuth();
  if (input.lines.length === 0) throw new Error("Cart is empty");
  if (input.payments.length === 0) throw new Error("No payment provided");

  // sum payments
  const paid = input.payments.reduce(
    (s, p) => s.plus(new Prisma.Decimal(p.amount)),
    new Prisma.Decimal(0),
  );
  const total = new Prisma.Decimal(input.total);
  if (paid.lt(total)) {
    throw new Error(`Payment ${paid.toString()} is less than total ${total.toString()}`);
  }

  // validate all menu items exist + load their trackStock + stockId in one query
  const menuIds = input.lines.map((l) => l.menuItemId);
  const items = await db.menuItem.findMany({
    where: { id: { in: menuIds } },
    include: { stock: true },
  });
  const itemMap = new Map(items.map((i) => [i.id, i]));

  const session = await getSession();
  const createdById = (session?.user as { id?: string } | undefined)?.id ?? null;

  const order = await db.$transaction(async (tx) => {
    const o = await tx.order.create({
      data: {
        orderNumber: await nextOrderNumber(),
        shiftId: input.shiftId,
        status: "PAID",
        type: input.type,
        kitchenStatus: "QUEUED",
        kitchenQueuedAt: new Date(),
        subtotal: new Prisma.Decimal(input.subtotal),
        discount: new Prisma.Decimal(input.discountAmount),
        tax: new Prisma.Decimal(input.tax),
        total: new Prisma.Decimal(input.total),
        customerName: input.customerName || null,
        discountCode: input.discountCode || null,
        notes: input.notes || null,
        paidAt: new Date(),
        items: {
          create: input.lines.map((l) => ({
            menuItemId: l.menuItemId,
            variantId: l.variantId,
            nameSnapshot: l.nameSnapshot,
            variantNameSnapshot: l.variantNameSnapshot,
            qty: l.qty,
            unitPrice: new Prisma.Decimal(l.unitPrice),
            discount: new Prisma.Decimal(l.discount),
            lineTotal: new Prisma.Decimal(l.lineTotal),
            notes: l.notes || null,
            modifiers: {
              create: l.modifiers.map((m) => ({
                modifierId: m.modifierId,
                groupNameSnapshot: m.groupNameSnapshot,
                nameSnapshot: m.nameSnapshot,
                priceDelta: new Prisma.Decimal(m.priceDelta),
              })),
            },
          })),
        },
        payments: {
          create: input.payments.map((p) => ({
            method: p.method,
            amount: new Prisma.Decimal(p.amount),
            reference: p.reference || null,
          })),
        },
      },
    });
    return o;
  });

  // Decrement stock for trackStock items OUTSIDE the transaction so a
  // recordStockMovement failure doesn't roll back the order (we'd rather
  // have a paid order with a stale stock count than lose the sale).
  // This is a pragmatic call — T5.16 will exercise this path.
  for (const l of input.lines) {
    const item = itemMap.get(l.menuItemId);
    if (item?.trackStock && item.stock) {
      try {
        await recordStockMovement({
          stockItemId: item.stock.id,
          type: "SALE",
          qty: new Prisma.Decimal(-l.qty),
          refType: "Order",
          refId: order.id,
          reason: `Sale ${order.orderNumber}`,
          createdById,
        });
      } catch (e) {
        console.error("stock decrement failed for", item.name, e);
      }
    }
  }

  revalidatePath("/pos");
  revalidatePath("/kitchen");
  revalidatePath("/inventory");
  revalidatePath("/inventory/movements");
  revalidatePath("/dashboard");
  return { orderId: order.id, orderNumber: order.orderNumber };
}
