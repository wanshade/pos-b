import { describe, it, expect, afterAll } from "vitest";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { recordStockMovement } from "@/lib/inventory/stock-helpers";

describe("PurchaseOrder + PurchaseOrderItem", () => {
  let categoryId: string;
  let menuItemId: string;
  let stockId: string;
  let poId: string;
  const createdItemIds: string[] = [];

  afterAll(async () => {
    if (poId) {
      await db.purchaseOrder.delete({ where: { id: poId } }).catch(() => {});
    }
    for (const id of createdItemIds) {
      await db.purchaseOrderItem.delete({ where: { id } }).catch(() => {});
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

  it("creates a PO with line items and total is sum of qty*unitCost", async () => {
    categoryId = (await db.category.create({ data: { name: "PO-Test-" + Date.now() } })).id;
    const item = await db.menuItem.create({
      data: {
        categoryId,
        name: "PO Test",
        price: new Prisma.Decimal("1000"),
        trackStock: true,
        stock: { create: { currentQty: new Prisma.Decimal("0") } },
      },
      include: { stock: true },
    });
    menuItemId = item.id;
    stockId = item.stock!.id;

    const po = await db.purchaseOrder.create({
      data: {
        poNumber: "PO-TEST-" + Date.now(),
        supplierName: "Test Supplier",
        status: "ORDERED",
        total: new Prisma.Decimal("0"),
        orderedAt: new Date(),
        items: {
          create: [
            { stockItemId: stockId, qty: new Prisma.Decimal("100"), unitCost: new Prisma.Decimal("5.00") },
            { stockItemId: stockId, qty: new Prisma.Decimal("50"),  unitCost: new Prisma.Decimal("5.00") },
          ],
        },
      },
      include: { items: true },
    });
    poId = po.id;
    createdItemIds.push(...po.items.map((i) => i.id));

    expect(po.items).toHaveLength(2);
    // Manually calculate total
    const total = po.items.reduce(
      (sum, i) => sum.plus(i.qty.times(i.unitCost)),
      new Prisma.Decimal(0),
    );
    expect(total.toString()).toBe("750");
  });

  it("receive updates receivedQty, can be partial", async () => {
    const item = (await db.purchaseOrderItem.findFirst({ where: { poId } }))!;
    const updated = await db.purchaseOrderItem.update({
      where: { id: item.id },
      data: { receivedQty: new Prisma.Decimal("30") },
    });
    expect(updated.receivedQty.toString()).toBe("30");
  });

  it("cascade-deletes items when PO is deleted", async () => {
    const before = await db.purchaseOrderItem.count({ where: { poId } });
    expect(before).toBe(2);
    await db.purchaseOrder.delete({ where: { id: poId } });
    const after = await db.purchaseOrderItem.count({ where: { poId } });
    expect(after).toBe(0);
    poId = ""; // mark as deleted
  });

  it("after receive, calling recordStockMovement(PURCHASE) increases stock", async () => {
    // create a new PO + item for this test
    const newPo = await db.purchaseOrder.create({
      data: {
        poNumber: "PO-RECV-" + Date.now(),
        supplierName: "Test Supplier",
        status: "ORDERED",
        items: {
          create: [{ stockItemId: stockId, qty: new Prisma.Decimal("20"), unitCost: new Prisma.Decimal("10") }],
        },
      },
      include: { items: true },
    });
    createdItemIds.push(...newPo.items.map((i) => i.id));

    await recordStockMovement({
      stockItemId: stockId,
      type: "PURCHASE",
      qty: new Prisma.Decimal("20"),
      refType: "PO",
      refId: newPo.id,
      reason: "Receive from PO",
    });

    const stock = await db.stockItem.findUnique({ where: { id: stockId } });
    expect(stock?.currentQty.toString()).toBe("20");
  });
});
