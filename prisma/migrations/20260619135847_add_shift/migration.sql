-- Migration: add_shift
-- Creates the Shift table for tracking cashier shifts.

-- ShiftStatus: OPEN, CLOSED

-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "outletId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "openedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" DATETIME,
    "openingCash" DECIMAL NOT NULL DEFAULT 0,
    "closingCash" DECIMAL,
    "expectedCash" DECIMAL,
    "variance" DECIMAL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Shift_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Shift_outletId_fkey" FOREIGN KEY ("outletId") REFERENCES "Outlet" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Shift_userId_openedAt_idx" ON "Shift"("userId", "openedAt");
CREATE INDEX "Shift_outletId_status_openedAt_idx" ON "Shift"("outletId", "status", "openedAt");
CREATE INDEX "Shift_status_openedAt_idx" ON "Shift"("status", "openedAt");
