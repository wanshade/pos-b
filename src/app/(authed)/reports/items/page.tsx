import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportFilters } from "@/components/reports/report-filters";
import { CsvButton } from "@/components/reports/csv-button";
import { topItems, rangeFromParams, isoDate } from "@/lib/reports/aggregations";
import { formatIDR } from "@/lib/money";

export const metadata = { title: "Top items — POS App" };
export const dynamic = "force-dynamic";

export default async function TopItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; limit?: string }>;
}) {
  await requireRole(["MANAGER", "ADMIN"]);
  const sp = await searchParams;
  const range = rangeFromParams(sp.from, sp.to);
  const limit = Math.min(100, Math.max(1, Number(sp.limit ?? 10)));
  const rows = await topItems(range, limit);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Top items</h1>
          <p className="text-sm text-muted-foreground">
            {rows.length} item{rows.length === 1 ? "" : "s"} sold in this range.
          </p>
        </div>
        <CsvButton
          filename={`top-items-${isoDate(range.from)}_${isoDate(range.to)}.csv`}
          headers={["name", "qty", "revenue"]}
          rows={rows.map((r) => [r.name, r.qty, r.revenue.toString()])}
        />
      </div>

      <Card>
        <CardContent className="pt-6">
          <ReportFilters current={{ from: sp.from ?? "", to: sp.to ?? "" }} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ranked by revenue</CardTitle>
          <CardDescription>Limit: {limit}.</CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No items sold in this range.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="px-2 py-1">#</th>
                  <th className="px-2 py-1">Item</th>
                  <th className="px-2 py-1 text-right">Qty</th>
                  <th className="px-2 py-1 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.menuItemId} className="border-b">
                    <td className="px-2 py-1 text-muted-foreground">{i + 1}</td>
                    <td className="px-2 py-1 font-medium">{r.name}</td>
                    <td className="px-2 py-1 text-right font-mono">{r.qty}</td>
                    <td className="px-2 py-1 text-right font-mono">{formatIDR(r.revenue)}</td>
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
