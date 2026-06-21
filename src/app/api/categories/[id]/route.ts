/**
 * /api/categories/[id] — get / update / delete
 *
 * GET    — any authed user
 * PATCH  — ADMIN
 * DELETE — ADMIN
 */

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { jsonError, jsonOk, requireApiRole } from "@/lib/api/menu-helpers";
import { categorySchema } from "@/lib/schemas/menu";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteParams) {
  const auth = await requireApiRole(["KASIR", "MANAGER", "ADMIN"]);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  const cat = await db.category.findUnique({ where: { id } });
  if (!cat) return jsonError(404, "NOT_FOUND", "Category not found");
  return jsonOk({ ...cat });
}

export async function PATCH(req: Request, { params }: RouteParams) {
  const auth = await requireApiRole(["ADMIN"]);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "BAD_JSON", "Request body must be JSON");
  }
  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(422, "VALIDATION", "Invalid category", { fieldErrors: parsed.error.flatten().fieldErrors });
  }
  try {
    const cat = await db.category.update({ where: { id }, data: parsed.data });
    return jsonOk({ id: cat.id });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return jsonError(404, "NOT_FOUND", "Category not found");
    }
    if (e instanceof Error && /Unique constraint/.test(e.message)) {
      return jsonError(409, "DUPLICATE", "A category with this name already exists");
    }
    return jsonError(500, "INTERNAL", "Failed to update category");
  }
}

export async function DELETE(_req: Request, { params }: RouteParams) {
  const auth = await requireApiRole(["ADMIN"]);
  if (!auth.ok) return auth.response;
  const { id } = await params;
  try {
    await db.category.delete({ where: { id } });
    return jsonOk({ deleted: true });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return jsonError(404, "NOT_FOUND", "Category not found");
    }
    if (e instanceof Error && /Foreign key constraint|is referenced/.test(e.message)) {
      return jsonError(409, "IN_USE", "Category has menu items; remove them first or deactivate instead");
    }
    return jsonError(500, "INTERNAL", "Failed to delete category");
  }
}
