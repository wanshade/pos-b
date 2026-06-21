/**
 * Server actions for /menu/categories (admin only).
 * Defense-in-depth: each action calls requireRole(["ADMIN"]).
 */

"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { categorySchema } from "@/lib/schemas/menu";

export type CategoryFormState =
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

export async function createCategory(
  _prev: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  await requireRole(["ADMIN"]);

  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    sortOrder: formData.get("sortOrder") ?? 0,
    color: formData.get("color") ?? undefined,
    icon: formData.get("icon") ?? undefined,
    isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
  });
  if (!parsed.success) {
    return { status: "error", message: "Please check the form", fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  try {
    await db.category.create({ data: parsed.data });
  } catch (e) {
    const msg = e instanceof Error && e.message.includes("Unique constraint")
      ? `A category named "${parsed.data.name}" already exists`
      : "Failed to create category";
    return { status: "error", message: msg };
  }
  revalidatePath("/menu/categories");
  revalidatePath("/menu");
  return { status: "success", message: `Created "${parsed.data.name}"` };
}

export async function updateCategory(
  id: string,
  _prev: CategoryFormState,
  formData: FormData,
): Promise<CategoryFormState> {
  await requireRole(["ADMIN"]);

  const parsed = categorySchema.safeParse({
    name: formData.get("name"),
    sortOrder: formData.get("sortOrder") ?? 0,
    color: formData.get("color") ?? undefined,
    icon: formData.get("icon") ?? undefined,
    isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
  });
  if (!parsed.success) {
    return { status: "error", message: "Please check the form", fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  try {
    await db.category.update({ where: { id }, data: parsed.data });
  } catch (e) {
    const msg = e instanceof Error && e.message.includes("Unique constraint")
      ? `A category named "${parsed.data.name}" already exists`
      : "Failed to update category";
    return { status: "error", message: msg };
  }
  revalidatePath("/menu/categories");
  revalidatePath("/menu");
  return { status: "success", message: `Updated "${parsed.data.name}"` };
}

export async function deleteCategory(id: string): Promise<void> {
  await requireRole(["ADMIN"]);
  await db.category.delete({ where: { id } });
  revalidatePath("/menu/categories");
  revalidatePath("/menu");
}
