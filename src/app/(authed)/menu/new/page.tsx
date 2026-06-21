import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NewMenuItemForm } from "../menu-item-form";

export const metadata = { title: "New menu item — POS App" };

export default async function NewMenuItemPage() {
  await requireRole(["ADMIN"]);
  const categories = await db.category.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New menu item</h1>
        <p className="text-sm text-muted-foreground">
          Add an item to the menu. Variants & modifiers can be added on the next screen.
        </p>
      </div>

      {categories.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No categories yet</CardTitle>
            <CardDescription>
              Create at least one category before adding menu items.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <a className="text-sm text-primary underline" href="/menu/categories">
              Go to /menu/categories →
            </a>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <NewMenuItemForm categories={categories} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
