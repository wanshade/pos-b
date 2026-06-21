/**
 * Server actions for managing MenuVariants on a menu item.
 * Manager+ can manage variants; admin for delete.
 */

"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { menuVariantSchema } from "@/lib/schemas/menu";

export type VariantFormState =
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

function parseVariantFormData(formData: FormData) {
  return {
    name: formData.get("name"),
    priceDelta: formData.get("priceDelta") ?? "",
    sortOrder: formData.get("sortOrder") ?? 0,
  };
}

export async function addVariant(
  menuItemId: string,
  _prev: VariantFormState,
  formData: FormData,
): Promise<VariantFormState> {
  await requireRole(["ADMIN", "MANAGER"]);
  const parsed = menuVariantSchema.safeParse(parseVariantFormData(formData));
  if (!parsed.success) {
    return { status: "error", message: "Please check the form", fieldErrors: fieldErrorsFromZod(parsed.error) };
  }
  // verify the item exists
  const item = await db.menuItem.findUnique({ where: { id: menuItemId }, select: { id: true } });
  if (!item) return { status: "error", message: "Menu item not found" };

  await db.menuVariant.create({
    data: {
      menuItemId,
      name: parsed.data.name,
      priceDelta: new Prisma.Decimal(parsed.data.priceDelta),
      sortOrder: parsed.data.sortOrder,
    },
  });
  revalidatePath(`/menu/${menuItemId}/edit`);
  return { status: "success", message: `Added "${parsed.data.name}"` };
}

export async function updateVariant(
  id: string,
  menuItemId: string,
  _prev: VariantFormState,
  formData: FormData,
): Promise<VariantFormState> {
  await requireRole(["ADMIN", "MANAGER"]);
  const parsed = menuVariantSchema.safeParse(parseVariantFormData(formData));
  if (!parsed.success) {
    return { status: "error", message: "Please check the form", fieldErrors: fieldErrorsFromZod(parsed.error) };
  }
  await db.menuVariant.update({
    where: { id },
    data: {
      name: parsed.data.name,
      priceDelta: new Prisma.Decimal(parsed.data.priceDelta),
      sortOrder: parsed.data.sortOrder,
    },
  });
  revalidatePath(`/menu/${menuItemId}/edit`);
  return { status: "success", message: `Updated "${parsed.data.name}"` };
}

export async function deleteVariant(id: string, menuItemId: string): Promise<void> {
  await requireRole(["ADMIN", "MANAGER"]);
  await db.menuVariant.delete({ where: { id } });
  revalidatePath(`/menu/${menuItemId}/edit`);
}
