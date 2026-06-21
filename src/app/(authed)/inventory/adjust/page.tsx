import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AdjustForm } from "./adjust-form";

export const metadata = { title: "Adjust stock — POS App" };
export const dynamic = "force-dynamic";

export default async function AdjustStockPage({
  searchParams,
}: {
  searchParams: Promise<{ menuItemId?: string }>;
}) {
  await requireRole(["ADMIN", "MANAGER"]);
  const { menuItemId } = await searchParams;

  const items = await db.menuItem.findMany({
    where: { trackStock: true },
    orderBy: { name: "asc" },
    include: { stock: true },
  });
  const stocks = items
    .filter((i) => i.stock)
    .map((i) => ({
      id: i.stock!.id,
      name: i.name,
      currentQty: i.stock!.currentQty.toString(),
      unit: i.stock!.unit,
    }));

  // resolve preselect: if ?menuItemId=, find the matching stock row
  let preselected: string | undefined;
  if (menuItemId) {
    const found = items.find((i) => i.id === menuItemId)?.stock;
    preselected = found?.id;
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Adjust stock</h1>
        <p className="text-sm text-muted-foreground">
          Record a manual movement. For bulk stock counts, use Opname.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>New movement</CardTitle>
          <CardDescription>Every change is logged with who, when, and why.</CardDescription>
        </CardHeader>
        <CardContent>
          {stocks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No items are tracking stock yet. Turn on &quot;Track stock&quot; in a menu item&apos;s edit page.
            </p>
          ) : (
            <AdjustForm stocks={stocks} preselectedStockId={preselected} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
