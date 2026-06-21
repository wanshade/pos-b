/**
 * Server actions for the POS terminal:
 * - holdOrder: persist current cart as Order(status=HELD), clear cart
 * - resumeOrder: fetch a HELD order, return its data so the client
 *   can rehydrate the Zustand cart
 * - searchCustomers: free-text search for the customer attach field
 * - createCustomer: quick-create with name (and optional phone)
 */

"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAuth, getSession } from "@/lib/session";

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

export type HoldOrderInput = {
  shiftId: string;
  type: "DINE_IN" | "TAKEOUT" | "DELIVERY";
  customerName: string;
  customerId: string | null;
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
};

export async function holdOrder(input: HoldOrderInput) {
  await requireAuth();
  if (input.lines.length === 0) throw new Error("Cannot hold an empty order");

  const order = await db.order.create({
    data: {
      orderNumber: await nextOrderNumber(),
      shiftId: input.shiftId,
      status: "HELD",
      type: input.type,
      subtotal: new Prisma.Decimal(input.subtotal),
      discount: new Prisma.Decimal(input.discountAmount),
      tax: new Prisma.Decimal(input.tax),
      total: new Prisma.Decimal(input.total),
      customerName: input.customerName || null,
      customerId: input.customerId,
      discountCode: input.discountCode || null,
      notes: input.notes || null,
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
    },
  });

  revalidatePath("/pos/holds");
  return { id: order.id, orderNumber: order.orderNumber };
}

/** Delete a HELD order (after resume or explicit cancel). */
export async function discardHeldOrder(orderId: string) {
  await requireAuth();
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) return;
  if (order.status !== "HELD") throw new Error("Only HELD orders can be discarded");
  await db.order.delete({ where: { id: orderId } });
  revalidatePath("/pos/holds");
}

export type ResumedOrderData = {
  id: string;
  orderNumber: string;
  type: "DINE_IN" | "TAKEOUT" | "DELIVERY";
  customerName: string;
  customerId: string | null;
  discount: string;
  discountCode: string;
  notes: string;
  lines: Array<{
    menuItemId: string;
    nameSnapshot: string;
    variant: { id: string; name: string; priceDelta: string } | null;
    modifiers: Array<{ id: string; groupName: string; name: string; priceDelta: string }>;
    qty: number;
    unitPrice: string;
    discount: string;
    notes: string;
  }>;
};

/**
 * Load a HELD order into a shape the client cart can consume.
 * Does NOT mutate the DB — the cart is loaded client-side, then the
 * user either deletes the HELD order (resume + discard) or leaves it.
 */
export async function resumeOrderData(orderId: string): Promise<ResumedOrderData | null> {
  await requireAuth();
  const order = await db.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { modifiers: true } },
    },
  });
  if (!order || order.status !== "HELD") return null;
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    type: order.type,
    customerName: order.customerName ?? "",
    customerId: order.customerId,
    discount: order.discount.toString(),
    discountCode: order.discountCode ?? "",
    notes: order.notes ?? "",
    lines: order.items.map((it) => ({
      menuItemId: it.menuItemId,
      nameSnapshot: it.nameSnapshot,
      variant: it.variantId && it.variantNameSnapshot
        ? {
            id: it.variantId,
            name: it.variantNameSnapshot,
            priceDelta: "0", // already baked into unitPrice
          }
        : null,
      modifiers: it.modifiers.map((m) => ({
        id: m.modifierId,
        groupName: m.groupNameSnapshot,
        name: m.nameSnapshot,
        priceDelta: m.priceDelta.toString(),
      })),
      qty: it.qty,
      unitPrice: it.unitPrice.toString(),
      discount: it.discount.toString(),
      notes: it.notes ?? "",
    })),
  };
}

// --------------------------------------------------------------------
// Customer search / create
// --------------------------------------------------------------------

export type CustomerOption = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
};

export async function searchCustomers(query: string): Promise<CustomerOption[]> {
  await requireAuth();
  const q = query.trim();
  if (q.length < 1) return [];
  return db.customer.findMany({
    where: {
      OR: [
        { name: { contains: q } },
        { phone: { contains: q } },
        { email: { contains: q } },
      ],
    },
    orderBy: { name: "asc" },
    take: 10,
    select: { id: true, name: true, phone: true, email: true },
  });
}

export async function createCustomer(input: { name: string; phone?: string; email?: string }): Promise<CustomerOption> {
  await requireAuth();
  const c = await db.customer.create({
    data: {
      name: input.name.trim(),
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
    },
  });
  return { id: c.id, name: c.name, phone: c.phone, email: c.email };
}
