import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ReportFilters } from "@/components/reports/report-filters";
import { CsvMultiButton } from "@/components/reports/csv-button";
import { financeSummary, rangeFromParams, isoDate } from "@/lib/reports/aggregations";
import { formatIDR } from "@/lib/money";
import {
  TrendingUpIcon,
  ReceiptIcon,
  DollarSignIcon,
  PercentIcon,
  TagIcon,
  PackageIcon,
  XCircleIcon,
  Undo2Icon,
  CreditCardIcon,
  WalletIcon,
  SmartphoneIcon,
  BanknoteIcon,
  ArrowLeftRightIcon,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Finance — POS App" };
export const dynamic = "force-dynamic";

const PAYMENT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  CASH: BanknoteIcon,
  CARD: CreditCardIcon,
  EWALLET: WalletIcon,
  QRIS: SmartphoneIcon,
  TRANSFER: ArrowLeftRightIcon,
  SPLIT: ArrowLeftRightIcon,
};

const PAYMENT_LABELS: Record<string, string> = {
  CASH: "Cash",
  CARD: "Card",
  EWALLET: "E-Wallet",
  QRIS: "QRIS",
  TRANSFER: "Transfer",
  SPLIT: "Split",
};

function SummaryCard({
  label,
  value,
  icon: Icon,
  variant,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  variant?: "positive" | "negative" | "neutral";
}) {
  const color =
    variant === "positive"
      ? "text-emerald-600 dark:text-emerald-400"
      : variant === "negative"
        ? "text-red-600 dark:text-red-400"
        : "text-foreground";

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex size-9 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
        <Icon className="size-4.5" />
      </div>
      <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className={`mt-1.5 text-xl font-bold tracking-tight ${color}`}>
        {value}
      </p>
    </div>
  );
}

