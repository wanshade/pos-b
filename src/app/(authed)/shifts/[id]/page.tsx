import { notFound } from "next/navigation";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CloseShiftForm } from "./close-form";
import { DeleteShiftButton } from "../all/delete-shift-button";
import { formatIDR } from "@/lib/money";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const shift = await db.shift.findUnique({ where: { id }, include: { user: { select: { name: true } } } });
  return { title: shift ? `Shift · ${shift.user.name}` : "Shift" };
}

export default async function ShiftDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAuth();
  const userId = (session.user as { id?: string }).id;
  const role = (session.user as { role?: "ADMIN" | "MANAGER" | "KASIR" }).role ?? "KASIR";
  const { id } = await params;

  const shift = await db.shift.findUnique({
    where: { id },
    include: { user: { select: { name: true } }, outlet: { select: { name: true } } },
  });
  if (!shift) notFound();

  // KASIR can only see their own shift; manager+ can see all
  if (role === "KASIR" && shift.userId !== userId) notFound();

  const canClose = shift.status === "OPEN" && shift.userId === userId;
  const isAdmin = role === "ADMIN";

  const paymentAgg = await db.payment.aggregate({
    _sum: { amount: true },
    _count: true,
    where: { order: { shiftId: id, status: "PAID" } },
  });
  const cashAgg = await db.payment.aggregate({
    _sum: { amount: true },
    where: { method: "CASH", order: { shiftId: id, status: "PAID" } },
  });
  const nonCashAgg = await db.payment.aggregate({
    _sum: { amount: true },
    where: { method: { not: "CASH" }, order: { shiftId: id, status: "PAID" } },
  });

  const cashSales = cashAgg._sum.amount ?? new Prisma.Decimal(0);
  const nonCashSales = nonCashAgg._sum.amount ?? new Prisma.Decimal(0);
  const totalSales = paymentAgg._sum.amount ?? new Prisma.Decimal(0);
  const liveExpectedCash = shift.openingCash.plus(cashSales);

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">Shift</h1>
            <span className={
              "rounded px-2 py-0.5 text-xs font-medium " +
              (shift.status === "OPEN" ? "bg-emerald-100 text-emerald-900" : "bg-zinc-100 text-zinc-800")
            }>
              {shift.status}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            {shift.user.name} · {shift.outlet.name} · opened {shift.openedAt.toLocaleString()}
            {shift.closedAt && ` · closed ${shift.closedAt.toLocaleString()}`}
          </p>
        </div>
        {isAdmin && (
          <DeleteShiftButton
            shiftId={shift.id}
            userName={shift.user.name}
            openedAt={shift.openedAt.toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
          />
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
          <CardDescription>
            {shift.status === "OPEN"
              ? "Count the drawer, then close to lock this shift."
              : "This shift is closed. No further actions available."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Opening cash</dt>
              <dd className="font-mono">{formatIDR(shift.openingCash)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Total sales</dt>
              <dd className="font-mono">{formatIDR(totalSales)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Cash sales</dt>
              <dd className="font-mono text-emerald-600 dark:text-emerald-400">{formatIDR(cashSales)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Non-cash sales</dt>
              <dd className="font-mono text-blue-600 dark:text-blue-400">{formatIDR(nonCashSales)}</dd>
            </div>
            <div className="border-t border-border pt-2">
              <dt className="text-muted-foreground">Expected cash in drawer</dt>
              <dd className="font-mono font-bold">{formatIDR(liveExpectedCash)}</dd>
            </div>
            {shift.closingCash && (
              <div className="border-t border-border pt-2">
                <dt className="text-muted-foreground">Counted cash</dt>
                <dd className="font-mono">{formatIDR(shift.closingCash)}</dd>
              </div>
            )}
            {shift.variance && (
              <div className={Number(shift.variance) === 0 ? "border-t border-border pt-2" : "border-t border-border pt-2"}>
                <dt className="text-muted-foreground">Variance</dt>
                <dd className={"font-mono font-bold " + (
                  Number(shift.variance) === 0
                    ? "text-muted-foreground"
                    : Number(shift.variance) > 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400"
                )}>
                  {Number(shift.variance) > 0 ? "+" : ""}
                  {formatIDR(shift.variance)}
                </dd>
              </div>
            )}
          </dl>
          {shift.notes && (
            <p className="text-sm">
              <span className="text-muted-foreground">Notes: </span>
              {shift.notes}
            </p>
          )}
        </CardContent>
      </Card>

      {canClose && (
        <Card>
          <CardHeader>
            <CardTitle>Close shift</CardTitle>
            <CardDescription>Enter the amount you counted in the drawer.</CardDescription>
          </CardHeader>
          <CardContent>
            <CloseShiftForm
              shiftId={shift.id}
              openingCash={shift.openingCash.toString()}
              cashSales={cashSales.toString()}
              nonCashSales={nonCashSales.toString()}
              expectedCash={liveExpectedCash.toString()}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
