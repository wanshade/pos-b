# POS Application (Kasir / Admin / Manager) — Implementation Plan

> **For Claude Code (spawned via tmux):** Use the superpowers workflow (obra/superpowers methodology) — TDD, bite-sized commits, code review, verification at each step. Refer to this plan as the source of truth.

**Goal:** Build a complete Next.js 16 POS (Point of Sale) application with three roles (Kasir / Admin / Manager), full menu management, POS terminal operations, inventory/stock tracking, shift management, and reporting. Production-ready code, TDD-driven, bite-sized commits per task.

**Architecture:**
- Single Next.js 16 app (App Router, RSC) with role-aware layouts
- Server Actions + REST API endpoints for mutations
- SQLite (dev) via Prisma — file-based, zero-setup; schema portable to Postgres for prod
- Better Auth for session-based auth (credentials provider, role in JWT)
- shadcn/ui + Tailwind v4 for UI; decimal.js for money (NEVER floats)
- Playwright for E2E, Vitest for unit

**Tech Stack:**
- Next.js 16.2 (App Router, RSC, Turbopack)
- TypeScript strict mode
- Tailwind CSS v4
- shadcn/ui (Radix primitives)
- Prisma ORM + SQLite (dev.db)
- Better Auth (session cookies, credentials)
- Zustand (client cart state)
- TanStack Query (server state for forms/refresh)
- React Hook Form + Zod (validation)
- Recharts (reports)
- decimal.js (money math)
- date-fns (date helpers)
- Vitest + @testing-library/react
- Playwright (E2E)

**Repo target:** `/root/pos-app/` (created in Task 1)

---

## Roles & Permission Matrix

| Capability | Kasir | Manager | Admin |
|---|---|---|---|
| Open/close shift | ✅ | ✅ | ✅ |
| Take orders / process payments | ✅ | ✅ | ✅ |
| View own shift history | ✅ | ✅ | ✅ |
| View all shifts | ❌ | ✅ | ✅ |
| Void/refund order | ⚠️ needs reason | ✅ | ✅ |
| View menu | ✅ (read-only) | ✅ | ✅ |
| Edit menu | ❌ | ✅ | ✅ |
| Categories CRUD | ❌ | ❌ | ✅ |
| View stock | ✅ (on item page) | ✅ | ✅ |
| Stock adjustment | ❌ | ✅ | ✅ |
| Supplier CRUD | ❌ | ❌ | ✅ |
| Purchase orders | ❌ | ✅ | ✅ |
| Reports: sales, items, staff | ❌ | ✅ | ✅ |
| Reports: profit, audit | ❌ | ❌ | ✅ |
| User management | ❌ | ❌ | ✅ |
| Outlet settings / tax | ❌ | ❌ | ✅ |
| Audit log view | ❌ | ❌ | ✅ |

---

## Domain Model (Prisma schema sketch)

