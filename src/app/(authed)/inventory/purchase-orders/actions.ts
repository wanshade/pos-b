/**
 * Server actions for /inventory/purchase-orders
 */

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireRole, getSession } from "@/lib/session";
import { recordAudit } from "@/lib/audit/log";
import { ensureStockItemForMenuItem } from "@/lib/inventory/stock-helpers";
import { purchaseOrderCreateSchema } from "@/lib/schemas/inventory";

export type POCreateState =
  | { status: "idle" }
  | { status: "success"; message: string; id?: string }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };

function fieldErrorsFromZod(err: import("zod").ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const k = String(issue.path[0] ?? "");
    if (k && !out[k]) out[k] = issue.message;
  }
  return out;
}

async function nextPONumber(): Promise<string> {
  // PO-YYYY-NNNN, sequential per year
  const year = new Date().getFullYear();
  const prefix = `PO-${year}-`;
  const last = await db.purchaseOrder.findFirst({
    where: { poNumber: { startsWith: prefix } },
    orderBy: { poNumber: "desc" },
  });
  const lastNum = last
    ? parseInt(last.poNumber.slice(prefix.length), 10)
    : 0;
  return prefix + String(lastNum + 1).padStart(4, "0");
}

export async function createPurchaseOrder(
  _prev: POCreateState,
  formData: FormData,
): Promise<POCreateState> {
  await requireRole(["ADMIN", "MANAGER"]);
  const parsed = purchaseOrderCreateSchema.safeParse({
    supplierName: formData.get("supplierName"),
    supplierContact: formData.get("supplierContact") ?? undefined,
    supplierPhone: formData.get("supplierPhone") ?? undefined,
    supplierEmail: formData.get("supplierEmail") ?? undefined,
    supplierAddress: formData.get("supplierAddress") ?? undefined,
    notes: formData.get("notes") ?? "",
    intent: formData.get("intent") ?? "order",
    items: formData.get("items") ?? "[]",
  });
  if (!parsed.success) {
    return { status: "error", message: "Please check the form", fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  // verify all menuItemIds exist; auto-enable stock tracking + create the
  // StockItem for any item that isn't tracked yet, so you can order anything
  // in the catalog, not just items that already have a stock row.
  const menuIds = parsed.data.items.map((i) => i.menuItemId);
  const menuItems = await db.menuItem.findMany({
    where: { id: { in: menuIds } },
    include: { stock: true },
  });
  const menuById = new Map(menuItems.map((m) => [m.id, m]));
  const missing = menuIds.filter((id) => !menuById.has(id));
  if (missing.length > 0) {
    return { status: "error", message: "One or more line items reference missing menu items" };
  }

  // Resolve each menu item to a stock item id (creating tracking on demand).
  const stockIdByMenuId = new Map<string, string>();
  for (const m of menuItems) {
    let stockId = m.stock?.id;
    if (!stockId) {
      const created = await ensureStockItemForMenuItem(m.id);
      stockId = created.id;
      if (!m.trackStock) {
        await db.menuItem.update({ where: { id: m.id }, data: { trackStock: true } });
      }
    }
    stockIdByMenuId.set(m.id, stockId);
  }

  // compute total
  const total = parsed.data.items.reduce(
    (sum, i) => sum.plus(new Prisma.Decimal(i.qty).times(new Prisma.Decimal(i.unitCost))),
    new Prisma.Decimal(0),
  );

  const session = await getSession();
  const createdById = (session?.user as { id?: string } | undefined)?.id ?? null;

  const ordered = parsed.data.intent === "order";
  const po = await db.purchaseOrder.create({
    data: {
      poNumber: await nextPONumber(),
      supplierName: parsed.data.supplierName,
      supplierContact: parsed.data.supplierContact,
      supplierPhone: parsed.data.supplierPhone,
      supplierEmail: parsed.data.supplierEmail,
      supplierAddress: parsed.data.supplierAddress,
      status: ordered ? "ORDERED" : "DRAFT",
      total,
      notes: parsed.data.notes,
      createdById,
      orderedAt: ordered ? new Date() : null,
      items: {
        create: parsed.data.items.map((i) => ({
          stockItemId: stockIdByMenuId.get(i.menuItemId)!,
          qty: new Prisma.Decimal(i.qty),
          unitCost: new Prisma.Decimal(i.unitCost),
        })),
      },
    },
  });

  await recordAudit({
    action: "inventory.po.create",
    entity: "PurchaseOrder",
    entityId: po.id,
    data: {
      poNumber: po.poNumber,
      supplierName: po.supplierName,
      status: po.status,
      total: total.toString(),
      lines: parsed.data.items.length,
    },
    userId: createdById,
  });

  revalidatePath("/inventory/purchase-orders");
  return { status: "success", message: `Created ${po.poNumber}`, id: po.id };
}

export async function cancelPurchaseOrder(id: string): Promise<void> {
  await requireRole(["ADMIN", "MANAGER"]);
  const po = await db.purchaseOrder.update({
    where: { id },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });
  await recordAudit({
    action: "inventory.po.cancel",
    entity: "PurchaseOrder",
    entityId: id,
    data: { poNumber: po.poNumber },
  });
  revalidatePath("/inventory/purchase-orders");
  revalidatePath(`/inventory/purchase-orders/${id}`);
}

export async function updatePurchaseOrderStatus(
  id: string,
  status: "DRAFT" | "ORDERED" | "PARTIAL" | "RECEIVED" | "CANCELLED",
): Promise<void> {
  await requireRole(["ADMIN", "MANAGER"]);
  await db.purchaseOrder.update({ where: { id }, data: { status } });
  await recordAudit({
    action: "inventory.po.status",
    entity: "PurchaseOrder",
    entityId: id,
    data: { status },
  });
  revalidatePath("/inventory/purchase-orders");
  revalidatePath(`/inventory/purchase-orders/${id}`);
}

export async function deletePurchaseOrder(id: string): Promise<void> {
  await requireRole(["ADMIN"]);
  const po = await db.purchaseOrder.findUnique({ where: { id } });
  if (!po) return;
  if (po.status === "RECEIVED" || po.status === "PARTIAL") {
    throw new Error("Cannot delete a PO that has received stock. Cancel it instead.");
  }
  await db.purchaseOrder.delete({ where: { id } });
  await recordAudit({
    action: "inventory.po.delete",
    entity: "PurchaseOrder",
    entityId: id,
    data: { poNumber: po.poNumber, status: po.status },
  });
  revalidatePath("/inventory/purchase-orders");
}
