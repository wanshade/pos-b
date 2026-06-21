# POS App — Kasir / Manager / Admin

A production-grade Point of Sale application built with Next.js 16, Prisma, Better Auth, and shadcn/ui. Three roles (KASIR / MANAGER / ADMIN), full menu + inventory + POS terminal + shifts + reports + admin.

## Tech stack

- **Next.js 16.2** (App Router, RSC, Turbopack) + React 19
- **TypeScript** strict
- **Tailwind CSS v4** + **shadcn/ui** (base-nova preset, Base UI primitives)
- **Prisma 6** + **SQLite** (file-based dev, Postgres-portable schema)
- **Better Auth 1.6** (credentials, role in session)
- **Zustand 5** for the POS cart (localStorage-persisted)
- **TanStack Query** *(installed; not heavily used yet)*
- **React Hook Form** + **Zod** for forms
- **Recharts** for report charts
- **decimal.js** + Prisma.Decimal for money (no floats, ever)
- **Vitest** (168 unit/integration tests, single-fork for SQLite)
- **Playwright** (E2E, requires `pnpm exec playwright install` to run)

## Quick start

```bash
# 1. Install
pnpm install

# 2. Configure env
# .env is already committed with a dev-only secret. Replace in prod.

# 3. Init DB + seed
pnpm prisma migrate deploy   # or `pnpm prisma db push` for dev
pnpm prisma db seed          # creates admin, manager, 2 kasir, items, etc.

# 4. Dev
pnpm dev                    # http://localhost:3000
```

## Default credentials (dev)

| Role    | Email                | Password    |
|---------|----------------------|-------------|
| ADMIN   | admin@pos.local       | admin1234   |
| MANAGER | manager@pos.local     | manager1234 |
| KASIR 1 | kasir1@pos.local     | kasir1234   |
| KASIR 2 | kasir2@pos.local     | kasir1234   |

There's also a sample shift open for `kasir1@pos.local` and 5 sample paid orders, so the dashboard / reports have data immediately after seeding.

## Environment variables (.env)

```
DATABASE_URL="file:./dev.db"            # SQLite file in prisma/
BETTER_AUTH_SECRET="dev-only-..."        # session cookie secret (REPLACE IN PROD)
BETTER_AUTH_URL="http://localhost:3000"  # app base URL
NEXT_PUBLIC_APP_NAME="POS App"           # shown in header
```

## Scripts