```prisma
// Auth (Better Auth tables: user, session, account, verification)
User           { id, email, passwordHash, name, role: Role, isActive, createdAt }
Outlet         { id, name, address, phone, taxRate, currency, receiptFooter }
Category       { id, name, sortOrder, color, icon, isActive }
MenuItem       { id, categoryId, name, sku, barcode, price: Decimal, cost: Decimal,
                 imageUrl, isAvailable, trackStock, sortOrder }
MenuVariant    { id, menuItemId, name, priceDelta: Decimal, sortOrder }
Modifier       { id, menuItemId, name, groupName, priceDelta: Decimal, sortOrder }
StockItem      { id, menuItemId (unique), currentQty: Decimal, minQty: Decimal,
                 maxQty: Decimal, unit }
StockMovement  { id, stockItemId, type: MovementType, qty: Decimal, refType, refId,
                 reason, createdById, createdAt }
Supplier       { id, name, contactName, phone, email, address, notes }
PurchaseOrder  { id, poNumber, supplierId, status: POStatus, total: Decimal,
                 createdById, orderedAt, receivedAt }
PurchaseOrderItem { id, purchaseOrderId, stockItemId, qty: Decimal, unitCost: Decimal, receivedQty }
Shift          { id, userId, outletId, openedAt, closedAt, openingCash: Decimal,
                 closingCash: Decimal, expectedCash: Decimal, variance: Decimal, status: ShiftStatus }
Order          { id, orderNumber, shiftId, status: OrderStatus, type: OrderType,
                 subtotal: Decimal, discount: Decimal, tax: Decimal, total: Decimal,
                 customerName, customerId, paymentMethod, notes, createdAt, paidAt }
OrderItem      { id, orderId, menuItemId, variantId, nameSnapshot, qty, unitPrice: Decimal,
                 discount: Decimal, lineTotal: Decimal, notes }
OrderItemModifier { id, orderItemId, modifierId, nameSnapshot, priceDelta: Decimal }
Payment        { id, orderId, method: PaymentMethod, amount: Decimal, reference, paidAt }
Customer       { id, name, phone, email, points, totalSpent, createdAt }
Discount       { id, name, type: DiscountType, value: Decimal, code, usageLimit, usedCount,
                 validFrom, validUntil, isActive }
AuditLog       { id, userId, action, entity, entityId, data: Json, ip, createdAt }

enums: Role { ADMIN, MANAGER, KASIR }
       MovementType { PURCHASE, SALE, ADJUSTMENT, TRANSFER_IN, TRANSFER_OUT, OPNAME }
       POStatus { DRAFT, ORDERED, PARTIAL, RECEIVED, CANCELLED }
       ShiftStatus { OPEN, CLOSED }
       OrderStatus { DRAFT, HELD, PAID, VOIDED, REFUNDED }
       OrderType { DINE_IN, TAKEOUT, DELIVERY }
       PaymentMethod { CASH, CARD, EWALLET, QRIS, TRANSFER, SPLIT }
       DiscountType { PERCENT, FIXED }
```

---

## Routes (App Router)

```
/                                  → redirect by role
/login                            → public
/register                         → public (creates first admin only, then disabled)

(authed layout — sidebar + header, role-aware nav)
/dashboard                        → role-specific landing
/pos                              → [K|M|A] cashier terminal
/pos/holds                        → [K|M|A] held orders
/pos/orders                       → [M|A] all orders
/pos/orders/[id]                  → [M|A] order detail + refund

/menu                             → [K|M|A] read-only
/menu/new                         → [A] create item
/menu/[id]/edit                   → [M|A] edit item
/menu/categories                  → [A] manage categories

/inventory                        → [K|M|A] read
/inventory/adjust                 → [M|A] manual adjustment form
/inventory/movements              → [M|A] movement log
/inventory/suppliers              → [A] supplier CRUD
/inventory/purchase-orders        → [M|A] PO list + new
/inventory/purchase-orders/[id]   → [M|A] PO detail + receive
/inventory/opname                 → [M|A] stock-taking

/shifts                           → [K|M|A] my shifts
/shifts/open                      → [K|M|A] open form
/shifts/[id]                      → [K|M|A] close form with reconciliation

/reports                          → [M|A] dashboard
/reports/sales                    → [M|A]
/reports/items                    → [M|A]
/reports/staff                    → [M|A]
/reports/stock                    → [M|A]
/reports/profit                   → [A]

/admin/users                      → [A] user CRUD
/admin/users/[id]/edit            → [A]
/admin/settings                   → [A] outlet + tax + receipt
/admin/audit                      → [A] audit log

/api/auth/[...all]                → Better Auth
/api/menu                         → menu CRUD endpoints
/api/orders                       → order create/update/pay
/api/shifts                       → open/close
/api/stock                        → movement/adjust
/api/reports/[type]               → report data
```

---

## Task Breakdown (bite-sized, 2–5 min each)

### Phase 1 — Bootstrap

