/**
 * Server actions for the Kitchen Display (/kitchen).
 * Kitchen staff advance an order through its prep lifecycle.
 */

"use server";

import { revalidatePath } from "next/cache";
import type { KitchenStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { recordAudit } from "@/lib/audit/log";
import {
  canTransition,
  nextKitchenStatus,
  prevKitchenStatus,
  timestampFieldFor,
} from "@/lib/kitchen/status";

const KITCHEN_ROLES = ["KITCHEN", "MANAGER", "ADMIN"] as const;

export type KitchenActionState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

async function setKitchenStatus(orderId: string, to: KitchenStatus) {
  const session = await requireRole([...KITCHEN_ROLES]);
  const actorId = (session.user as { id?: string } | undefined)?.id ?? null;

  const order = await db.order.findUnique({
    where: { id: orderId },
    select: { id: true, orderNumber: true, status: true, kitchenStatus: true },
  });
  if (!order) return { ok: false as const, message: "Order not found" };
  if (order.status !== "PAID") {
    return { ok: false as const, message: "Only paid orders can be prepared" };
  }
  if (!canTransition(order.kitchenStatus, to)) {
    return { ok: false as const, message: `Cannot move from ${order.kitchenStatus} to ${to}` };
  }

  const data: Prisma.OrderUpdateInput = { kitchenStatus: to };
  const tsField = timestampFieldFor(to);
  if (tsField) data[tsField] = new Date();

  await db.order.update({ where: { id: orderId }, data });

  await recordAudit({
    action: "kitchen.status",
    entity: "Order",
    entityId: orderId,
    data: { orderNumber: order.orderNumber, from: order.kitchenStatus, to },
    userId: actorId,
  });

  revalidatePath("/kitchen");
  revalidatePath("/pos/orders");
  return { ok: true as const, message: `${order.orderNumber} → ${to}` };
}

/** Advance an order one step forward in the prep flow. */
export async function advanceKitchenOrder(orderId: string): Promise<KitchenActionState> {
  await requireRole([...KITCHEN_ROLES]);
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: { kitchenStatus: true },
  });
  if (!order) return { status: "error", message: "Order not found" };
  const to = nextKitchenStatus(order.kitchenStatus);
  if (!to) return { status: "error", message: "Order is already served" };
  const res = await setKitchenStatus(orderId, to);
  return res.ok ? { status: "success", message: res.message } : { status: "error", message: res.message };
}

/** Send an order one step back (undo a mistaken tap). */
export async function revertKitchenOrder(orderId: string): Promise<KitchenActionState> {
  await requireRole([...KITCHEN_ROLES]);
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: { kitchenStatus: true },
  });
  if (!order) return { status: "error", message: "Order not found" };
  const to = prevKitchenStatus(order.kitchenStatus);
  if (!to) return { status: "error", message: "Order is at the first stage" };
  const res = await setKitchenStatus(orderId, to);
  return res.ok ? { status: "success", message: res.message } : { status: "error", message: res.message };
}
