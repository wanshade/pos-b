import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportFilters } from "@/components/reports/report-filters";
import { SalesByDayChart } from "./sales-chart";
import { salesByDay, rangeFromParams, isoDate } from "@/lib/reports/aggregations";
import { CsvButton } from "@/components/reports/csv-button";
import { formatIDR } from "@/lib/money";

export const metadata = { title: "Sales — POS App" };
export const dynamic = "force-dynamic";

export default async function SalesReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await requireRole(["MANAGER", "ADMIN"]);
  const sp = await searchParams;
  const range = rangeFromParams(sp.from, sp.to);
  const rows = await salesByDay(range);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sales</h1>
          <p className="text-sm text-muted-foreground">
            {rows.length} day{rows.length === 1 ? "" : "s"} with paid orders in this range.
          </p>
        </div>
        <CsvButton
          filename={`sales-${isoDate(range.from)}_${isoDate(range.to)}.csv`}
          headers={["date", "orderCount", "total"]}
          rows={rows.map((r) => [r.date, r.orderCount, r.total.toString()])}
        />
      </div>

      <Card>
        <CardContent className="pt-6">
          <ReportFilters
            current={{ from: sp.from ?? "", to: sp.to ?? "" }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Daily sales</CardTitle>
          <CardDescription>Line chart of paid order totals per day.</CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">No paid orders in this range.</p>
          ) : (
            <>
              <SalesByDayChart data={rows.map((r) => ({ date: r.date, orderCount: r.orderCount, total: Number(r.total.toString()) }))} />
              <table className="mt-4 w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="px-2 py-1">Date</th>
                    <th className="px-2 py-1">Orders</th>
                    <th className="px-2 py-1 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.date} className="border-b">
                      <td className="px-2 py-1">
                        {new Date(r.date + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-2 py-1">{r.orderCount}</td>
                      <td className="px-2 py-1 text-right font-mono">{formatIDR(r.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
