/**
 * Server actions for /inventory/purchase-orders/[id]
 * - receiveItems: for each line, record a PURCHASE movement + update receivedQty
 * - markOrdered: DRAFT → ORDERED
 * - markReceived: full PO received
 */

"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireRole, getSession } from "@/lib/session";
import { recordStockMovement } from "@/lib/inventory/stock-helpers";
import { recordAudit } from "@/lib/audit/log";
import { receiveQtyRe } from "@/lib/schemas/inventory";

export type ReceiveState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };

function fieldErrorsFromZod(err: import("zod").ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const k = String(issue.path[0] ?? "");
    if (k && !out[k]) out[k] = issue.message;
  }
  return out;
}

/**
 * Receive stock against a PO.
 * Form data: one entry per line item, key = itemId, value = signed-decimal string qty to receive.
 * For each line where qty > 0: recordStockMovement(PURCHASE) + bump receivedQty.
 * PO status: PARTIAL if some, RECEIVED if all fully received.
 */
export async function receiveItems(
  poId: string,
  _prev: ReceiveState,
  formData: FormData,
): Promise<ReceiveState> {
  await requireRole(["ADMIN", "MANAGER"]);

  const po = await db.purchaseOrder.findUnique({
    where: { id: poId },
    include: { items: true },
  });
  if (!po) return { status: "error", message: "PO not found" };
  if (po.status === "CANCELLED" || po.status === "RECEIVED") {
    return { status: "error", message: `PO is ${po.status}; cannot receive` };
  }

  const session = await getSession();
  const createdById = (session?.user as { id?: string } | undefined)?.id ?? null;

  // ---- Pass 1: validate every entered qty before writing anything. ----
  const toReceive: { item: (typeof po.items)[number]; qty: Prisma.Decimal }[] = [];
  for (const item of po.items) {
    const raw = formData.get(`receive_${item.id}`);
    if (raw === null) continue;
    const qtyStr = String(raw).trim();
    if (qtyStr === "" || qtyStr === "0") continue; // nothing to receive on this line
    if (!receiveQtyRe.test(qtyStr)) {
      return {
        status: "error",
        message: `Invalid receive qty "${qtyStr}". Use a non-negative number like 5 or 10.50.`,
      };
    }
    const qty = new Prisma.Decimal(qtyStr);
    if (qty.lte(0)) continue;
    const remaining = item.qty.minus(item.receivedQty);
    if (qty.gt(remaining)) {
      return {
        status: "error",
        message: `Receive qty (${qty.toString()}) exceeds remaining (${remaining.toString()}) for one of the lines`,
      };
    }
    toReceive.push({ item, qty });
  }

  if (toReceive.length === 0) {
    return { status: "error", message: "Enter at least one quantity to receive" };
  }

  // ---- Pass 2: record movements + bump receivedQty. ----
  let totalReceivedNow = new Prisma.Decimal(0);
  const auditLines: { item: string; qty: string }[] = [];
  for (const { item, qty } of toReceive) {
    try {
      await recordStockMovement({
        stockItemId: item.stockItemId,
        type: "PURCHASE",
        qty,
        refType: "PO",
        refId: po.id,
        reason: `Receive against ${po.poNumber}`,
        createdById,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to record movement";
      return { status: "error", message: msg };
    }
    await db.purchaseOrderItem.update({
      where: { id: item.id },
      data: { receivedQty: item.receivedQty.plus(qty) },
    });
    totalReceivedNow = totalReceivedNow.plus(qty);
    auditLines.push({ item: item.stockItemId, qty: qty.toString() });
  }

  // Recompute PO status from the persisted line items so it's always accurate.
  const freshItems = await db.purchaseOrderItem.findMany({ where: { poId } });
  const allFullyReceived = freshItems.every((it) => it.receivedQty.gte(it.qty));
  const newStatus: "RECEIVED" | "PARTIAL" = allFullyReceived ? "RECEIVED" : "PARTIAL";
  const data: Prisma.PurchaseOrderUpdateInput = { status: newStatus };
  if (newStatus === "RECEIVED") data.receivedAt = new Date();
  await db.purchaseOrder.update({ where: { id: poId }, data });

  await recordAudit({
    action: "inventory.po.receive",
    entity: "PurchaseOrder",
    entityId: poId,
    data: { poNumber: po.poNumber, received: totalReceivedNow.toString(), status: newStatus, lines: auditLines },
    userId: createdById,
  });

  revalidatePath(`/inventory/purchase-orders/${poId}`);
  revalidatePath("/inventory");
  revalidatePath("/inventory/movements");
  revalidatePath("/dashboard");
  return {
    status: "success",
    message: allFullyReceived
      ? `All lines fully received — PO marked RECEIVED`
      : `Received ${totalReceivedNow.toString()}; PO is now PARTIAL`,
  };
}

export async function markOrdered(poId: string): Promise<void> {
  await requireRole(["ADMIN", "MANAGER"]);
  const po = await db.purchaseOrder.findUnique({ where: { id: poId } });
  if (!po) return;
  if (po.status !== "DRAFT") return; // only a draft can be moved to ORDERED
  await db.purchaseOrder.update({
    where: { id: poId },
    data: { status: "ORDERED", orderedAt: new Date() },
  });
  await recordAudit({
    action: "inventory.po.order",
    entity: "PurchaseOrder",
    entityId: poId,
    data: { poNumber: po.poNumber },
  });
  revalidatePath(`/inventory/purchase-orders/${poId}`);
  revalidatePath("/inventory/purchase-orders");
}

export async function cancelPO(poId: string): Promise<void> {
  await requireRole(["ADMIN", "MANAGER"]);
  const po = await db.purchaseOrder.findUnique({ where: { id: poId } });
  if (!po) return;
  if (po.status === "RECEIVED" || po.status === "CANCELLED") return;
  await db.purchaseOrder.update({
    where: { id: poId },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });
  await recordAudit({
    action: "inventory.po.cancel",
    entity: "PurchaseOrder",
    entityId: poId,
    data: { poNumber: po.poNumber },
  });
  revalidatePath(`/inventory/purchase-orders/${poId}`);
  revalidatePath("/inventory/purchase-orders");
}
