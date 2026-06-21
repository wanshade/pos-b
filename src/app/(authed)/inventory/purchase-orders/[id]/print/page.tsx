import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { formatIDR } from "@/lib/money";
import { PrintButton } from "./print-button";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const po = await db.purchaseOrder.findUnique({ where: { id } });
  return { title: po ? `Print ${po.poNumber}` : "Print PO" };
}

export default async function POPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireRole(["ADMIN", "MANAGER"]);
  const { id } = await params;
  const [po, outlet] = await Promise.all([
    db.purchaseOrder.findUnique({
      where: { id },
      include: {
        items: { include: { stockItem: { include: { menuItem: { select: { name: true } } } } } },
        createdBy: { select: { name: true } },
      },
    }),
    db.outlet.findFirst({ orderBy: { createdAt: "asc" } }),
  ]);
  if (!po) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4">
      <div className="no-print flex items-center justify-between">
        <Link href={`/inventory/purchase-orders/${po.id}`} className="text-sm text-primary hover:underline">
          ← Back to PO
        </Link>
        <PrintButton auto />
      </div>

      <div id="po-print" className="space-y-6 rounded-md border bg-white p-6 text-sm">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="text-lg font-semibold">{outlet?.name ?? "Purchase Order"}</div>
            {outlet?.address && <div className="text-xs text-muted-foreground">{outlet.address}</div>}
            {outlet?.phone && <div className="text-xs text-muted-foreground">{outlet.phone}</div>}
          </div>
          <div className="text-right">
            <div className="text-xl font-bold tracking-tight">PURCHASE ORDER</div>
            <div className="font-mono">{po.poNumber}</div>
            <div className="text-xs">Status: {po.status}</div>
          </div>
        </div>

        {/* Supplier + meta */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Supplier</div>
            <div className="font-medium">{po.supplierName}</div>
            {po.supplierContact && <div>{po.supplierContact}</div>}
            {po.supplierPhone && <div>{po.supplierPhone}</div>}
            {po.supplierEmail && <div>{po.supplierEmail}</div>}
            {po.supplierAddress && <div className="text-xs">{po.supplierAddress}</div>}
          </div>
          <div className="text-right">
            <div><span className="text-muted-foreground">Created: </span>{po.createdAt.toLocaleDateString()}</div>
            <div><span className="text-muted-foreground">Ordered: </span>{po.orderedAt ? po.orderedAt.toLocaleDateString() : "—"}</div>
            <div><span className="text-muted-foreground">Received: </span>{po.receivedAt ? po.receivedAt.toLocaleDateString() : "—"}</div>
            {po.createdBy && <div><span className="text-muted-foreground">By: </span>{po.createdBy.name}</div>}
          </div>
        </div>

        {/* Line items */}
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border px-2 py-1 text-left">#</th>
              <th className="border px-2 py-1 text-left">Item</th>
              <th className="border px-2 py-1 text-right">Qty</th>
              <th className="border px-2 py-1 text-right">Unit cost</th>
              <th className="border px-2 py-1 text-right">Line total</th>
            </tr>
          </thead>
          <tbody>
            {po.items.map((it, idx) => (
              <tr key={it.id}>
                <td className="border px-2 py-1">{idx + 1}</td>
                <td className="border px-2 py-1">{it.stockItem.menuItem.name}</td>
                <td className="border px-2 py-1 text-right">{it.qty.toString()} {it.stockItem.unit}</td>
                <td className="border px-2 py-1 text-right">{formatIDR(it.unitCost)}</td>
                <td className="border px-2 py-1 text-right">{formatIDR(it.qty.times(it.unitCost))}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="border px-2 py-1 text-right font-semibold" colSpan={4}>Total</td>
              <td className="border px-2 py-1 text-right font-semibold">{formatIDR(po.total)}</td>
            </tr>
          </tfoot>
        </table>

        {po.notes && (
          <div>
            <div className="text-xs font-semibold uppercase text-muted-foreground">Notes</div>
            <div>{po.notes}</div>
          </div>
        )}

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-6 pt-8">
          <div className="text-center">
            <div className="mb-10 border-b border-black" />
            <div className="text-xs">Prepared by</div>
          </div>
          <div className="text-center">
            <div className="mb-10 border-b border-black" />
            <div className="text-xs">Approved by</div>
          </div>
        </div>
      </div>
    </div>
  );
}
