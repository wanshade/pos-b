-- Migration: add_modifier
-- Creates the Modifier table for add-on options grouped by groupName
-- (e.g. "Toppings" → [Cinnamon, Chocolate], "Milk" → [Whole, Oat, Soy]).

-- CreateTable
CREATE TABLE "Modifier" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "menuItemId" TEXT NOT NULL,
    "groupName" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceDelta" DECIMAL NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Modifier_menuItemId_fkey" FOREIGN KEY ("menuItemId") REFERENCES "MenuItem" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Modifier_menuItemId_groupName_sortOrder_idx" ON "Modifier"("menuItemId", "groupName", "sortOrder");
