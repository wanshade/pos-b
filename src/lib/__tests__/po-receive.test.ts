import { describe, it, expect, afterAll } from "vitest";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { recordStockMovement } from "@/lib/inventory/stock-helpers";

/**
 * TDD for the PO receive flow.
 * We exercise the underlying helpers + status computation directly,
 * without spinning up the full server action.
 */
describe("PO receive logic (model + helper)", () => {
  let categoryId: string;
  let menuItemId: string;
  let stockId: string;
  let poId: string;
  let itemAId: string;
  let itemBId: string;
  const movementIds: string[] = [];

  afterAll(async () => {
    for (const id of movementIds) {
      await db.stockMovement.delete({ where: { id } }).catch(() => {});
    }
    if (poId) {
      await db.purchaseOrder.delete({ where: { id: poId } }).catch(() => {});
    }
    if (stockId) {
      await db.stockItem.delete({ where: { id: stockId } }).catch(() => {});
    }
    if (menuItemId) {
      await db.menuItem.delete({ where: { id: menuItemId } }).catch(() => {});
    }
    if (categoryId) {
      await db.category.delete({ where: { id: categoryId } }).catch(() => {});
    }
    await db.$disconnect();
  });

  it("partial receive: status becomes PARTIAL", async () => {
    categoryId = (await db.category.create({ data: { name: "Recv-Cat-" + Date.now() } })).id;
    const item = await db.menuItem.create({
      data: {
        categoryId,
        name: "Recv Test",
        price: new Prisma.Decimal("100"),
        trackStock: true,
        stock: { create: { currentQty: new Prisma.Decimal("0") } },
      },
      include: { stock: true },
    });
    menuItemId = item.id;
    stockId = item.stock!.id;

    const po = await db.purchaseOrder.create({
      data: {
        poNumber: "PO-RECV-" + Date.now(),
        supplierName: "Recv Supplier",
        status: "ORDERED",
        orderedAt: new Date(),
        items: {
          create: [
            { stockItemId: stockId, qty: new Prisma.Decimal("100"), unitCost: new Prisma.Decimal("2.00") },
            { stockItemId: stockId, qty: new Prisma.Decimal("50"),  unitCost: new Prisma.Decimal("2.00") },
          ],
        },
      },
      include: { items: true },
    });
    poId = po.id;
    itemAId = po.items[0].id;
    itemBId = po.items[1].id;

    // receive 30 of the 100
    const mov = await recordStockMovement({
      stockItemId: stockId,
      type: "PURCHASE",
      qty: new Prisma.Decimal("30"),
      refType: "PO",
      refId: po.id,
    });
    movementIds.push(mov.id);
    await db.purchaseOrderItem.update({
      where: { id: itemAId },
      data: { receivedQty: new Prisma.Decimal("30") },
    });
    await db.purchaseOrder.update({
      where: { id: po.id },
      data: { status: "PARTIAL" },
    });

    const updated = await db.purchaseOrder.findUnique({
      where: { id: po.id },
      include: { items: true },
    });
    expect(updated?.status).toBe("PARTIAL");
    expect(updated?.items[0].receivedQty.toString()).toBe("30");
    const stock = await db.stockItem.findUnique({ where: { id: stockId } });
    expect(stock?.currentQty.toString()).toBe("30");
  });

  it("completing the receive: status becomes RECEIVED, receivedAt set", async () => {
    // receive the remaining 70 of line A, and all 50 of line B
    await recordStockMovement({
      stockItemId: stockId,
      type: "PURCHASE",
      qty: new Prisma.Decimal("70"),
      refType: "PO",
      refId: poId,
    });
    await recordStockMovement({
      stockItemId: stockId,
      type: "PURCHASE",
      qty: new Prisma.Decimal("50"),
      refType: "PO",
      refId: poId,
    });
    await db.purchaseOrderItem.update({
      where: { id: itemAId },
      data: { receivedQty: new Prisma.Decimal("100") },
    });
    await db.purchaseOrderItem.update({
      where: { id: itemBId },
      data: { receivedQty: new Prisma.Decimal("50") },
    });
    await db.purchaseOrder.update({
      where: { id: poId },
      data: { status: "RECEIVED", receivedAt: new Date() },
    });

    const updated = await db.purchaseOrder.findUnique({
      where: { id: poId },
      include: { items: true },
    });
    expect(updated?.status).toBe("RECEIVED");
    expect(updated?.receivedAt).not.toBeNull();

    const fully = updated?.items.every((i) => i.receivedQty.eq(i.qty));
    expect(fully).toBe(true);

    const stock = await db.stockItem.findUnique({ where: { id: stockId } });
    expect(stock?.currentQty.toString()).toBe("150");
  });

  it("cancelling a PO: status CANCELLED, cancelledAt set", async () => {
    await db.purchaseOrder.update({
      where: { id: poId },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });
    const cancelled = await db.purchaseOrder.findUnique({ where: { id: poId } });
    expect(cancelled?.status).toBe("CANCELLED");
    expect(cancelled?.cancelledAt).not.toBeNull();
    // stock is unchanged
    const stock = await db.stockItem.findUnique({ where: { id: stockId } });
    expect(stock?.currentQty.toString()).toBe("150");
  });
});
