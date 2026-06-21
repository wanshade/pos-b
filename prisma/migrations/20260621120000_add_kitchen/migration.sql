-- Migration: add_kitchen
-- Adds the KITCHEN role, a KitchenStatus lifecycle on Order, and kitchen
-- timestamps. Existing orders default to kitchenStatus = 'NONE'.

-- Role enum gains KITCHEN (SQLite stores enums as TEXT, so no DDL needed).

-- AlterTable: add kitchen columns to Order.
ALTER TABLE "Order" ADD COLUMN "kitchenStatus" TEXT NOT NULL DEFAULT 'NONE';
ALTER TABLE "Order" ADD COLUMN "kitchenQueuedAt" DATETIME;
ALTER TABLE "Order" ADD COLUMN "kitchenPreparingAt" DATETIME;
ALTER TABLE "Order" ADD COLUMN "kitchenReadyAt" DATETIME;
ALTER TABLE "Order" ADD COLUMN "kitchenServedAt" DATETIME;

-- CreateIndex
CREATE INDEX "Order_kitchenStatus_paidAt_idx" ON "Order"("kitchenStatus", "paidAt");
