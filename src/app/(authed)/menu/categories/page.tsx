import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { HugeiconsIcon } from "@hugeicons/react";
import { Layers01Icon, Store01Icon } from "@hugeicons/core-free-icons";
import { CategoryManager } from "./category-manager";

export const metadata = { title: "Categories — POS App" };
export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  await requireRole(["ADMIN"]);
  const categories = await db.category.findMany({
    orderBy: [{ isActive: "desc" }, { sortOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { menuItems: true } } },
  });

  return (
    <div className="mx-auto w-full space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl border border-border bg-muted shrink-0">
            <HugeiconsIcon icon={Layers01Icon} className="size-5 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Categories</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {categories.length} categor{categories.length === 1 ? "y" : "ies"}
              {" · "}organize your menu for the POS terminal
            </p>
          </div>
        </div>
      </div>

      {categories.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card py-20 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl border border-border bg-muted">
            <HugeiconsIcon icon={Store01Icon} className="size-7 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-foreground">No categories yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              Create your first category to start organizing menu items.
            </p>
          </div>
        </div>
      ) : (
        <CategoryManager
          categories={categories.map((c) => ({
            id: c.id,
            name: c.name,
            sortOrder: c.sortOrder,
            color: c.color,
            icon: c.icon,
            isActive: c.isActive,
            itemCount: c._count.menuItems,
          }))}
        />
      )}
    </div>
  );
}
