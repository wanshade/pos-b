# Audit & Fix Report — POS App

**Date:** 2026-06-20
**Scope:** Full codebase audit + repair of all failing checks (typecheck, lint, tests, build).

## Summary

The repo arrived with **no dependencies installed** and an **empty database**
(`prisma/dev.db` was 0 bytes), so nothing would build or run. After bootstrapping
the toolchain and migrating/seeding the DB, the baseline had **2 TypeScript
errors, 11 ESLint errors, 6 failing tests, and 2 silent logic bugs**. All are now
fixed; the four verification gates are green:

| Gate | Before | After |
|---|---|---|
| `tsc --noEmit` | 2 errors | ✅ 0 errors |
| `eslint .` | 11 errors, 40 warnings | ✅ 0 errors, 40 warnings |
| `vitest run` | 6 failed / 162 passed | ✅ 168 passed (31 files) |
| `next build` | not runnable | ✅ Compiled successfully |

## Bootstrap steps performed (environment, not code)

1. Installed `pnpm` globally (only `node` v25.7.0 + `npm` were on PATH).
2. `pnpm install` → restored `node_modules` (was missing).
3. `prisma generate` → generated the Prisma client.
4. Copied `.env.example` → `.env` (was missing).
5. `prisma migrate deploy` → applied all 14 migrations (tables did not exist).
6. `pnpm seed` → created admin/manager/kasir users, outlet, categories, menu
   items, demo shift + 5 orders.

> Note: the 58 test failures initially reported were almost all
> `table does not exist` errors caused by the unmigrated DB, not code bugs. Once
> the schema was applied, the real failure count dropped to 6 (cart-store).

---

## Findings & fixes

### 1. CRITICAL — Cart store crashes when `localStorage` is unavailable
**File:** `src/lib/pos/cart-store.ts`

The Zustand `persist` middleware wraps `api.setState` to call
`storage.setItem` on every state change. With no `storage` option supplied, it
defaults to `createJSONStorage(() => localStorage)`. In the Vitest jsdom
environment `globalThis.localStorage` is a **no-op `{}` object** (jsdom only
enables storage when it has an origin/`url`), so `setItem` is `undefined` and
**every cart mutation threw `storage.setItem is not a function`** — 6 failing
tests, and in a browser the whole POS terminal would be unusable the moment a
cashier adds an item (Safari private mode and sandboxed iframes exhibit the same
no-op/throwing `localStorage`).

**Fix:** added a `safeStorage()` factory that probes `window.localStorage` and
falls back to an in-memory `noopStorage` (getItem/setItem/removeItem) when it is
absent or throws, then wired it via `createJSONStorage(safeStorage)`. The cart
now persists when it can and degrades gracefully when it can't.

### 2. CRITICAL — Admin "reset password" silently failed
**File:** `src/app/(authed)/admin/users/actions.ts` (`updateUser`)

`createUser` stores each credential account with `id = randomUUID()` (e.g.
`3800d509-3896-...`). But `updateUser`'s password-reset used:

```ts
upsert: { where: { id: `cred-${before.id}` }, ... }
```

That synthetic `cred-<userId>` id **never matches** the real account, so the
upsert always took the `create` branch — creating a **duplicate** credential
account while leaving the original password untouched. Net effect: **password
resets appeared to succeed but the user could still only log in with the old
password.**

Verified against the seeded admin: account id `3800d509-...` ≠ guessed
`cred-cmqlrkafd...`.

**Fix:** look up the existing credential account by `userId + providerId =
"credential"` and update its password directly; create one only if none exists.
No more duplicate accounts; resets now actually work.

### 3. HIGH — Shift cash reconciliation ignored actual sales
**File:** `src/app/(authed)/shifts/actions.ts` (`closeShiftAction`)

