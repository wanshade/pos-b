-- Migration: add_menu_item
-- Creates the MenuItem table with FK to Category (restrict on delete).

-- CreateTable
CREATE TABLE "MenuItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT,
    "barcode" TEXT,
    "price" DECIMAL NOT NULL,
    "cost" DECIMAL NOT NULL DEFAULT 0,
    "imageUrl" TEXT,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "trackStock" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MenuItem_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "MenuItem_sku_key" ON "MenuItem"("sku") WHERE "sku" IS NOT NULL;
CREATE UNIQUE INDEX "MenuItem_barcode_key" ON "MenuItem"("barcode") WHERE "barcode" IS NOT NULL;
CREATE INDEX "MenuItem_categoryId_isAvailable_sortOrder_idx" ON "MenuItem"("categoryId", "isAvailable", "sortOrder");
CREATE INDEX "MenuItem_isAvailable_idx" ON "MenuItem"("isAvailable");
