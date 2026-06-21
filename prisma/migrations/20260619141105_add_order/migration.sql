-- Migration: add_order
-- Adds Order/OrderItem/OrderItemModifier/Payment tables + their enums.
-- Plus back-relations on User, MenuItem, MenuVariant, Modifier, Shift.

-- OrderStatus: DRAFT, HELD, PAID, VOIDED, REFUNDED
-- OrderType: DINE_IN, TAKEOUT, DELIVERY
-- PaymentMethod: CASH, CARD, EWALLET, QRIS, TRANSFER, SPLIT

-- CreateTable: Order
CREATE TABLE "Order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderNumber" TEXT NOT NULL,
    "shiftId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "type" TEXT NOT NULL DEFAULT 'DINE_IN',
    "subtotal" DECIMAL NOT NULL DEFAULT 0,
    "discount" DECIMAL NOT NULL DEFAULT 0,
    "tax" DECIMAL NOT NULL DEFAULT 0,
    "total" DECIMAL NOT NULL DEFAULT 0,
    "customerName" TEXT,
    "customerId" TEXT,
    "discountCode" TEXT,
    "notes" TEXT,
    "voidReason" TEXT,
    "refundReason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" DATETIME,
    "voidedAt" DATETIME,
    "refundedAt" DATETIME,
    CONSTRAINT "Order_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "Shift" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable: OrderItem
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "menuItemId" TEXT NOT NULL,
    "variantId" TEXT,
    "nameSnapshot" TEXT NOT NULL,
    "variantNameSnapshot" TEXT,
    "qty" INTEGER NOT NULL,
    "unitPrice" DECIMAL NOT NULL,
    "discount" DECIMAL NOT NULL DEFAULT 0,
    "lineTotal" DECIMAL NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "MenuVariant" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable: OrderItemModifier
CREATE TABLE "OrderItemModifier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderItemId" TEXT NOT NULL,
    "modifierId" TEXT NOT NULL,
    "groupNameSnapshot" TEXT NOT NULL,
    "nameSnapshot" TEXT NOT NULL,
    "priceDelta" DECIMAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderItemModifier_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderItemModifier_modifierId_fkey" FOREIGN KEY ("modifierId") REFERENCES "Modifier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable: Payment
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "amount" DECIMAL NOT NULL,
    "reference" TEXT,
    "paidAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Payment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");
CREATE INDEX "Order_shiftId_status_idx" ON "Order"("shiftId", "status");
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX "OrderItem_menuItemId_idx" ON "OrderItem"("menuItemId");
CREATE INDEX "OrderItemModifier_orderItemId_idx" ON "OrderItemModifier"("orderItemId");
CREATE INDEX "Payment_orderId_idx" ON "Payment"("orderId");
