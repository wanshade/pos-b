/**
 * /api/categories — list + create
 *
 * GET  — any authed user
 * POST — ADMIN
 */

import { db } from "@/lib/db";
import { jsonError, jsonOk, requireApiRole } from "@/lib/api/menu-helpers";
import { categorySchema } from "@/lib/schemas/menu";

export async function GET() {
  const auth = await requireApiRole(["KASIR", "MANAGER", "ADMIN"]);
  if (!auth.ok) return auth.response;
  const cats = await db.category.findMany({
    orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
  });
  return jsonOk(cats.map((c) => ({ ...c })));
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
  const parsed = categorySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(422, "VALIDATION", "Invalid category", { fieldErrors: parsed.error.flatten().fieldErrors });
  }
  try {
    const cat = await db.category.create({ data: parsed.data });
    return jsonOk({ id: cat.id }, 201);
  } catch (e) {
    if (e instanceof Error && /Unique constraint/.test(e.message)) {
      return jsonError(409, "DUPLICATE", "A category with this name already exists");
    }
    return jsonError(500, "INTERNAL", "Failed to create category");
  }
}
