/**
 * Server actions for /pos/orders/[id]/receipt:
 * - voidOrder: manager+, with reason, reverses stock (ADJUSTMENT positive),
 *   marks status=VOIDED
 * - refundOrder: manager+, with reason, reverses stock, marks status=REFUNDED
 */

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireRole, getSession } from "@/lib/session";
import { recordStockMovement } from "@/lib/inventory/stock-helpers";
import { recordAudit } from "@/lib/audit/log";

export async function voidOrder(orderId: string, reason: string) {
  await requireRole(["ADMIN", "MANAGER"]);
  if (!reason || reason.trim().length === 0) throw new Error("Reason is required");
  if (reason.length > 500) throw new Error("Reason too long (max 500)");

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { menuItem: { include: { stock: true } } } } },
  });
  if (!order) throw new Error("Order not found");
  if (order.status !== "PAID") throw new Error(`Cannot void order in status ${order.status}`);

  const session = await getSession();
  const createdById = (session?.user as { id?: string } | undefined)?.id ?? null;

  // Reverse stock: for each PAID line, add qty back to stock
  for (const it of order.items) {
    if (it.menuItem.trackStock && it.menuItem.stock) {
      try {
        await recordStockMovement({
          stockItemId: it.menuItem.stock.id,
          type: "ADJUSTMENT",
          qty: new Prisma.Decimal(it.qty),
          refType: "OrderVoid",
          refId: order.id,
          reason: `Void of ${order.orderNumber}: ${reason}`,
          createdById,
        });
      } catch (e) {
        console.error("void stock reversal failed for", it.menuItem.name, e);
      }
    }
  }

  await db.order.update({
    where: { id: orderId },
    data: {
      status: "VOIDED",
      voidedAt: new Date(),
      voidReason: reason,
      kitchenStatus: "NONE",
    },
  });
  revalidatePath(`/pos/orders/${orderId}/receipt`);
  revalidatePath("/kitchen");
  revalidatePath("/inventory");
  revalidatePath("/inventory/movements");
}

export async function refundOrder(orderId: string, reason: string) {
  await requireRole(["ADMIN", "MANAGER"]);
  if (!reason || reason.trim().length === 0) throw new Error("Reason is required");
  if (reason.length > 500) throw new Error("Reason too long (max 500)");

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { menuItem: { include: { stock: true } } } } },
  });
  if (!order) throw new Error("Order not found");
  if (order.status !== "PAID") throw new Error(`Cannot refund order in status ${order.status}`);

  const session = await getSession();
  const createdById = (session?.user as { id?: string } | undefined)?.id ?? null;

  // Reverse stock: same as void — add qty back
  for (const it of order.items) {
    if (it.menuItem.trackStock && it.menuItem.stock) {
      try {
        await recordStockMovement({
          stockItemId: it.menuItem.stock.id,
          type: "ADJUSTMENT",
          qty: new Prisma.Decimal(it.qty),
          refType: "OrderRefund",
          refId: order.id,
          reason: `Refund of ${order.orderNumber}: ${reason}`,
          createdById,
        });
      } catch (e) {
        console.error("refund stock reversal failed for", it.menuItem.name, e);
      }
    }
  }

  await db.order.update({
    where: { id: orderId },
    data: {
      status: "REFUNDED",
      refundedAt: new Date(),
      refundReason: reason,
      kitchenStatus: "NONE",
    },
  });
  revalidatePath(`/pos/orders/${orderId}/receipt`);
  revalidatePath("/kitchen");
  revalidatePath("/inventory");
  revalidatePath("/inventory/movements");
}

export async function deleteOrder(orderId: string) {
  await requireRole(["ADMIN"]);

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { menuItem: { include: { stock: true } } } } },
  });
  if (!order) throw new Error("Order not found");

  const session = await getSession();
  const createdById = (session?.user as { id?: string } | undefined)?.id ?? null;

  if (order.status === "PAID") {
    for (const it of order.items) {
      if (it.menuItem.trackStock && it.menuItem.stock) {
        try {
          await recordStockMovement({
            stockItemId: it.menuItem.stock.id,
            type: "ADJUSTMENT",
            qty: new Prisma.Decimal(it.qty),
            refType: "OrderDelete",
            refId: order.id,
            reason: `Delete of ${order.orderNumber}`,
            createdById,
          });
        } catch (e) {
          console.error("delete stock reversal failed for", it.menuItem.name, e);
        }
      }
    }
  }

  await db.order.delete({ where: { id: orderId } });

  await recordAudit({
    action: "order.delete",
    entity: "Order",
    entityId: orderId,
    data: {
      orderNumber: order.orderNumber,
      status: order.status,
      total: order.total.toString(),
    },
    userId: createdById,
  });

  revalidatePath("/pos/orders");
  revalidatePath("/inventory");
  revalidatePath("/inventory/movements");
  revalidatePath("/reports");
  revalidatePath("/dashboard");
  redirect("/pos/orders");
}