- **T1.1** Init Next.js 16 (App Router, TS, Tailwind v4, src dir) at `/root/pos-app/`
- **T1.2** Init git repo, add `.gitignore`, initial commit
- **T1.3** Install + init Prisma with SQLite, create schema for `User`+`Outlet` only
- **T1.4** First migration + seed: create 1 admin user, 1 outlet
- **T1.5** Install + init shadcn/ui (Button, Input, Card, Dialog, Toast)
- **T1.6** Install Better Auth, wire credentials provider, link to Prisma User
- **T1.7** Add auth middleware (protects `(authed)` routes)
- **T1.8** Build login page + form (React Hook Form + Zod)
- **T1.9** Build (authed) layout shell: sidebar + header, role-aware nav
- **T1.10** Build `/dashboard` placeholder per role

### Phase 2 — Menu Management

- **T2.1** Add `Category` model + migration
- **T2.2** Category CRUD: list, create, edit, delete (admin only)
- **T2.3** Add `MenuItem` model + migration
- **T2.4** Menu item list page with category filter + search
- **T2.5** Menu item create form (name, SKU, barcode, price, cost, category, image)
- **T2.6** Menu item edit form + availability toggle
- **T2.7** Add `MenuVariant` model + UI in create/edit form
- **T2.8** Add `Modifier` model + UI (group-aware: e.g., "Size", "Toppings")
- **T2.9** Menu API endpoints (GET /api/menu, POST/PATCH/DELETE)
- **T2.10** Tests: category & menu item validation, role permission gates

### Phase 3 — Inventory

- **T3.1** Add `StockItem` model + auto-create hook on `MenuItem` insert (if `trackStock`)
- **T3.2** Stock list page (read-only, shows currentQty + minQty indicator)
- **T3.3** Add `StockMovement` model + write helper
- **T3.4** Manual stock adjustment form (manager+) — type + qty + reason
- **T3.5** Stock movement log page with date range filter
- **T3.6** Low-stock alert badge (visible to manager+) on dashboard
- **T3.7** Add `Supplier` model + CRUD (admin only)
- **T3.8** Add `PurchaseOrder` + `PurchaseOrderItem` models
- **T3.9** PO list + create form (add line items, auto-calc total)
- **T3.10** PO detail + receive flow (incremental receive, updates stock)
- **T3.11** Stock opname page (count current vs system, create ADJUSTMENT movement on save)
- **T3.12** Tests: stock math, PO receive logic, low-stock detection

### Phase 4 — Shifts

- **T4.1** Add `Shift` model + migration
- **T4.2** Open shift page (form: opening cash amount)
- **T4.3** Shift indicator in header (current shift status)
- **T4.4** Close shift page (count closing cash, show variance, lock)
- **T4.5** My shifts list (own history)
- **T4.6** All shifts list (manager+admin view) with filter by user/date

### Phase 5 — POS Terminal

- **T5.1** Add `Order` + `OrderItem` + `OrderItemModifier` + `Payment` models
- **T5.2** POS layout: left = category nav + items grid; right = cart
- **T5.3** Category nav with switcher
- **T5.4** Item grid showing only `isAvailable=true` items
- **T5.5** Click item → variant + modifier picker dialog → add to cart
- **T5.6** Cart with qty controls, line discount, remove
- **T5.7** Order-level discount (by % or fixed, optional code)
- **T5.8** Customer attach (search/create)
- **T5.9** Hold order (status HELD, persist cart, list in /pos/holds)
- **T5.10** Resume held order
- **T5.11** Payment dialog (split by method support, cash calc change)
- **T5.12** On payment success: order → PAID, decrement stock (if trackStock), create StockMovement=SALE
- **T5.13** Receipt page (printable HTML, outlet info + items + totals + footer)
- **T5.14** Void order (manager+ only, with reason, reverses stock)
- **T5.15** Refund flow (manager+ only, reverses stock, marks REFUNDED)
- **T5.16** Tests: cart math, payment flow, stock decrement, void/refund reversal

### Phase 6 — Reports

