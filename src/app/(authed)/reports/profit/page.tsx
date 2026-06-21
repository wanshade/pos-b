import { requireRole } from "@/lib/session";
import { Prisma } from "@prisma/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CsvButton } from "@/components/reports/csv-button";
import { profitLoss, rangeFromParams, isoDate } from "@/lib/reports/aggregations";
import { formatIDR } from "@/lib/money";
import { ProfitFilters } from "./filters";

export const metadata = { title: "Profit & Loss — POS App" };
export const dynamic = "force-dynamic";

type Bucket = "day" | "week" | "month";

export default async function ProfitLossPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; bucket?: string }>;
}) {
  await requireRole(["ADMIN"]);
  const sp = await searchParams;
  const range = rangeFromParams(sp.from, sp.to);
  const bucket: Bucket = sp.bucket === "week" || sp.bucket === "month" ? sp.bucket : "day";
  const rows = await profitLoss(range, bucket);

  const totalRevenue = rows.reduce((s, r) => s.plus(r.revenue), new Prisma.Decimal(0));
  const totalCost = rows.reduce((s, r) => s.plus(r.cost), new Prisma.Decimal(0));
  const totalProfit = totalRevenue.minus(totalCost);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Profit &amp; Loss</h1>
          <p className="text-sm text-muted-foreground">
            Revenue minus cost basis. Admin only.
          </p>
        </div>
        <CsvButton
          filename={`profit-loss-${bucket}-${isoDate(range.from)}_${isoDate(range.to)}.csv`}
          headers={["period", "revenue", "cost", "profit"]}
          rows={rows.map((r) => [r.period, r.revenue.toString(), r.cost.toString(), r.profit.toString()])}
        />
      </div>

      <Card>
        <CardContent className="pt-6">
          <ProfitFilters current={{ from: sp.from ?? "", to: sp.to ?? "", bucket }} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Totals</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Revenue</dt>
              <dd className="font-mono">{formatIDR(totalRevenue)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Cost</dt>
              <dd className="font-mono">{formatIDR(totalCost)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Profit</dt>
              <dd className={"font-mono " + (totalProfit.gte(0) ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                {formatIDR(totalProfit)}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>By {bucket}</CardTitle>
          <CardDescription>Cost basis = sum of (item.qty × menuItem.cost).</CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No paid orders in this range.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="px-2 py-1">Period</th>
                  <th className="px-2 py-1 text-right">Revenue</th>
                  <th className="px-2 py-1 text-right">Cost</th>
                  <th className="px-2 py-1 text-right">Profit</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.period} className="border-b">
                    <td className="px-2 py-1 font-mono">{r.period}</td>
                    <td className="px-2 py-1 text-right font-mono">{formatIDR(r.revenue)}</td>
                    <td className="px-2 py-1 text-right font-mono">{formatIDR(r.cost)}</td>
                    <td className={"px-2 py-1 text-right font-mono " + (r.profit.gte(0) ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                      {formatIDR(r.profit)}
                    </td>
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
