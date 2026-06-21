import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { OpnameForm } from "./opname-form";

export const metadata = { title: "Stock opname — POS App" };
export const dynamic = "force-dynamic";

export default async function OpnamePage() {
  await requireRole(["ADMIN", "MANAGER"]);
  const items = await db.menuItem.findMany({
    where: { trackStock: true },
    orderBy: { name: "asc" },
    include: { stock: true },
  });
  const rows = items
    .filter((i) => i.stock)
    .map((i) => ({
      id: i.stock!.id,
      name: i.name,
      currentQty: i.stock!.currentQty.toString(),
      unit: i.stock!.unit,
    }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Stock opname</h1>
        <p className="text-sm text-muted-foreground">
          Count every item and enter the physical quantity. Differences are recorded as OPNAME movements.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Count sheet ({rows.length} items)</CardTitle>
          <CardDescription>Leave blank to skip an item. Only changed counts are saved.</CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No items are tracking stock.</p>
          ) : (
            <OpnameForm rows={rows} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
