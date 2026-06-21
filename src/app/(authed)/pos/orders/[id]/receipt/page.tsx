import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { ReceiptActions } from "./receipt-actions";
import { formatIDR } from "@/lib/money";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const o = await db.order.findUnique({ where: { id } });
  return { title: o ? `Receipt ${o.orderNumber}` : "Receipt" };
}

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuth();
  const { id } = await params;
  const [order, outlet] = await Promise.all([
    db.order.findUnique({
      where: { id },
      include: {
        shift: { include: { user: { select: { name: true } } } },
        items: { include: { modifiers: true }, orderBy: { createdAt: "asc" } },
        payments: { orderBy: { paidAt: "asc" } },
      },
    }),
    db.outlet.findFirst({ orderBy: { createdAt: "asc" } }),
  ]);
  if (!order) notFound();
  if (!outlet) notFound();

  const me = await requireAuth();
  const myId = (me.user as { id?: string }).id;
  const myRole = (me.user as { role?: string }).role;
  const isAdmin = myRole === "ADMIN";
  if (!order.shift || (myRole === "KASIR" && order.shift.userId !== myId)) notFound();

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div className="no-print flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 -ml-2"
          nativeButton={false}
          render={<Link href="/pos/orders" />}
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
          Back to orders
        </Button>
        <ReceiptActions orderId={order.id} status={order.status} isAdmin={isAdmin} />
      </div>

      <Card>
        <CardContent className="space-y-3 p-4 font-mono text-sm" id="receipt">
          <div className="text-center">
            <div className="text-base font-semibold">{outlet.name}</div>
            {outlet.address && <div className="text-xs">{outlet.address}</div>}
            {outlet.phone && <div className="text-xs">{outlet.phone}</div>}
          </div>

          <div className="border-t border-dashed pt-2 text-xs">
            <div>Order: {order.orderNumber}</div>
            <div>Date: {order.createdAt.toLocaleString()}</div>
            <div>Type: {order.type.replace("_", " ")}</div>
            <div>Cashier: {order.shift?.user.name ?? "—"}</div>
            {order.customerName && <div>Customer: {order.customerName}</div>}
          </div>

          <div className="border-t border-dashed pt-2">
            {order.items.map((it) => (
              <div key={it.id} className="space-y-0.5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div>{it.nameSnapshot}{it.variantNameSnapshot ? ` (${it.variantNameSnapshot})` : ""}</div>
                    {it.modifiers.length > 0 && (
                      <div className="pl-2 text-xs">
                        {it.modifiers.map((m) => `+ ${m.nameSnapshot}`).join(", ")}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div>{it.qty} × {formatIDR(it.unitPrice.minus(it.discount))}</div>
                    <div className="font-semibold">{formatIDR(it.lineTotal)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-dashed pt-2 text-xs space-y-0.5">
            <Row label="Subtotal" value={order.subtotal} />
            {Number(order.discount) > 0 && <Row label="Discount" value={order.discount.neg()} negative />}
            <Row label={`Tax (${outlet.taxRate.toString()}%)`} value={order.tax} />
            <div className="flex items-center justify-between border-t border-dashed pt-1 text-base font-semibold">
              <span>TOTAL</span>
              <span>{formatIDR(order.total)}</span>
            </div>
          </div>

          {order.payments.length > 0 && (
            <div className="border-t border-dashed pt-2 text-xs space-y-0.5">
              <div className="font-semibold">Payments</div>
              {order.payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between">
                  <span>{p.method}{p.reference ? ` (${p.reference})` : ""}</span>
                  <span>{formatIDR(p.amount)}</span>
                </div>
              ))}
            </div>
          )}

          {outlet.receiptFooter && (
            <div className="border-t border-dashed pt-2 text-center text-xs">
              {outlet.receiptFooter}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ label, value, negative }: { label: string; value: import("@prisma/client").Prisma.Decimal; negative?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <span>{negative ? `-${formatIDR(value.abs())}` : formatIDR(value)}</span>
    </div>
  );
}