import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportFilters } from "@/components/reports/report-filters";
import { CsvButton } from "@/components/reports/csv-button";
import { stockSummary, rangeFromParams, isoDate } from "@/lib/reports/aggregations";
import { formatIDR } from "@/lib/money";

export const metadata = { title: "Stock summary — POS App" };
export const dynamic = "force-dynamic";

export default async function StockSummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await requireRole(["MANAGER", "ADMIN"]);
  const sp = await searchParams;
  const range = rangeFromParams(sp.from, sp.to);
  const rows = await stockSummary(range);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Stock summary</h1>
          <p className="text-sm text-muted-foreground">
            In/out totals per tracked item in this range.
          </p>
        </div>
        <CsvButton
          filename={`stock-summary-${isoDate(range.from)}_${isoDate(range.to)}.csv`}
          headers={["name", "unit", "currentQty", "totalIn", "totalOut"]}
          rows={rows.map((r) => [r.name, r.unit, r.currentQty.toString(), r.totalIn.toString(), r.totalOut.toString()])}
        />
      </div>

      <Card>
        <CardContent className="pt-6">
          <ReportFilters current={{ from: sp.from ?? "", to: sp.to ?? "" }} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Per item</CardTitle>
          <CardDescription>Current qty is the latest; in/out are summed in this range.</CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No tracked items.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="px-2 py-1">Item</th>
                  <th className="px-2 py-1 text-right">Current</th>
                  <th className="px-2 py-1 text-right">In (range)</th>
                  <th className="px-2 py-1 text-right">Out (range)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.stockItemId} className="border-b">
                    <td className="px-2 py-1 font-medium">{r.name} <span className="text-xs text-muted-foreground">({r.unit})</span></td>
                    <td className="px-2 py-1 text-right font-mono">{r.currentQty.toString()}</td>
                    <td className="px-2 py-1 text-right font-mono text-emerald-600 dark:text-emerald-400">+{r.totalIn.toString()}</td>
                    <td className="px-2 py-1 text-right font-mono text-red-600 dark:text-red-400">-{r.totalOut.toString()}</td>
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
