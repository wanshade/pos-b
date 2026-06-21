/**
 * Server action for /admin/settings — update outlet.
 */

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { recordAudit } from "@/lib/audit/log";

export type SettingsState =
  | { status: "idle" }
  | { status: "success"; message: string }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };

const settingsSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  address: z.string().trim().max(200).optional().transform((s) => (s === "" ? null : s)),
  phone: z.string().trim().max(40).optional().transform((s) => (s === "" ? null : s)),
  taxRate: z.string().regex(/^\d+(\.\d{1,2})?$/, "Tax rate must be a non-negative number"),
  currency: z.string().trim().min(1).max(8),
  receiptFooter: z.string().trim().max(200).optional().transform((s) => (s === "" ? null : s)),
});

function fieldErrorsFromZod(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const k = String(issue.path[0] ?? "");
    if (k && !out[k]) out[k] = issue.message;
  }
  return out;
}

export async function updateSettings(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  await requireRole(["ADMIN"]);
  const id = String(formData.get("id"));
  if (!id) return { status: "error", message: "Missing outlet id" };

  const parsed = settingsSchema.safeParse({
    name: formData.get("name"),
    address: formData.get("address") ?? "",
    phone: formData.get("phone") ?? "",
    taxRate: formData.get("taxRate") ?? "0",
    currency: formData.get("currency") ?? "IDR",
    receiptFooter: formData.get("receiptFooter") ?? "",
  });
  if (!parsed.success) {
    return { status: "error", message: "Please check the form", fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const before = await db.outlet.findUnique({ where: { id } });
  if (!before) return { status: "error", message: "Outlet not found" };

  const data: Prisma.OutletUpdateInput = {
    name: parsed.data.name,
    address: parsed.data.address,
    phone: parsed.data.phone,
    taxRate: new Prisma.Decimal(parsed.data.taxRate),
    currency: parsed.data.currency,
    receiptFooter: parsed.data.receiptFooter,
  };
  const updated = await db.outlet.update({ where: { id }, data });

  await recordAudit({
    action: "settings.update",
    entity: "Outlet",
    entityId: id,
    data: { before: { taxRate: before.taxRate.toString(), currency: before.currency, receiptFooter: before.receiptFooter }, after: { taxRate: updated.taxRate.toString(), currency: updated.currency, receiptFooter: updated.receiptFooter } },
  });

  revalidatePath("/admin/settings");
  revalidatePath("/pos/orders"); // receipts show outlet info
  revalidatePath("/pos");
  return { status: "success", message: "Settings updated" };
}