`expectedCash` was hard-coded to `openingCash` with a stale comment ("T5.12 will
compute this from real orders"). Phase 5 (Orders/Payments) shipped long ago, so
this was never wired up. A cashier who sold Rp 500.000 in cash would see a
variance of `closingCash − openingCash` instead of
`closingCash − (openingCash + cashSales)` — making the drawer reconciliation
wrong and the variance meaningless.

**Fix:** `expectedCash = openingCash + SUM(CASH payments on PAID orders in this
shift)`, computed via `db.payment.aggregate`. Voided/refunded orders are
excluded (a void never settled; a refund hands cash back).

### 4. TypeScript errors in test files (2)
- `src/lib/audit/log.ts`: `AuditInput.userId` was typed `string` but the helper
  treats it as `string | null` (auto-detects the session when `null`). Test
  passed `userId: null` → TS2322. Widened the type to `string | null` to match
  the documented behavior.
- `src/lib/__tests__/report-aggregations.test.ts`: used `beforeAll` without
  importing it (TS2304). Added it to the `vitest` import.

### 5. ESLint errors (11)
- `src/app/(authed)/reports/profit/page.tsx`: two `require("@prisma/client")`
  calls (forbidden `@typescript-eslint/no-require-imports`) — replaced with a
  proper `import { Prisma }` and `new Prisma.Decimal(0)`.
- `src/app/(authed)/inventory/page.tsx` + `menu/[id]/edit/page.tsx`: 8
  unescaped `"` in JSX text (`react/no-unescaped-entities`) → escaped as
  `&quot;`.
- `src/lib/__tests__/stock-inventory.test.ts`: `let items` never reassigned
  (`prefer-const`) → `const`.

### 6. Warnings (40, not addressed — non-blocking)
All are `no-unused-vars` / unused imports across pages and tests. They don't
break the build or tests; cleaning them up is safe follow-up work but out of
scope for "make it correct."

---

## Areas audited and found sound

These were reviewed for correctness/role-gating/money-safety and need no change:

- **Money math** (`src/lib/money.ts`, cart `computeLineTotal`, `payOrder`): all
  `Prisma.Decimal`, no floats; totals validated server-side (`paid >= total`).
- **Role gates**: server actions (`requireRole`) and API routes
  (`requireApiRole`) consistently enforce the KASIR/MANAGER/ADMIN matrix
  (menu create=ADMIN, edit=MANAGER+, void/refund=MANAGER+, P&L=ADMIN, etc.).
- **Stock movements** (`recordStockMovement`): transactional, throws on
  insufficient stock, signed-qty convention respected by SALE/void/refund/PO.
- **Stock reversal on void/refund**: correctly adds qty back via `ADJUSTMENT`.
- **Report aggregations**: `salesByDay`/`topItems`/`salesByCashier`/
  `stockSummary`/`profitLoss` correctly filter `status=PAID` + `paidAt` range.

## Known deliberate trade-offs (left as-is, documented in README)

- Stock decrement on payment runs **outside** the order transaction (pragmatic:
  a paid sale with stale stock beats a rolled-back sale).
- Audit logging is **failure-tolerant** (logs to console, never throws).
- `findLowStockItems` fetches all stock rows then filters in JS (SQLite has no
  column-vs-column comparison).

## How to reproduce the green state

```bash
pnpm install
cp .env.example .env            # if .env missing
pnpm prisma generate
pnpm prisma migrate deploy
pnpm seed
pnpm typecheck   # ✅
pnpm lint        # ✅ 0 errors
pnpm test        # ✅ 168 passed
pnpm build       # ✅
```

## Files changed

| File | Change |
|---|---|
| `src/lib/pos/cart-store.ts` | safe-storage fallback for `persist` |
| `src/lib/audit/log.ts` | widen `AuditInput.userId` to `string \| null` |
| `src/lib/__tests__/report-aggregations.test.ts` | import `beforeAll` |
| `src/lib/__tests__/stock-inventory.test.ts` | `let` → `const` |
| `src/app/(authed)/reports/profit/page.tsx` | replace `require()` with import |
| `src/app/(authed)/inventory/page.tsx` | escape `"` in JSX |
| `src/app/(authed)/menu/[id]/edit/page.tsx` | escape `"` in JSX |
| `src/app/(authed)/admin/users/actions.ts` | fix password-reset account lookup |
| `src/app/(authed)/shifts/actions.ts` | compute expectedCash from real cash sales |
