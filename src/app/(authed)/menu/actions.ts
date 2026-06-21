/**
 * Server actions for /menu/* (admin for create, manager+ for edit).
 *
 * Money: validated as decimal STRINGS by zod, then wrapped in Prisma.Decimal
 * for exact arithmetic + storage.
 */

"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { menuItemSchema } from "@/lib/schemas/menu";
import { ensureStockItemForMenuItem } from "@/lib/inventory/stock-helpers";
import { recordAudit } from "@/lib/audit/log";

export type MenuItemFormState =
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

function formBool(v: FormDataEntryValue | null): boolean {
  return v === "on" || v === "true" || v === "1";
}

function parseFormData(formData: FormData) {
  return {
    name: formData.get("name"),
    categoryId: formData.get("categoryId"),
    sku: formData.get("sku") ?? undefined,
    barcode: formData.get("barcode") ?? undefined,
    price: formData.get("price") ?? "",
    cost: formData.get("cost") ?? "",
    imageUrl: formData.get("imageUrl") ?? undefined,
    isAvailable: formBool(formData.get("isAvailable")),
    trackStock: formBool(formData.get("trackStock")),
    sortOrder: formData.get("sortOrder") ?? 0,
  };
}

export async function createMenuItem(
  _prev: MenuItemFormState,
  formData: FormData,
): Promise<MenuItemFormState> {
  await requireRole(["ADMIN"]);
  const parsed = menuItemSchema.safeParse(parseFormData(formData));
  if (!parsed.success) {
    return { status: "error", message: "Please check the form", fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  // verify category exists (FK check; friendlier than a Prisma error)
  const cat = await db.category.findUnique({ where: { id: parsed.data.categoryId } });
  if (!cat) {
    return { status: "error", message: "Category not found", fieldErrors: { categoryId: "Pick a valid category" } };
  }

  let item;
  try {
    item = await db.menuItem.create({
      data: {
        name: parsed.data.name,
        categoryId: parsed.data.categoryId,
        sku: parsed.data.sku,
        barcode: parsed.data.barcode,
        price: new Prisma.Decimal(parsed.data.price),
        cost: new Prisma.Decimal(parsed.data.cost),
        imageUrl: parsed.data.imageUrl,
        isAvailable: parsed.data.isAvailable,
        trackStock: parsed.data.trackStock,
        sortOrder: parsed.data.sortOrder,
      },
    });
  } catch (e) {
    const msg = e instanceof Error && /Unique constraint/.test(e.message)
      ? "SKU or barcode already in use"
      : "Failed to create menu item";
    return { status: "error", message: msg };
  }

  // Auto-create StockItem if trackStock=true
  if (item.trackStock) {
    await ensureStockItemForMenuItem(item.id);
  }

  revalidatePath("/menu");
  revalidatePath("/menu/categories");
  return { status: "success", message: `Created "${item.name}"`, id: item.id };
}

export async function updateMenuItem(
  id: string,
  _prev: MenuItemFormState,
  formData: FormData,
): Promise<MenuItemFormState> {
  await requireRole(["ADMIN", "MANAGER"]);
  const parsed = menuItemSchema.safeParse(parseFormData(formData));
  if (!parsed.success) {
    return { status: "error", message: "Please check the form", fieldErrors: fieldErrorsFromZod(parsed.error) };
  }

  const cat = await db.category.findUnique({ where: { id: parsed.data.categoryId } });
  if (!cat) {
    return { status: "error", message: "Category not found", fieldErrors: { categoryId: "Pick a valid category" } };
  }

  // Read prior state to detect trackStock transitions
  const before = await db.menuItem.findUnique({
    where: { id },
    select: { trackStock: true },
  });
  if (!before) {
    return { status: "error", message: "Menu item not found" };
  }

  let item;
  try {
    item = await db.menuItem.update({
      where: { id },
      data: {
        name: parsed.data.name,
        categoryId: parsed.data.categoryId,
        sku: parsed.data.sku,
        barcode: parsed.data.barcode,
        price: new Prisma.Decimal(parsed.data.price),
        cost: new Prisma.Decimal(parsed.data.cost),
        imageUrl: parsed.data.imageUrl,
        isAvailable: parsed.data.isAvailable,
        trackStock: parsed.data.trackStock,
        sortOrder: parsed.data.sortOrder,
      },
    });
  } catch (e) {
    const msg = e instanceof Error && /Unique constraint/.test(e.message)
      ? "SKU or barcode already in use"
      : "Failed to update menu item";
    return { status: "error", message: msg };
  }

  // If trackStock flipped false→true, create StockItem
  if (!before.trackStock && item.trackStock) {
    await ensureStockItemForMenuItem(item.id);
  }

  revalidatePath("/menu");
  revalidatePath("/menu/categories");
  revalidatePath(`/menu/${id}/edit`);
  revalidatePath("/inventory");
  return { status: "success", message: `Updated "${item.name}"`, id: item.id };
}

export async function deleteMenuItem(id: string): Promise<void> {
  await requireRole(["ADMIN"]);

  const item = await db.menuItem.findUnique({
    where: { id },
    select: { name: true },
  });
  if (!item) {
    redirect("/menu");
  }

  const orderItemCount = await db.orderItem.count({
    where: { menuItemId: id },
  });

  if (orderItemCount > 0) {
    throw new Error(
      `Cannot delete "${item.name}" — it has ${orderItemCount} order item(s). Use the availability toggle to hide it instead.`,
    );
  }

  try {
    await db.menuItem.delete({ where: { id } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Failed to delete menu item";
    throw new Error(msg);
  }

  await recordAudit({
    action: "menu.item.delete",
    entity: "MenuItem",
    entityId: id,
    data: { name: item.name },
  });

  revalidatePath("/menu");
  revalidatePath("/inventory");
  redirect("/menu");
}
