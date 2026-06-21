-- Migration: add_stock_item
-- Creates the StockItem table (1:1 with MenuItem) for tracking inventory.

-- CreateTable
CREATE TABLE "StockItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "menuItemId" TEXT NOT NULL,
    "currentQty" DECIMAL NOT NULL DEFAULT 0,
    "minQty" DECIMAL NOT NULL DEFAULT 0,
    "maxQty" DECIMAL NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT 'pcs',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "StockItem_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "StockItem_menuItemId_key" ON "StockItem"("menuItemId");
CREATE INDEX "StockItem_menuItemId_idx" ON "StockItem"("menuItemId");
