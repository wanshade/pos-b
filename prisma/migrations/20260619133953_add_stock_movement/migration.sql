-- Migration: add_stock_movement
-- Creates the StockMovement table for tracking every change to StockItem,
-- plus a movementType enum, plus the User.stockMovements backref.

-- CreateEnum (SQLite: enums are stored as TEXT, declared via Prisma)
-- MovementType: PURCHASE, SALE, ADJUSTMENT, TRANSFER_IN, TRANSFER_OUT, OPNAME

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "stockItemId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "qty" DECIMAL NOT NULL,
    "refType" TEXT,
    "refId" TEXT,
    "reason" TEXT,
    "createdById" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StockMovement_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "StockItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StockMovement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "StockMovement_stockItemId_createdAt_idx" ON "StockMovement"("stockItemId", "createdAt");
CREATE INDEX "StockMovement_refType_refId_idx" ON "StockMovement"("refType", "refId");
CREATE INDEX "StockMovement_createdAt_idx" ON "StockMovement"("createdAt");
