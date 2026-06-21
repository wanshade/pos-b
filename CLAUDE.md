# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start Next.js dev server (Turbopack) |
| `pnpm build` | Production build |
| `pnpm test` | Run all Vitest tests (single-fork — SQLite lock contention) |
| `pnpm test:watch` | Vitest watch mode |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint (flat config, eslint.config.mjs) |
| `pnpm e2e` | Playwright E2E (dev server must already be running) |
| `pnpm seed` | Run Prisma seed (idempotent) |
| `pnpm db:migrate` | `prisma migrate dev` |
| `pnpm db:push` | `prisma db push --accept-data-loss` (use when migrate dev fails without TTY) |
| `pnpm db:studio` | Prisma Studio |
| `pnpm exec playwright install` | Install Playwright browsers |

- Run a single test file: `pnpm vitest run src/lib/__tests__/auth.test.ts`
- Test pattern: `pnpm vitest run -- --testNamePattern "pattern"`
- E2E requires `pnpm dev` running in another terminal first

## Architecture

### Stack
- **Next.js 16.2** (App Router) + **React 19** — RSC-heavy; client components only for interactivity
- **Prisma 6** + **SQLite** (dev) / Postgres (prod) — portable schema, hand-written migrations
- **Better Auth 1.6** — credentials-only auth, role in user session, bcryptjs for passwords
- **Zustand 5** — POS cart (localStorage persisted)
- **shadcn/ui** (base-nova preset, Base UI primitives, NOT Radix asChild API)
- **Tailwind CSS v4** — PostCSS, no `tailwind.config.js`
- **Zod 4** — shared schemas between client forms and server actions
- **decimal.js** via `Prisma.Decimal` — no float arithmetic for money, ever

### Directory structure
```
src/
  app/
    (auth)/          Login page + actions
    (authed)/        All authenticated routes (layout does requireAuth + sidebar)
      dashboard/     Role-customized cards + low-stock banner
      pos/           POS terminal (Zustand cart, server actions for submit/pay)
      menu/          Menu CRUD: list, edit (variants+modifiers), new, categories
      inventory/     Stock view, adjust, movements, opname, purchase orders (inline supplier)
      shifts/        Open/close own shifts, view all (MANAGER+)
      reports/       sales/items/staff/stock/profit aggregations
      admin/         Users CRUD, settings, audit log
    api/             auth catch-all + menu/categories REST endpoints
  components/
    nav/             Sidebar, header, user menu
    ui/              shadcn primitives (dialog, sonner toast, etc.)
    reports/         Report filters, CSV export button
  lib/
    db.ts             Prisma singleton (avoids hot-reload pool spam)
    auth.ts           Better Auth config (credentials, prisma adapter, nextCookies plugin)
    session.ts        getSession, requireAuth, requireRole helpers
    money.ts          dec(), formatIDR(), sum() — Prisma.Decimal arithmetic
    utils.ts          cn() — Tailwind class merging
    schemas/          Zod schemas (auth.ts, menu.ts, inventory.ts)
    inventory/        stock-helpers.ts — recordStockMovement() (transaction + sign)
    pos/              cart-store.ts (Zustand), cart-store-helpers.ts (pure math for tests)
    audit/            log.ts — recordAudit() (failure-tolerant, never throws)
    reports/          aggregations.ts — salesByDay, topItems, salesByCashier, stockSummary, profitLoss, financeSummary
    api/              menu-helpers.ts — role-gate helpers for REST
prisma/
  schema.prisma       14 models
  seed.ts             Idempotent demo seed
e2e/                  Playwright E2E specs
```

### Key patterns

**Server actions** for mutations; **route handlers** (`/api/*`) for E2E and machine-to-machine. Pages are Server Components; only interactive bits (cart, forms, charts, dialogs) are client components.

**Money**: All monetary values are `Prisma.Decimal` (text in SQLite). Forms send decimal strings (`"15000"`, `"10.50"`), Zod validates as strings via regex, server wraps in `new Prisma.Decimal(s)`. Never use `number` for money.

**Auth**: Edge runtime proxy (`src/proxy.ts`) checks session cookie presence → redirects to `/login`. Real validation happens in the (authed) layout via `auth.api.getSession()`. Route-level gating: `requireRole([...])` in server actions / page loaders. Better Auth session cookie prefixed `pos.`.

**Stock**: All changes flow through `recordStockMovement()` in `src/lib/inventory/stock-helpers.ts` — single transaction updates `StockItem.currentQty` + inserts `StockMovement` row, throws on insufficient stock. Sourced movements tagged with `refType` (Order, PO, Opname, Manual).

**Audit**: Every privileged action calls `recordAudit()`. Failure-tolerant — logs to console but never throws. Stores action/entity/entityId/data (JSON string, not JSON column — SQLite) + IP.

**Testing**: `vitest.config.ts` enforces `singleFork: true` for SQLite lock safety. Test files co-located under `__tests__/` dirs next to what they test. 168 unit/integration tests across 31 files. Tests cover: money math, Zod schemas, role gates, CRUD cascade, POS flow (sale→stock→void/refund), report aggregations, CSV export, cart math.

**Prisma + SQLite quirks**:
- `@db.Decimal(5,2)` annotation is rejected — use bare `Decimal` without annotation
- `migrate dev` requires TTY — in CI, use `db push --accept-data-loss` + hand-write SQL + `migrate resolve --applied`
- Parallel test files = lock contention, hence singleFork

**Next.js 16**: Uses `src/proxy.ts` (exports `function proxy`) instead of deprecated `middleware.ts`. `allowedDevOrigins` in `next.config.ts` for Cloudflare tunnel + localhost.

**POS cart flows through**: Zustand store (client) → "Pay" calls server action → order created as PAID + stock decremented via `recordStockMovement()` (outside order transaction — pragmatic: stale stock > rolled-back sale). "Hold" persists cart to DB, "Resume" reloads from DB. Kitchen lifecycle (QUEUED→PREPARING→READY→SERVED) is independent of payment.

**Purchase order lifecycle**: DRAFT→ORDERED→PARTIAL→RECEIVED (or cancel from DRAFT/ORDERED/PARTIAL). Supplier details inline per PO (no Supplier table). PO numbers: `PO-YYYY-NNNN`. Receiving is validated per-line (qty ≤ remaining ordered) before any writes.
