/**
 * Server action for /inventory/adjust — record a manual stock movement.
 */

"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireRole, getSession } from "@/lib/session";
import { recordStockMovement } from "@/lib/inventory/stock-helpers";
import { recordAudit } from "@/lib/audit/log";
import { stockAdjustmentSchema } from "@/lib/schemas/inventory";

export type AdjustFormState =
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

export async function adjustStockAction(
  _prev: AdjustFormState,
  formData: FormData,
): Promise<AdjustFormState> {
  await requireRole(["ADMIN", "MANAGER"]);

  const parsed = stockAdjustmentSchema.safeParse({
    stockItemId: formData.get("stockItemId"),
    type: formData.get("type"),
    qty: formData.get("qty") ?? "",
    reason: formData.get("reason") ?? "",
  });
  if (!parsed.success) {
    return { status: "error", message: "Please check the form", fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  // verify stock item exists
  const stock = await db.stockItem.findUnique({
    where: { id: parsed.data.stockItemId },
    include: { menuItem: { select: { name: true } } },
  });
  if (!stock) {
    return { status: "error", message: "Stock item not found", fieldErrors: { stockItemId: "Pick a valid item" } };
  }

  const session = await getSession();
  const createdById = (session?.user as { id?: string } | undefined)?.id ?? null;

  try {
    await recordStockMovement({
      stockItemId: stock.id,
      type: parsed.data.type,
      qty: new Prisma.Decimal(parsed.data.qty),
      reason: parsed.data.reason ?? undefined,
      refType: "Manual",
      createdById,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to record movement";
    return { status: "error", message: msg };
  }

  await recordAudit({
    action: "inventory.adjust",
    entity: "StockItem",
    entityId: stock.id,
    data: {
      item: stock.menuItem.name,
      type: parsed.data.type,
      qty: parsed.data.qty,
      reason: parsed.data.reason ?? null,
    },
    userId: createdById,
  });

  revalidatePath("/inventory");
  revalidatePath("/inventory/movements");
  revalidatePath("/dashboard");
  return {
    status: "success",
    message: `Recorded ${parsed.data.type} ${parsed.data.qty} for ${stock.menuItem.name}`,
  };
}
