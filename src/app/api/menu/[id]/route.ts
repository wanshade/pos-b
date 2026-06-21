/**
 * /api/menu/[id] — get / update / delete
 *
 * GET    — any authed user
 * PATCH  — MANAGER + ADMIN
 * DELETE — ADMIN
 */

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { jsonError, jsonOk, requireApiRole } from "@/lib/api/menu-helpers";
import { menuItemSchema } from "@/lib/schemas/menu";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteParams) {
  const auth = await requireApiRole(["KASIR", "MANAGER", "ADMIN"]);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const item = await db.menuItem.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, name: true } },
      variants: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }] },
      modifiers: { orderBy: [{ groupName: "asc" }, { sortOrder: "asc" }] },
    },
  });
  if (!item) return jsonError(404, "NOT_FOUND", "Menu item not found");
  return jsonOk({
    id: item.id,
    name: item.name,
    sku: item.sku,
    barcode: item.barcode,
    price: item.price.toString(),
    cost: item.cost.toString(),
    imageUrl: item.imageUrl,
    isAvailable: item.isAvailable,
    trackStock: item.trackStock,
    sortOrder: item.sortOrder,
    category: item.category,
    variants: item.variants.map((v) => ({ id: v.id, name: v.name, priceDelta: v.priceDelta.toString(), sortOrder: v.sortOrder })),
    modifiers: item.modifiers.map((m) => ({ id: m.id, groupName: m.groupName, name: m.name, priceDelta: m.priceDelta.toString(), sortOrder: m.sortOrder })),
  });
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const auth = await requireApiRole(["MANAGER", "ADMIN"]);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "BAD_JSON", "Request body must be JSON");
  }
  const parsed = menuItemSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(422, "VALIDATION", "Invalid menu item", { fieldErrors: parsed.error.flatten().fieldErrors });
  }
  try {
    const item = await db.menuItem.update({
      where: { id },
      data: {
        ...parsed.data,
        price: new Prisma.Decimal(parsed.data.price),
        cost: new Prisma.Decimal(parsed.data.cost),
      },
    });
    return jsonOk({ id: item.id });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return jsonError(404, "NOT_FOUND", "Menu item not found");
    }
    if (e instanceof Error && /Unique constraint/.test(e.message)) {
      return jsonError(409, "DUPLICATE", "SKU or barcode already in use");
    }
    return jsonError(500, "INTERNAL", "Failed to update menu item");
  }
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const auth = await requireApiRole(["ADMIN"]);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  try {
    await db.menuItem.delete({ where: { id } });
    return jsonOk({ deleted: true });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return jsonError(404, "NOT_FOUND", "Menu item not found");
    }
    return jsonError(500, "INTERNAL", "Failed to delete menu item");
  }
}
