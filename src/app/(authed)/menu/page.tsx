import type { Role } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Menu01Icon,
  Store01Icon,
} from "@hugeicons/core-free-icons";
import { MenuGrid } from "./menu-grid";
import { NewItemDialog } from "./new-item-dialog";

export const metadata = { title: "Menu — POS App" };
export const dynamic = "force-dynamic";

export default async function MenuPage() {
  const session = await requireAuth();
  const user = session.user as { role?: Role };
  const role: Role = user.role ?? "KASIR";
  const canEdit = role === "ADMIN" || role === "MANAGER";
  const canCreate = role === "ADMIN";
  const canDelete = role === "ADMIN";

  const [categories, items] = await Promise.all([
    db.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    db.menuItem.findMany({
      orderBy: [{ categoryId: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
      include: { category: true },
    }),
  ]);

  return (
    <div className="mx-auto w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl border border-border bg-muted shrink-0">
            <HugeiconsIcon icon={Menu01Icon} className="size-5 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Menu</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {items.length} items · {categories.length} categories
              {canEdit ? " · you can edit" : " · read-only"}
            </p>
          </div>
        </div>
        <NewItemDialog
          categories={categories.map((c) => ({ id: c.id, name: c.name }))}
          canCreate={canCreate}
        />
      </div>

      {categories.length === 0 || items.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card py-20 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl border border-border bg-muted">
            <HugeiconsIcon icon={Store01Icon} className="size-7 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-foreground">
              {categories.length === 0 ? "No categories yet" : "No menu items yet"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {categories.length === 0
                ? "Ask an admin to create a category first."
                : "Click \"New item\" to add the first one."}
            </p>
          </div>
        </div>
      ) : (
        <MenuGrid
          categories={categories.map((c) => ({ id: c.id, name: c.name, color: c.color }))}
          items={items.map((i) => ({
            id: i.id,
            name: i.name,
            categoryId: i.categoryId,
            categoryName: i.category.name,
            categoryColor: i.category.color,
            price: i.price.toString(),
            cost: i.cost.toString(),
            sku: i.sku,
            isAvailable: i.isAvailable,
            trackStock: i.trackStock,
          }))}
          canEdit={canEdit}
          canDelete={canDelete}
        />
      )}
    </div>
  );
}
