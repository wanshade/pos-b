/**
 * Server actions for managing Modifiers on a menu item.
 * Manager+ can manage modifiers; admin for delete.
 */

"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { modifierSchema } from "@/lib/schemas/menu";

export type ModifierFormState =
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

function parseModifierFormData(formData: FormData) {
  return {
    groupName: formData.get("groupName"),
    name: formData.get("name"),
    priceDelta: formData.get("priceDelta") ?? "",
    sortOrder: formData.get("sortOrder") ?? 0,
  };
}

export async function addModifier(
  menuItemId: string,
  _prev: ModifierFormState,
  formData: FormData,
): Promise<ModifierFormState> {
  await requireRole(["ADMIN", "MANAGER"]);
  const parsed = modifierSchema.safeParse(parseModifierFormData(formData));
  if (!parsed.success) {
    return { status: "error", message: "Please check the form", fieldErrors: fieldErrorsFromZod(parsed.error) };
  }
  const item = await db.menuItem.findUnique({ where: { id: menuItemId }, select: { id: true } });
  if (!item) return { status: "error", message: "Menu item not found" };

  await db.modifier.create({
    data: {
      menuItemId,
      groupName: parsed.data.groupName,
      name: parsed.data.name,
      priceDelta: new Prisma.Decimal(parsed.data.priceDelta),
      sortOrder: parsed.data.sortOrder,
    },
  });
  revalidatePath(`/menu/${menuItemId}/edit`);
  return { status: "success", message: `Added "${parsed.data.name}" to ${parsed.data.groupName}` };
}

export async function updateModifier(
  id: string,
  menuItemId: string,
  _prev: ModifierFormState,
  formData: FormData,
): Promise<ModifierFormState> {
  await requireRole(["ADMIN", "MANAGER"]);
  const parsed = modifierSchema.safeParse(parseModifierFormData(formData));
  if (!parsed.success) {
    return { status: "error", message: "Please check the form", fieldErrors: fieldErrorsFromZod(parsed.error) };
  }
  await db.modifier.update({
    where: { id },
    data: {
      groupName: parsed.data.groupName,
      name: parsed.data.name,
      priceDelta: new Prisma.Decimal(parsed.data.priceDelta),
      sortOrder: parsed.data.sortOrder,
    },
  });
  revalidatePath(`/menu/${menuItemId}/edit`);
  return { status: "success", message: `Updated "${parsed.data.name}"` };
}

export async function deleteModifier(id: string, menuItemId: string): Promise<void> {
  await requireRole(["ADMIN", "MANAGER"]);
  await db.modifier.delete({ where: { id } });
  revalidatePath(`/menu/${menuItemId}/edit`);
}
