-- Migration: inline_supplier_drop_supplier_table
-- Replaces the PurchaseOrder.supplierId FK with inline supplier detail
-- columns, backfills them from the existing Supplier rows, then drops the
-- Supplier table entirely.

PRAGMA foreign_keys=OFF;

-- 1. Rebuild PurchaseOrder with inline supplier columns.
CREATE TABLE "new_PurchaseOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "poNumber" TEXT NOT NULL,
    "supplierName" TEXT NOT NULL DEFAULT '',
    "supplierContact" TEXT,
    "supplierPhone" TEXT,
    "supplierEmail" TEXT,
    "supplierAddress" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "total" DECIMAL NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdById" TEXT,
    "orderedAt" DATETIME,
    "receivedAt" DATETIME,
    "cancelledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PurchaseOrder_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- 2. Copy existing POs, backfilling supplier detail from the Supplier table.
INSERT INTO "new_PurchaseOrder" (
    "id", "poNumber", "supplierName", "supplierContact", "supplierPhone",
    "supplierEmail", "supplierAddress", "status", "total", "notes",
    "createdById", "orderedAt", "receivedAt", "cancelledAt", "createdAt", "updatedAt"
)
SELECT
    po."id",
    po."poNumber",
    COALESCE(s."name", 'Unknown supplier'),
    s."contactName",
    s."phone",
    s."email",
    s."address",
    po."status",
    po."total",
    po."notes",
    po."createdById",
    po."orderedAt",
    po."receivedAt",
    po."cancelledAt",
    po."createdAt",
    po."updatedAt"
FROM "PurchaseOrder" po
LEFT JOIN "Supplier" s ON s."id" = po."supplierId";

DROP TABLE "PurchaseOrder";
ALTER TABLE "new_PurchaseOrder" RENAME TO "PurchaseOrder";

CREATE UNIQUE INDEX "PurchaseOrder_poNumber_key" ON "PurchaseOrder"("poNumber");
CREATE INDEX "PurchaseOrder_status_createdAt_idx" ON "PurchaseOrder"("status", "createdAt");

-- 3. Drop the Supplier table.
DROP TABLE "Supplier";

PRAGMA foreign_keys=ON;
