/**
 * Server action for /inventory/opname — bulk count adjustments.
 * For each line, if the counted qty differs from the system qty,
 * create an OPNAME StockMovement with the signed delta.
 */

"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireRole, getSession } from "@/lib/session";
import { recordStockMovement } from "@/lib/inventory/stock-helpers";
import { recordAudit } from "@/lib/audit/log";

export type OpnameState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

// Non-negative decimal, up to 2 decimals. A physical count cannot be negative.
const COUNT_RE = /^\d+(\.\d{1,2})?$/;

export async function saveOpname(
  _prev: OpnameState,
  formData: FormData,
): Promise<OpnameState> {
  await requireRole(["ADMIN", "MANAGER"]);

  const session = await getSession();
  const createdById = (session?.user as { id?: string } | undefined)?.id ?? null;

  // Items are submitted as a JSON object: { [stockItemId]: countedQty }
  const raw = formData.get("counts");
  if (typeof raw !== "string") {
    return { status: "error", message: "Missing counts data" };
  }
  let counts: Record<string, string>;
  try {
    counts = JSON.parse(raw);
  } catch {
    return { status: "error", message: "Invalid counts JSON" };
  }
  if (counts === null || typeof counts !== "object" || Array.isArray(counts)) {
    return { status: "error", message: "Invalid counts data" };
  }

  const stockIds = Object.keys(counts);
  if (stockIds.length === 0) {
    return { status: "error", message: "No counts to save" };
  }

  const stocks = await db.stockItem.findMany({
    where: { id: { in: stockIds } },
    include: { menuItem: { select: { name: true } } },
  });
  const stockById = new Map(stocks.map((s) => [s.id, s]));

  // ---- Pass 1: validate everything before writing anything. ----
  // This avoids leaving partial data committed if a later row is invalid,
  // since each movement is recorded in its own transaction.
  const pending: { stock: (typeof stocks)[number]; counted: Prisma.Decimal; delta: Prisma.Decimal }[] = [];
  for (const [stockItemId, countedStr] of Object.entries(counts)) {
    const stock = stockById.get(stockItemId);
    if (!stock) continue; // unknown / non-tracked item — skip silently
    const trimmed = countedStr.trim();
    if (trimmed === "") continue; // blank means "skip this item"
    if (!COUNT_RE.test(trimmed)) {
      return {
        status: "error",
        message: `Invalid count for ${stock.menuItem.name}: "${trimmed}". Use a non-negative number like 5 or 10.50.`,
      };
    }
    const counted = new Prisma.Decimal(trimmed);
    const delta = counted.minus(stock.currentQty);
    if (delta.eq(0)) continue; // no change
    pending.push({ stock, counted, delta });
  }

  if (pending.length === 0) {
    return { status: "success", message: "No changes to save" };
  }

  // ---- Pass 2: record the movements. ----
  const auditEntries: { name: string; system: string; counted: string; delta: string }[] = [];
  let adjusted = 0;
  for (const { stock, counted, delta } of pending) {
    try {
      await recordStockMovement({
        stockItemId: stock.id,
        type: "OPNAME",
        qty: delta,
        reason: `Opname: counted ${counted.toString()} (was ${stock.currentQty.toString()})`,
        refType: "Opname",
        createdById,
      });
      adjusted++;
      auditEntries.push({
        name: stock.menuItem.name,
        system: stock.currentQty.toString(),
        counted: counted.toString(),
        delta: delta.toString(),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to record movement";
      // Record what we managed to save before the failure for traceability.
      if (auditEntries.length > 0) {
        await recordAudit({
          action: "inventory.opname",
          entity: "StockItem",
          data: { adjustments: auditEntries, partial: true },
          userId: createdById,
        });
      }
      return {
        status: "error",
        message: `Saved ${adjusted} adjustment${adjusted === 1 ? "" : "s"}, then failed on ${stock.menuItem.name}: ${msg}`,
      };
    }
  }

  await recordAudit({
    action: "inventory.opname",
    entity: "StockItem",
    data: { adjustments: auditEntries },
    userId: createdById,
  });

  revalidatePath("/inventory");
  revalidatePath("/inventory/movements");
  revalidatePath("/dashboard");
  return {
    status: "success",
    message: `Recorded ${adjusted} adjustment${adjusted === 1 ? "" : "s"}`,
  };
}
