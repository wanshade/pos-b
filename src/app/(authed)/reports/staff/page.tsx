import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportFilters } from "@/components/reports/report-filters";
import { CsvButton } from "@/components/reports/csv-button";
import { salesByCashier, rangeFromParams, isoDate } from "@/lib/reports/aggregations";
import { formatIDR } from "@/lib/money";

export const metadata = { title: "Sales by cashier — POS App" };
export const dynamic = "force-dynamic";

export default async function SalesByStaffPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await requireRole(["MANAGER", "ADMIN"]);
  const sp = await searchParams;
  const range = rangeFromParams(sp.from, sp.to);
  const rows = await salesByCashier(range);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sales by cashier</h1>
          <p className="text-sm text-muted-foreground">Performance per user, ranked by total.</p>
        </div>
        <CsvButton
          filename={`sales-by-cashier-${isoDate(range.from)}_${isoDate(range.to)}.csv`}
          headers={["name", "orderCount", "total"]}
          rows={rows.map((r) => [r.name, r.orderCount, r.total.toString()])}
        />
      </div>

      <Card>
        <CardContent className="pt-6">
          <ReportFilters current={{ from: sp.from ?? "", to: sp.to ?? "" }} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ranked by total</CardTitle>
          <CardDescription>Joined through Shift.userId.</CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No cashier activity in this range.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="px-2 py-1">#</th>
                  <th className="px-2 py-1">Cashier</th>
                  <th className="px-2 py-1 text-right">Orders</th>
                  <th className="px-2 py-1 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.userId} className="border-b">
                    <td className="px-2 py-1 text-muted-foreground">{i + 1}</td>
                    <td className="px-2 py-1 font-medium">{r.name}</td>
                    <td className="px-2 py-1 text-right font-mono">{r.orderCount}</td>
                    <td className="px-2 py-1 text-right font-mono">{formatIDR(r.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
