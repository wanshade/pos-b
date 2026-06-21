-- Migration: add_customer
-- Customer table for POS customer attach (T5.8).

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "points" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" DECIMAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_phone_key" ON "Customer"("phone") WHERE "phone" IS NOT NULL;
CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email") WHERE "email" IS NOT NULL;
CREATE INDEX "Customer_name_idx" ON "Customer"("name");
