import { db } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { formatIDR } from "@/lib/money";
import type { OrderStatus } from "@prisma/client";
import { HugeiconsIcon } from "@hugeicons/react";
import { ReceiptTextIcon } from "@hugeicons/core-free-icons";
import { OrdersTable } from "./orders-table";

export const metadata = { title: "All orders — POS App" };
export const dynamic = "force-dynamic";

const VISIBLE_STATUSES: OrderStatus[] = ["PAID", "VOIDED", "REFUNDED"];

export default async function OrdersPage() {
  const session = await requireAuth();
  const userId = (session.user as { id?: string }).id;
  const role = (session.user as { role?: "ADMIN" | "MANAGER" | "KASIR" }).role ?? "KASIR";
  const isAdmin = role === "ADMIN";

  const where: import("@prisma/client").Prisma.OrderWhereInput =
    role === "KASIR" && userId
      ? { status: { in: VISIBLE_STATUSES }, shift: { userId } }
      : { status: { in: VISIBLE_STATUSES } };

  const orders = await db.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      shift: { include: { user: { select: { name: true } } } },
      _count: { select: { items: true } },
    },
  });

  const paidCount = orders.filter((o) => o.status === "PAID").length;
  const totalRevenue = orders
    .filter((o) => o.status === "PAID")
    .reduce((s, o) => s + Number(o.total), 0);

  const rows = orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    total: o.total.toString(),
    itemCount: o._count.items,
    cashierName: o.shift?.user.name ?? "—",
    customerName: o.customerName ?? null,
    createdAt: o.createdAt.toISOString(),
  }));

  return (
    <div className="mx-auto w-full space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl border border-border bg-muted shrink-0">
          <HugeiconsIcon icon={ReceiptTextIcon} className="size-5 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">All orders</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {orders.length} orders · {paidCount} paid · {formatIDR(totalRevenue)} revenue
          </p>
        </div>
      </div>

      <OrdersTable rows={rows} isAdmin={isAdmin} />
    </div>
  );
}