- **T6.1** Sales report by day/week/month with chart
- **T6.2** Top-selling items (limit, date range)
- **T6.3** Sales by cashier
- **T6.4** Stock movement report (in/out summary per item)
- **T6.5** Profit/loss report (revenue − cost basis from sold items)
- **T6.6** Export to CSV for each report
- **T6.7** Tests: aggregation queries, date range correctness

### Phase 7 — Admin

- **T7.1** User CRUD (admin only): create with role, deactivate
- **T7.2** Edit user (change role, reset password)
- **T7.3** Outlet settings: tax rate, currency, receipt footer
- **T7.4** Add `AuditLog` model + write helper (capture: order create/pay/void/refund, user CRUD, settings change, stock adjustment)
- **T7.5** Audit log viewer with filters
- **T7.6** Seed script: 1 admin, 1 manager, 2 kasir, 5 categories, 30 menu items with stock, 1 supplier, 1 PO, 1 sample shift, 5 sample orders

### Phase 8 — Polish

- **T8.1** Loading states + error boundaries on all pages
- **T8.2** Empty states for lists
- **T8.3** Mobile-responsive POS terminal (touch-friendly)
- **T8.4** Receipt print CSS (thermal 80mm)
- **T8.5** Playwright E2E: full flow — login → open shift → order → pay → receipt → close shift
- **T8.6** Playwright E2E: admin creates user → manager creates PO → stock updated
- **T8.7** README with setup, env vars, default credentials, screenshots
- **T8.8** Production build check + fix any TS/lint errors

---

## Conventions

- **Money:** `decimal.js` for all monetary arithmetic. Never `number`. Prisma `Decimal` type at DB level.
- **IDs:** CUID2 (built into Prisma). Never expose internal IDs in URLs — use orderNumber, poNumber.
- **Server Actions:** prefer over REST for mutations from forms.
- **API routes:** only for: Better Auth callbacks, machine-to-machine (print service later), E2E test fixtures.
- **Validation:** Zod schemas shared between client form and server action.
- **Errors:** typed result `{ ok: true, data } | { ok: false, error: { code, message } }` — no thrown errors to client.
- **Commits:** conventional commits, after each task (T1.1 commit = `chore: init next.js 16 project`).
- **Tests:** Vitest colocated `*.test.ts(x)` next to source; one Playwright spec per critical E2E.
- **No hardcoded secrets:** `.env` for `DATABASE_URL`, `BETTER_AUTH_SECRET`.

## Environment Variables (.env)

```
DATABASE_URL="file:./prisma/dev.db"
BETTER_AUTH_SECRET="<generated>"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="POS App"
```

## Verification (after each phase)

- `pnpm test` passes
- `pnpm build` succeeds (no TS/lint errors)
- `pnpm dev` boots, dashboard reachable
- Manual smoke: login as each role, exercise primary nav

## Open Questions (decide before T5.5)

- Tax inclusive or exclusive pricing? **Default: exclusive** (line subtotal + tax line at end)
- Receipt: 80mm thermal target? **Yes** — design print CSS for 80mm
- Multi-outlet? **Out of scope** for v1 (single outlet in DB), but model should not preclude it
- Offline mode? **Out of scope** v1

---

## Standing Goal (Hermes /goal)

> Build a complete, production-grade POS application at `/root/pos-app/` using Next.js 16 + Prisma + Better Auth + shadcn/ui, following the superpowers workflow (TDD, bite-sized commits, role-based permissions). Cover all 3 roles, full menu + inventory + POS terminal + reports + admin features. Verify with tests at each phase. Final acceptance: `pnpm test` green, `pnpm build` clean, demo seed data, README with default credentials.

**Sub-goals:**
- Phase 1 (Bootstrap + Auth) — by checkpoint 1
- Phase 2 (Menu) — by checkpoint 2
- Phase 3 (Inventory) — by checkpoint 3
- Phase 4 (Shifts) — by checkpoint 4
- Phase 5 (POS terminal) — by checkpoint 5
- Phase 6 (Reports) — by checkpoint 6
- Phase 7 (Admin) — by checkpoint 7
- Phase 8 (Polish + E2E) — final