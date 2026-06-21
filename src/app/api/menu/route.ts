/**
 * /api/menu — list + create
 *
 * GET  ?q=foo&categoryId=bar&available=true   → list of items
 * POST                                       → create new (ADMIN)
 */

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { jsonError, jsonOk, requireApiRole } from "@/lib/api/menu-helpers";
import { menuItemSchema } from "@/lib/schemas/menu";

export async function GET(request: Request) {
  // any authed user can read
  const auth = await requireApiRole(["KASIR", "MANAGER", "ADMIN"]);
  if (!auth.ok) return auth.response;

  const url = new URL(request.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const categoryId = url.searchParams.get("categoryId")?.trim() || undefined;
  const available = url.searchParams.get("available");

  const where: Prisma.MenuItemWhereInput = {};
  if (categoryId) where.categoryId = categoryId;
  if (available === "true") where.isAvailable = true;
  if (available === "false") where.isAvailable = false;
  if (q) {
    where.OR = [
      { name: { contains: q } },
      { sku: { contains: q } },
      { barcode: { contains: q } },
    ];
  }

  const items = await db.menuItem.findMany({
    where,
    orderBy: [{ categoryId: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    include: { category: { select: { id: true, name: true } } },
  });

  return jsonOk(
    items.map((i) => ({
      id: i.id,
      name: i.name,
      sku: i.sku,
      barcode: i.barcode,
      price: i.price.toString(),
      cost: i.cost.toString(),
      imageUrl: i.imageUrl,
      isAvailable: i.isAvailable,
      trackStock: i.trackStock,
      sortOrder: i.sortOrder,
      category: i.category,
    })),
  );
}

export async function POST(request: Request) {
  const auth = await requireApiRole(["ADMIN"]);
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "BAD_JSON", "Request body must be JSON");
  }
  const parsed = menuItemSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(422, "VALIDATION", "Invalid menu item", {
      fieldErrors: parsed.error.flatten().fieldErrors,
    });
  }
  const cat = await db.category.findUnique({ where: { id: parsed.data.categoryId } });
  if (!cat) return jsonError(404, "CATEGORY_NOT_FOUND", "Category not found");

  try {
    const item = await db.menuItem.create({
      data: {
        ...parsed.data,
        price: new Prisma.Decimal(parsed.data.price),
        cost: new Prisma.Decimal(parsed.data.cost),
      },
    });
    return jsonOk({ id: item.id }, 201);
  } catch (e) {
    if (e instanceof Error && /Unique constraint/.test(e.message)) {
      return jsonError(409, "DUPLICATE", "SKU or barcode already in use");
    }
    return jsonError(500, "INTERNAL", "Failed to create menu item");
  }
}
