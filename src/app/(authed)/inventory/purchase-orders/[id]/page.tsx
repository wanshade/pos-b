import Link from "next/link";
import { notFound } from "next/navigation";
import type { Role } from "@prisma/client";
import { PrinterIcon, TrashIcon } from "lucide-react";
import { db } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ReceiveForm } from "./receive-form";
import { DeletePOButton } from "./delete-po-button";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const po = await db.purchaseOrder.findUnique({ where: { id } });
  return { title: po ? `${po.poNumber} — POS App` : "PO — POS App" };
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT:     "bg-zinc-100 text-zinc-800",
  ORDERED:   "bg-blue-100 text-blue-900",
  PARTIAL:   "bg-amber-100 text-amber-900",
  RECEIVED:  "bg-emerald-100 text-emerald-900",
  CANCELLED: "bg-red-100 text-red-900",
};

export default async function PODetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAuth();
  const role: Role = (session.user as { role?: Role }).role ?? "KASIR";
  const isAdmin = role === "ADMIN";
  const { id } = await params;
  const po = await db.purchaseOrder.findUnique({
    where: { id },
    include: {
      items: { include: { stockItem: { include: { menuItem: { select: { name: true } } } } } },
      createdBy: { select: { name: true } },
    },
  });
  if (!po) notFound();

  if (!isAdmin && role !== "MANAGER") {
    notFound();
  }

  const canDelete = isAdmin && (po.status === "DRAFT" || po.status === "CANCELLED" || po.status === "ORDERED");

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-mono text-2xl font-semibold tracking-tight">{po.poNumber}</h1>
            <span className={`rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[po.status] ?? ""}`}>
              {po.status}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Supplier: {po.supplierName} · Created {po.createdAt.toLocaleDateString()}
            {po.createdBy && ` by ${po.createdBy.name}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/inventory/purchase-orders/${po.id}/print`} target="_blank" />}>
            <PrinterIcon className="size-4" /> Print PO
          </Button>
          {canDelete && <DeletePOButton poId={po.id} poNumber={po.poNumber} />}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Supplier</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">Name</dt>
              <dd>{po.supplierName}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Contact</dt>
              <dd>{po.supplierContact ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Phone</dt>
              <dd>{po.supplierPhone ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd>{po.supplierEmail ?? "—"}</dd>
            </div>
            {po.supplierAddress && (
              <div className="col-span-2 sm:col-span-4">
                <dt className="text-muted-foreground">Address</dt>
                <dd>{po.supplierAddress}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">Total</dt>
              <dd className="font-mono">Rp {Number(po.total).toLocaleString("id-ID")}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Lines</dt>
              <dd>{po.items.length}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Ordered at</dt>
              <dd>{po.orderedAt ? po.orderedAt.toLocaleString() : "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Received at</dt>
              <dd>{po.receivedAt ? po.receivedAt.toLocaleString() : "—"}</dd>
            </div>
          </dl>
          {po.notes && (
            <p className="mt-3 text-sm">
              <span className="text-muted-foreground">Notes: </span>
              {po.notes}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Line items</CardTitle>
          <CardDescription>Enter quantities to receive. Each entry creates a PURCHASE stock movement.</CardDescription>
        </CardHeader>
        <CardContent>
          <ReceiveForm
            poId={po.id}
            poStatus={po.status}
            lines={po.items.map((it) => ({
              id: it.id,
              itemName: it.stockItem.menuItem.name,
              qty: it.qty.toString(),
              receivedQty: it.receivedQty.toString(),
              unitCost: it.unitCost.toString(),
              unit: it.stockItem.unit,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
