import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsForm } from "./settings-form";

export const metadata = { title: "Outlet settings — POS App" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await requireRole(["ADMIN"]);
  const outlet = await db.outlet.findFirst({ orderBy: { createdAt: "asc" } });
  if (!outlet) {
    return (
      <Card className="mx-auto max-w-md">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No outlet configured. Run <code>pnpm prisma db seed</code> first.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Outlet settings</h1>
        <p className="text-sm text-muted-foreground">Used on every receipt and the POS tax calc.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{outlet.name}</CardTitle>
          <CardDescription>Tax, currency, and receipt footer.</CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForm
            outlet={{
              id: outlet.id,
              name: outlet.name,
              address: outlet.address,
              phone: outlet.phone,
              taxRate: outlet.taxRate.toString(),
              currency: outlet.currency,
              receiptFooter: outlet.receiptFooter,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