| Command | What it does |
|---|---|
| `pnpm dev` | Start the dev server (Turbopack) |
| `pnpm build` | Production build |
| `pnpm start` | Start the production server |
| `pnpm test` | Run all 168 Vitest tests (single-fork) |
| `pnpm test:watch` | Vitest in watch mode |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm seed` | Run the seed script directly |
| `pnpm db:migrate` | `prisma migrate dev` |
| `pnpm db:studio` | Prisma Studio (DB inspector) |
| `pnpm db:generate` | Regenerate Prisma client |
| `pnpm exec playwright test` | Run Playwright E2E (needs `playwright install`) |

## Routes

| Path | Who | What |
|---|---|---|
| `/login` | (anon) | Sign in |
| `/dashboard` | any | Role-specific cards + low-stock banner |
| `/pos` | any | POS terminal (requires open shift) |
| `/pos/holds` | any | Held orders list |
| `/pos/orders/[id]/receipt` | any | Printable receipt |
| `/kitchen` | KITCHEN+ | Kitchen display — prep incoming orders |
| `/menu` | any | Menu list (read-only for KASIR) |
| `/menu/[id]/edit` | MANAGER+ | Edit item + variants + modifiers |
| `/menu/new` | ADMIN | Create item |
| `/menu/categories` | ADMIN | Category CRUD |
| `/inventory` | any | Stock list |
| `/inventory/adjust` | MANAGER+ | Manual stock adjustment |
| `/inventory/movements` | MANAGER+ | Stock movement log |
| `/inventory/opname` | MANAGER+ | Bulk stock count |
| `/inventory/purchase-orders` | MANAGER+ | PO list + create (inline supplier) |
| `/inventory/purchase-orders/[id]` | MANAGER+ | PO detail + receive |
| `/inventory/purchase-orders/[id]/print` | MANAGER+ | Printable PO document |
| `/shifts` | any | My shifts |
| `/shifts/open` | any | Open shift form |
| `/shifts/[id]` | own shift | Shift detail (close) |
| `/shifts/all` | MANAGER+ | All shifts |
| `/reports` | MANAGER+ | Daily sales chart |
| `/reports/items` | MANAGER+ | Top-selling items |
| `/reports/staff` | MANAGER+ | Sales by cashier |
| `/reports/stock` | MANAGER+ | Stock movement summary |
| `/reports/profit` | ADMIN | Revenue − cost (P&L) |
| `/admin/users` | ADMIN | User list + create |
| `/admin/users/[id]/edit` | ADMIN | Edit user |
| `/admin/settings` | ADMIN | Outlet settings |
| `/admin/audit` | ADMIN | Audit log |
| `/api/auth/*` | (anon) | Better Auth catch-all |
| `/api/menu` + `/api/menu/[id]` | role-gated | Menu REST (E2E + integrations) |
| `/api/categories` + `/api/categories/[id]` | role-gated | Category REST |

## Architecture

- **Server components** for every page; **client components** only for
  interactive bits (cart, forms, charts, dialogs).
- **Server actions** for mutations from forms; **route handlers** under
  `/api/*` for E2E and machine-to-machine integrations.
- **Money is Prisma.Decimal everywhere.** `dec()` / `formatIDR()` in
  `src/lib/money.ts`; the form schemas accept decimal strings, the
  server wraps in `new Prisma.Decimal(...)` before storage.
- **POS cart** lives in a Zustand store with localStorage persist
  (`src/lib/pos/cart-store.ts`); "Hold" persists the cart to DB,
  "Resume" reloads it from DB and discards the held row.
- **Stock movements** go through `recordStockMovement()` in
  `src/lib/inventory/stock-helpers.ts` — a transaction that updates
  `StockItem.currentQty` and inserts a `StockMovement` row, throwing
  on insufficient stock.
- **Audit log** via `recordAudit()` in `src/lib/audit/log.ts` — every
  privileged action (user CRUD, void/refund, settings, stock adjust,
  PO create/order/receive/cancel) writes a row.

## Inventory & stock flow

All stock changes flow through a single helper, `recordStockMovement()`
(`src/lib/inventory/stock-helpers.ts`), which in one transaction inserts a
signed `StockMovement` row and updates `StockItem.currentQty`, throwing if
an outbound move would push stock below zero. Movements are tagged with a
`refType` so the movement log can trace where each change came from:

| Source | `type` | `refType` | Sign |
|---|---|---|---|
| POS sale | `SALE` | `Order` | − |
| Void / refund reversal | `ADJUSTMENT` | `Order` | + |
| Manual adjustment (`/inventory/adjust`) | chosen | `Manual` | ± |
| Stock opname (`/inventory/opname`) | `OPNAME` | `Opname` | ± (delta) |
| PO receive | `PURCHASE` | `PO` | + |

### Stock opname

`/inventory/opname` shows a count sheet of every tracked item. You enter
the physical quantity per item (blank = skip). On save, for each changed
row the server records an `OPNAME` movement with the signed delta
(`counted − system`). Counts are validated as non-negative numbers up
front, so one bad row never leaves a half-saved sheet. The batch writes a
single `inventory.opname` audit entry.

### Purchase order lifecycle

POs move through this state machine:

```
DRAFT ──markOrdered──► ORDERED ──receive(partial)──► PARTIAL ──receive(rest)──► RECEIVED
  │                       │                              │
  └────────── cancel ─────┴──────────── cancel ──────────┘
```

- **Create** (`/inventory/purchase-orders`): type the supplier details
  inline (name required; contact, phone, email, address optional), then
  add line items. Any catalog menu item can be ordered — pick the item,
  set qty (> 0) and unit cost (≥ 0). Ordering an item that isn't tracking
  stock yet automatically enables tracking and creates its `StockItem`.
  The total is computed server-side. You can **Save as draft** (status
  `DRAFT`, no stock impact) or **Create & mark ordered** (status
  `ORDERED`). PO numbers are sequential per year: `PO-2026-0001`.
- **Mark as ordered** (detail page): only valid from `DRAFT`; sets
  `orderedAt`.
- **Receive** (detail page): enter the quantity received per line. Each
  line is validated (non-negative, cannot exceed remaining ordered qty)
  before anything is written. Each received line creates a `PURCHASE`
  movement (`refType=PO`) and bumps `receivedQty`. The PO status is then
  recomputed from the persisted lines — `RECEIVED` when every line is
  fully received, otherwise `PARTIAL`. Receiving is blocked on `DRAFT`,
  `RECEIVED`, and `CANCELLED` POs.
- **Print** (`/inventory/purchase-orders/[id]/print`): an A4 document with
  the outlet header, supplier details, the full line-item table (qty,
  unit cost, line total, grand total), notes, and prepared/approved
  signature blocks. Opens the browser print dialog automatically.
- **Cancel**: allowed from `DRAFT`, `ORDERED`, or `PARTIAL`; blocked once
  `RECEIVED`. Cancelling never reverses stock already received.

Supplier details live **inline on each PO** (`supplierName` + optional
contact fields). There is no separate Supplier table — a manager types the
supplier when creating the order.

Every create / order / receive / cancel writes an `inventory.po.*` audit
entry (actor, PO number, status, quantities).

### Who can do what

Purchase orders and stock changes are **MANAGER+** (managers and admins).
Cashiers (KASIR) get a read-only inventory view. The full matrix is below.

## Kitchen display (KDS)

`/kitchen` is a live board for kitchen staff to prep incoming orders. It's
accessible to the **KITCHEN** role plus managers and admins.

- When a cashier completes payment, the order is stamped
  `kitchenStatus = QUEUED` and appears on the board automatically.
- The board has three columns — **Queued → Preparing → Ready** — with the
  oldest order first (FIFO). Each card shows the order number, type,
  customer, every line item (qty, variant, modifiers, item notes), and how
  long it's been in the current stage.
- Staff tap **Start preparing / Mark ready / Mark served** to advance an
  order one step, or the undo button to send it back a step. `SERVED`
  orders leave the board.
- The kitchen lifecycle is independent of payment status and lives in
  `src/lib/kitchen/status.ts` (`QUEUED → PREPARING → READY → SERVED`).
  Transitions are single-step only and validated server-side; every change
  writes a `kitchen.status` audit row. Voiding or refunding an order clears
  its kitchen status so it drops off the board.
- The board auto-refreshes every 15 seconds.

Seeded login: `kitchen@pos.local` / `kitchen1234`.

## Permission matrix

| Capability | KASIR | KITCHEN | MANAGER | ADMIN |
|---|:-:|:-:|:-:|:-:|
| Open/close own shift | ✅ | ❌ | ✅ | ✅ |
| View own shifts | ✅ | ❌ | ✅ | ✅ |
| Take orders / payments | ✅ | ❌ | ✅ | ✅ |
| Kitchen display (prep orders) | ❌ | ✅ | ✅ | ✅ |
| View all shifts | ❌ | ❌ | ✅ | ✅ |
| View menu (read) | ✅ | ❌ | ✅ | ✅ |
| Edit menu | ❌ | ❌ | ✅ | ✅ |
| Categories CRUD | ❌ | ❌ | ❌ | ✅ |
| View stock | ✅ | ❌ | ✅ | ✅ |
| Stock adjustment | ❌ | ❌ | ✅ | ✅ |
| Purchase orders (create / receive / print) | ❌ | ❌ | ✅ | ✅ |
| Reports (sales, items, staff, stock) | ❌ | ❌ | ✅ | ✅ |
| Reports (P&L) | ❌ | ❌ | ❌ | ✅ |
| User management | ❌ | ❌ | ❌ | ✅ |
| Outlet settings | ❌ | ❌ | ❌ | ✅ |
| Audit log | ❌ | ❌ | ❌ | ✅ |
| Void / refund orders | ❌ | ❌ | ✅ | ✅ |

## Money math (why we never use `number`)

Sub-penny values like `0.10 + 0.20` produce `0.30000000000000004` in
IEEE-754 floats — disastrous for receipts. Every money field is
**Prisma.Decimal** (which wraps decimal.js). The form sends a decimal
string (`"15000"`, `"10.50"`, `"-3000"`), the server wraps in
`new Prisma.Decimal(s)`. Tests cover this in
`src/lib/__tests__/variant-modifier.test.ts` and `pos-flow.test.ts`.

## Testing

- **168 Vitest tests** across 31 files (single-fork for SQLite):
  - Money math (decimal precision, sum, tax, change)
  - Schema validation (Zod) for every form
  - Role gates (KASIR / MANAGER / ADMIN) for actions + API routes
  - Model CRUD (cascade behavior, unique constraints)
  - End-to-end POS flow (sale → stock decrement → void/refund reversal)
  - Report aggregations (salesByDay, topItems, salesByCashier,
    stockSummary, profitLoss)
  - CSV export (escaping, formatting)
- **2 Playwright E2E specs** (require `pnpm exec playwright install`):
  - `e2e/full-pos-flow.spec.ts` — login → open shift → order → pay → receipt → close
  - `e2e/admin-po-flow.spec.ts` — admin creates manager → manager creates PO → receive → stock updated

Run with: `pnpm dev` (in one terminal) then `pnpm exec playwright test` (in another).

## Receipt printing

`/pos/orders/[id]/receipt` is print-stylesheet-aware:
- `@media print` in `src/app/globals.css` hides `.no-print` (chrome)
- Forces `#receipt` to 80mm thermal width, black on white
- Click "Print" in the receipt header (or `window.print()`)

## Production checklist (before deploy)

- [ ] Replace `BETTER_AUTH_SECRET` in `.env` (use `openssl rand -base64 32`)
- [ ] Switch `DATABASE_URL` from SQLite to Postgres (Prisma schema is portable)
- [ ] Run `pnpm prisma migrate deploy` (NOT `db push`) against prod DB
- [ ] Seed admin user manually (not via the demo seed)
- [ ] Configure HTTPS + `BETTER_AUTH_URL` to production domain
- [ ] Back up `prisma/dev.db` (or prod DB) regularly
- [ ] Test receipt printing on the actual 80mm thermal printer you'll use
- [ ] `pnpm exec playwright install` to install Chromium for E2E

## Project structure

```
src/
  app/
    (auth)/                # /login + /register
      login/
        login-form.tsx
      actions.ts
    (authed)/              # everything behind the auth gate
      layout.tsx           # requireAuth + sidebar + header
      error.tsx            # route error boundary
      loading.tsx          # route loading state
      proxy.ts             # ← actually at src/proxy.ts (Next 16)
      dashboard/
      pos/                 # POS terminal + holds + receipt
      menu/                # menu items + categories + variants/modifiers
      inventory/           # stock + adjust + movements + opname + POs (inline supplier)
      shifts/              # open / close / list
      reports/             # sales / items / staff / stock / profit
      admin/               # users / settings / audit
    api/
      auth/[...all]/       # Better Auth catch-all
      menu/                # REST menu
      categories/          # REST categories
  components/
    nav/                   # sidebar, header, user menu
    ui/                    # shadcn primitives
    reports/               # report filters, CSV button
  lib/
    db.ts                  # Prisma singleton
    auth.ts                # Better Auth config
    session.ts             # getSession, requireAuth, requireRole
    money.ts               # dec, formatIDR
    schemas/               # Zod schemas
    inventory/             # stock helpers
    pos/                   # cart store
    audit/                 # audit log helper
    reports/               # aggregation helpers
    api/                   # role-gate helpers for REST
prisma/
  schema.prisma            # 14 models
  migrations/              # hand-written SQL (managed via db push + resolve)
  seed.ts                  # idempotent demo seed
e2e/                       # Playwright E2E
```

## Decisions / non-obvious things

- **Next 16 deprecated `middleware.ts`** → use `src/proxy.ts` (export `function proxy`).
- **shadcn base-nova preset** uses Base UI primitives, not Radix. Trigger / render prop is different from old `asChild`.
- **Prisma's `migrate dev` requires a TTY.** For non-interactive (CI, this dev env), use `prisma db push --accept-data-loss` + hand-write migration SQL + `prisma migrate resolve --applied`.
- **SQLite has no native Decimal type.** Prisma stores it as TEXT, and `@db.Decimal(5,2)` is rejected at validate time. Just use `Decimal` without annotation.
- **Vitest + SQLite = single-fork.** Parallel test files cause lock contention. `vitest.config.ts` sets `pool: "forks", poolOptions: { forks: { singleFork: true } }`.
- **Account table IDs are random UUIDs** (not cuids) because Better Auth's Prisma adapter expects string IDs we control.
- **Audit log is failure-tolerant** — if the DB call fails, it logs to console but never throws to the calling action.
- **Stock decrement on payment is outside the order transaction** (pragmatic): a sold order with stale stock is better than a rolled-back sale.
- **Receipt is server-rendered**, not generated by a client component — it works even with JS disabled.
