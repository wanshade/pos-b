-- Migration: add_menu_variant
-- Creates the MenuVariant table for size/portion options (e.g. "Small", "Large")
-- with a price delta that can be negative.

-- CreateTable
CREATE TABLE "MenuVariant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "menuItemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceDelta" DECIMAL NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MenuVariant_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "MenuVariant_menuItemId_sortOrder_idx" ON "MenuVariant"("menuItemId", "sortOrder");