export default async function FinanceReportPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  await requireRole(["MANAGER", "ADMIN"]);
  const sp = await searchParams;
  const range = rangeFromParams(sp.from, sp.to);
  const data = await financeSummary(range);

  const hasData = data.paidOrders > 0;

  const summaryCsvRows: (string | number)[][] = [
    ["Total Revenue", data.totalRevenue.toString()],
    ["Total Tax", data.totalTax.toString()],
    ["Total Discount", data.totalDiscount.toString()],
    ["COGS", data.totalCost.toString()],
    ["Gross Profit", data.grossProfit.toString()],
    ["Paid Orders", data.paidOrders],
    ["Voided Orders", data.voidedOrders],
    ["Refunded Orders", data.refundedOrders],
    ["Refunded Amount", data.refundedAmount.toString()],
    ["Avg Order Value", data.avgOrderValue.toString()],
  ];

  const paymentCsvRows = data.byPaymentMethod.map((p) => [
    p.method,
    p.count,
    p.amount.toString(),
  ]);

  const dailyCsvRows = data.daily.map((d) => [
    d.date,
    d.orders,
    d.revenue.toString(),
    d.tax.toString(),
    d.discount.toString(),
    d.cost.toString(),
    d.profit.toString(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Finance</h1>
          <p className="text-sm text-muted-foreground">
            Accounting overview · {isoDate(range.from)} to {isoDate(range.to)}
          </p>
        </div>
        <CsvMultiButton
          filename={`finance-report-${isoDate(range.from)}_${isoDate(range.to)}.csv`}
          sections={[
            {
              title: "Summary",
              headers: ["metric", "value"],
              rows: summaryCsvRows,
            },
            {
              title: "Payment Methods",
              headers: ["method", "count", "amount"],
              rows: paymentCsvRows,
            },
            {
              title: "Daily Breakdown",
              headers: ["date", "orders", "revenue", "tax", "discount", "cogs", "profit"],
              rows: dailyCsvRows,
            },
          ]}
        />
      </div>

      <Card>
        <CardContent className="pt-6">
          <ReportFilters current={{ from: sp.from ?? "", to: sp.to ?? "" }} />
        </CardContent>
      </Card>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <SummaryCard
          label="Total Revenue"
          value={formatIDR(data.totalRevenue)}
          icon={TrendingUpIcon}
          variant="positive"
        />
        <SummaryCard
          label="COGS"
          value={formatIDR(data.totalCost)}
          icon={PackageIcon}
        />
        <SummaryCard
          label="Gross Profit"
          value={formatIDR(data.grossProfit)}
          icon={DollarSignIcon}
          variant={data.grossProfit.gte(0) ? "positive" : "negative"}
        />
        <SummaryCard
          label="Avg Order"
          value={formatIDR(data.avgOrderValue)}
          icon={ReceiptIcon}
        />
        <SummaryCard
          label="Tax Collected"
          value={formatIDR(data.totalTax)}
          icon={PercentIcon}
        />
        <SummaryCard
          label="Discounts Given"
          value={formatIDR(data.totalDiscount)}
          icon={TagIcon}
          variant="negative"
        />
        <SummaryCard
          label="Voided Orders"
          value={String(data.voidedOrders)}
          icon={XCircleIcon}
          variant={data.voidedOrders > 0 ? "negative" : "neutral"}
        />
        <SummaryCard
          label="Refunded Amount"
          value={formatIDR(data.refundedAmount)}
          icon={Undo2Icon}
          variant={data.refundedAmount.gt(0) ? "negative" : "neutral"}
        />
      </div>

      {/* Payment method breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Methods</CardTitle>
          <CardDescription>Revenue breakdown by payment method.</CardDescription>
        </CardHeader>
        <CardContent>
          {!hasData || data.byPaymentMethod.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payments in this range.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="px-2 py-2">Method</th>
                  <th className="px-2 py-2 text-right">Transactions</th>
                  <th className="px-2 py-2 text-right">Amount</th>
                  <th className="px-2 py-2 text-right">% of Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.byPaymentMethod.map((p) => {
                  const Icon = PAYMENT_ICONS[p.method] ?? ReceiptIcon;
                  const pct = data.totalRevenue.gt(0)
                    ? p.amount.dividedBy(data.totalRevenue).times(100).toNumber().toFixed(1)
                    : "0";
                  return (
                    <tr key={p.method} className="border-b">
                      <td className="px-2 py-2">
                        <div className="flex items-center gap-2">
                          <Icon className="size-4 text-muted-foreground" />
                          <span className="font-medium">{PAYMENT_LABELS[p.method] ?? p.method}</span>
                        </div>
                      </td>
                      <td className="px-2 py-2 text-right">{p.count}</td>
                      <td className="px-2 py-2 text-right font-mono font-semibold">{formatIDR(p.amount)}</td>
                      <td className="px-2 py-2 text-right text-muted-foreground">{pct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Daily breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Breakdown</CardTitle>
          <CardDescription>Revenue, tax, COGS, and profit per day.</CardDescription>
        </CardHeader>
        <CardContent>
          {!hasData ? (
            <p className="text-sm text-muted-foreground">No paid orders in this range.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="px-2 py-2">Date</th>
                    <th className="px-2 py-2 text-right">Orders</th>
                    <th className="px-2 py-2 text-right">Revenue</th>
                    <th className="px-2 py-2 text-right">Tax</th>
                    <th className="px-2 py-2 text-right">Discount</th>
                    <th className="px-2 py-2 text-right">COGS</th>
                    <th className="px-2 py-2 text-right">Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {data.daily.map((d) => (
                    <tr key={d.date} className="border-b">
                      <td className="px-2 py-2">
                        {new Date(d.date + "T00:00:00").toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-2 py-2 text-right">{d.orders}</td>
                      <td className="px-2 py-2 text-right font-mono">{formatIDR(d.revenue)}</td>
                      <td className="px-2 py-2 text-right font-mono text-muted-foreground">{formatIDR(d.tax)}</td>
                      <td className="px-2 py-2 text-right font-mono text-amber-600 dark:text-amber-400">{formatIDR(d.discount)}</td>
                      <td className="px-2 py-2 text-right font-mono text-muted-foreground">{formatIDR(d.cost)}</td>
                      <td className={"px-2 py-2 text-right font-mono font-semibold " + (d.profit.gte(0) ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                        {formatIDR(d.profit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 font-bold">
                    <td className="px-2 py-2">Total</td>
                    <td className="px-2 py-2 text-right">{data.paidOrders}</td>
                    <td className="px-2 py-2 text-right font-mono">{formatIDR(data.totalRevenue)}</td>
                    <td className="px-2 py-2 text-right font-mono">{formatIDR(data.totalTax)}</td>
                    <td className="px-2 py-2 text-right font-mono text-amber-600 dark:text-amber-400">{formatIDR(data.totalDiscount)}</td>
                    <td className="px-2 py-2 text-right font-mono">{formatIDR(data.totalCost)}</td>
                    <td className={"px-2 py-2 text-right font-mono " + (data.grossProfit.gte(0) ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                      {formatIDR(data.grossProfit)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Net P&L card */}
      <Card>
        <CardHeader>
          <CardTitle>Profit &amp; Loss Summary</CardTitle>
          <CardDescription>Net financial position for the selected period.</CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between border-b pb-2">
              <dt className="text-muted-foreground">Gross Revenue</dt>
              <dd className="font-mono font-semibold">{formatIDR(data.totalRevenue)}</dd>
            </div>
            <div className="flex items-center justify-between border-b pb-2 text-amber-600 dark:text-amber-400">
              <dt>Less: Discounts</dt>
              <dd className="font-mono">-{formatIDR(data.totalDiscount)}</dd>
            </div>
            <div className="flex items-center justify-between border-b pb-2">
              <dt className="text-muted-foreground">Add: Tax Collected</dt>
              <dd className="font-mono">{formatIDR(data.totalTax)}</dd>
            </div>
            <div className="flex items-center justify-between border-b pb-2 text-muted-foreground">
              <dt>Less: COGS</dt>
              <dd className="font-mono">-{formatIDR(data.totalCost)}</dd>
            </div>
            <div className="flex items-center justify-between pt-1">
              <dt className="text-base font-bold">Net Profit</dt>
              <dd className={"font-mono text-base font-bold " + (data.netProfit.gte(0) ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400")}>
                {formatIDR(data.netProfit)}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
