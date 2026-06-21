import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { EditMenuItemForm } from "../../menu-item-form";
import { NewVariantForm, VariantRow } from "./variants-manager";
import { NewModifierForm, ModifierGroupList } from "./modifiers-manager";

export const metadata = { title: "Edit menu item — POS App" };
export const dynamic = "force-dynamic";

export default async function EditMenuItemPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { id } = await params;
  const { created } = await searchParams;
  await requireRole(["ADMIN", "MANAGER"]);

  const [item, categories, variants, modifiers] = await Promise.all([
    db.menuItem.findUnique({ where: { id } }),
    db.category.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
    db.menuVariant.findMany({
      where: { menuItemId: id },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    db.modifier.findMany({
      where: { menuItemId: id },
      orderBy: [{ groupName: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    }),
  ]);

  if (!item) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-3">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 -ml-2"
          nativeButton={false}
          render={<Link href="/menu" />}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
          Back to menu
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Edit: {item.name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Variants are single-choice size options. Modifiers are add-ons grouped by category.
          </p>
        </div>
      </div>

      {created === "1" && (
        <div className="rounded-md border border-emerald-500/40 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
          Item created. Add variants or modifiers here, or head back to the menu.
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          <EditMenuItemForm
            item={{
              id: item.id,
              name: item.name,
              categoryId: item.categoryId,
              sku: item.sku,
              barcode: item.barcode,
              price: item.price.toString(),
              cost: item.cost.toString(),
              imageUrl: item.imageUrl,
              isAvailable: item.isAvailable,
              trackStock: item.trackStock,
              sortOrder: item.sortOrder,
            }}
            categories={categories}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Variants ({variants.length})</CardTitle>
          <CardDescription>
            E.g. &quot;Small&quot; with -3000, &quot;Large&quot; with +5000. Deleting a menu item also deletes its variants.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {variants.length > 0 && (
            <ul className="space-y-2">
              {variants.map((v) => (
                <VariantRow
                  key={v.id}
                  variant={{
                    id: v.id,
                    name: v.name,
                    priceDelta: v.priceDelta.toString(),
                    sortOrder: v.sortOrder,
                  }}
                  menuItemId={id}
                />
              ))}
            </ul>
          )}
          <NewVariantForm menuItemId={id} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Modifiers ({modifiers.length})</CardTitle>
          <CardDescription>
            Group add-ons under a shared name (e.g. &quot;Milk&quot; → Whole, Oat, Soy). Each option can have its own price delta.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {modifiers.length > 0 && (
            <ModifierGroupList
              modifiers={modifiers.map((m) => ({
                id: m.id,
                groupName: m.groupName,
                name: m.name,
                priceDelta: m.priceDelta.toString(),
                sortOrder: m.sortOrder,
              }))}
              menuItemId={id}
            />
          )}
          <NewModifierForm menuItemId={id} />
        </CardContent>
      </Card>
    </div>
  );
}
