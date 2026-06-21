/**
 * Database seed — Phase 1: admin user + outlet.
 * Phase 2: starter categories + sample menu items.
 *
 * Idempotent: re-running will not create duplicates.
 * Run via `pnpm prisma db seed` (uses prisma.seed config in package.json).
 *
 * Uses Better Auth's tables: passwords are stored in `Account.password`
 * (providerId="credential", accountId=user.id) — see lib/auth.ts.
 */

import { PrismaClient, Prisma, Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";

const prisma = new PrismaClient();

const DEFAULT_ADMIN = {
  email: "admin@pos.local",
  name: "Administrator",
  password: "admin1234",
  role: Role.ADMIN,
};

const DEFAULT_OUTLET = {
  name: "Main Outlet",
  address: "123 Main Street",
  phone: "+62-000-0000-0000",
  taxRate: 10,
  currency: "IDR",
  receiptFooter: "Thank you for visiting!",
};

async function ensureAdmin() {
  const existing = await prisma.user.findUnique({
    where: { email: DEFAULT_ADMIN.email },
  });
  if (existing) {
    console.log(`✓ admin user exists: ${existing.email} (${existing.role})`);
    return;
  }

  const passwordHash = await bcrypt.hash(DEFAULT_ADMIN.password, 10);
  const admin = await prisma.user.create({
    data: {
      email: DEFAULT_ADMIN.email,
      name: DEFAULT_ADMIN.name,
      role: DEFAULT_ADMIN.role,
      isActive: true,
      accounts: {
        create: {
          id: randomUUID(),
          accountId: DEFAULT_ADMIN.email, // Better Auth convention: accountId == userId for credentials
          providerId: "credential",
          password: passwordHash,
        },
      },
    },
  });
  console.log(`✓ created admin user: ${admin.email} (${admin.role})`);
  console.log(`  default password: ${DEFAULT_ADMIN.password}  ← change in production`);
}

async function ensureOutlet() {
  const count = await prisma.outlet.count();
  if (count > 0) {
    console.log(`✓ outlet exists (${count} total)`);
    return;
  }
  const outlet = await prisma.outlet.create({ data: DEFAULT_OUTLET });
  console.log(`✓ created outlet: ${outlet.name} (tax ${outlet.taxRate}%)`);
}

const STARTER_CATEGORIES = [
  { name: "Coffee",   sortOrder: 1, icon: "Coffee",      color: "#8B4513" },
  { name: "Tea",      sortOrder: 2, icon: "Leaf",        color: "#228B22" },
  { name: "Pastry",   sortOrder: 3, icon: "Croissant",   color: "#DAA520" },
  { name: "Sandwich", sortOrder: 4, icon: "Sandwich",    color: "#CD853F" },
  { name: "Dessert",  sortOrder: 5, icon: "IceCream",    color: "#FF69B4" },
] as const;

async function ensureCategories() {
  let created = 0;
  for (const c of STARTER_CATEGORIES) {
    const existing = await prisma.category.findUnique({ where: { name: c.name } });
    if (existing) continue;
    await prisma.category.create({ data: { ...c } });
    created++;
  }
  if (created === 0) {
    console.log(`✓ categories already seeded (${STARTER_CATEGORIES.length} total)`);
  } else {
    console.log(`✓ seeded ${created} new categories (${STARTER_CATEGORIES.length} total)`);
  }
}

type ItemSeed = { name: string; price: string; cost: string; sku: string; trackStock?: boolean };

const STARTER_ITEMS: Record<string, ItemSeed[]> = {
  Coffee: [
    { name: "Espresso",    price: "15000", cost: "3500", sku: "COF-ESP" },
    { name: "Americano",   price: "18000", cost: "4000", sku: "COF-AME" },
    { name: "Cappuccino",  price: "25000", cost: "7500", sku: "COF-CAP" },
    { name: "Cafe Latte",  price: "25000", cost: "7500", sku: "COF-LAT" },
    { name: "Mocha",       price: "28000", cost: "9000", sku: "COF-MOC" },
    { name: "Cold Brew",   price: "22000", cost: "6000", sku: "COF-CB" },
  ],
  Tea: [
    { name: "Earl Grey",       price: "15000", cost: "3000", sku: "TEA-EG" },
    { name: "Green Tea",       price: "14000", cost: "2500", sku: "TEA-GR" },
    { name: "Chamomile",       price: "16000", cost: "3000", sku: "TEA-CH" },
    { name: "Iced Lemon Tea",  price: "18000", cost: "4000", sku: "TEA-ILT" },
  ],
  Pastry: [
    { name: "Croissant",         price: "18000", cost: "5500", sku: "PST-CRO", trackStock: true },
    { name: "Pain au Chocolat",  price: "20000", cost: "6000", sku: "PST-PAC", trackStock: true },
    { name: "Blueberry Muffin",  price: "16000", cost: "4500", sku: "PST-MUF", trackStock: true },
  ],
  Sandwich: [
    { name: "Egg & Cheese",       price: "28000", cost: "9000",  sku: "SW-EGG" },
    { name: "BLT",                price: "32000", cost: "10000", sku: "SW-BLT" },
    { name: "Club Sandwich",      price: "38000", cost: "12000", sku: "SW-CLB" },
  ],
  Dessert: [
    { name: "Tiramisu",     price: "32000", cost: "11000", sku: "DES-TIR" },
    { name: "Cheesecake",   price: "30000", cost: "10000", sku: "DES-CHE" },
    { name: "Ice Cream Scoop", price: "12000", cost: "3000", sku: "DES-IC", trackStock: true },
  ],
};

async function ensureMenuItems() {
  let created = 0;
  for (const [catName, items] of Object.entries(STARTER_ITEMS)) {
    const cat = await prisma.category.findUnique({ where: { name: catName } });
    if (!cat) continue;
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      const existing = await prisma.menuItem.findUnique({ where: { sku: it.sku } });
      if (existing) continue;
      await prisma.menuItem.create({
        data: {
          categoryId: cat.id,
          name: it.name,
          sku: it.sku,
          price: new Prisma.Decimal(it.price),
          cost: new Prisma.Decimal(it.cost),
          sortOrder: i,
          trackStock: it.trackStock ?? false,
          // Items that track stock need a backing StockItem, otherwise they
          // never show up in inventory / adjust / opname / PO screens.
          ...(it.trackStock
            ? {
                stock: {
                  create: {
                    currentQty: new Prisma.Decimal(0),
                    minQty: new Prisma.Decimal(10),
                    maxQty: new Prisma.Decimal(100),
                    unit: "pcs",
                  },
                },
              }
            : {}),
        },
      });
      created++;
    }
  }
  if (created === 0) {
    const total = await prisma.menuItem.count();
    console.log(`✓ menu items already seeded (${total} total)`);
  } else {
    console.log(`✓ seeded ${created} new menu items`);
  }

  // Self-heal: ensure every trackStock item has a backing StockItem.
  // Without this, items seeded before this fix never appear in the
  // inventory / adjust / opname / PO screens.
  const tracked = await prisma.menuItem.findMany({
    where: { trackStock: true },
    include: { stock: true },
  });
  let backfilled = 0;
  for (const item of tracked) {
    if (item.stock) continue;
    await prisma.stockItem.create({
      data: {
        menuItemId: item.id,
        currentQty: new Prisma.Decimal(0),
        minQty: new Prisma.Decimal(10),
        maxQty: new Prisma.Decimal(100),
        unit: "pcs",
      },
    });
    backfilled++;
  }
  if (backfilled > 0) {
    console.log(`✓ backfilled ${backfilled} missing stock row(s)`);
  }
}

const SAMPLE_VARIANTS: Record<string, { name: string; delta: string }[]> = {
  "Cafe Latte":   [{ name: "Small",  delta: "-3000" }, { name: "Large",  delta: "5000" }],
  "Cappuccino":   [{ name: "Small",  delta: "-3000" }, { name: "Large",  delta: "5000" }],
  "Americano":    [{ name: "Small",  delta: "-2000" }, { name: "Large",  delta: "4000" }],
  "Croissant":    [{ name: "Whole",  delta: "0" },     { name: "Half",   delta: "-9000" }],
  "Club Sandwich":[{ name: "Half",   delta: "-18000" },{ name: "Whole",  delta: "0" }],
};

async function ensureVariants() {
  let created = 0;
  for (const [itemName, variants] of Object.entries(SAMPLE_VARIANTS)) {
    const item = await prisma.menuItem.findFirst({ where: { name: itemName } });
    if (!item) continue;
    for (let i = 0; i < variants.length; i++) {
      const v = variants[i];
      const existing = await prisma.menuVariant.findFirst({
        where: { menuItemId: item.id, name: v.name },
      });
      if (existing) continue;
      await prisma.menuVariant.create({
        data: {
          menuItemId: item.id,
          name: v.name,
          priceDelta: new Prisma.Decimal(v.delta),
          sortOrder: i,
        },
      });
      created++;
    }
  }
  if (created === 0) {
    const total = await prisma.menuVariant.count();
    console.log(`✓ variants already seeded (${total} total)`);
  } else {
    console.log(`✓ seeded ${created} new variants`);
  }
}

const SAMPLE_MODIFIERS: Record<string, { group: string; name: string; delta: string }[]> = {
  "Cafe Latte": [
    { group: "Milk",        name: "Whole milk",   delta: "0" },
    { group: "Milk",        name: "Oat milk",     delta: "5000" },
    { group: "Milk",        name: "Soy milk",     delta: "5000" },
    { group: "Extra shot",  name: "1 shot",       delta: "3000" },
    { group: "Extra shot",  name: "2 shots",      delta: "5000" },
    { group: "Sweetness",   name: "No sugar",     delta: "0" },
    { group: "Sweetness",   name: "Less sugar",   delta: "0" },
  ],
  "Cappuccino": [
    { group: "Milk",        name: "Whole milk",   delta: "0" },
    { group: "Milk",        name: "Oat milk",     delta: "5000" },
    { group: "Toppings",    name: "Cinnamon",     delta: "0" },
    { group: "Toppings",    name: "Chocolate",    delta: "2000" },
  ],
  "Mocha": [
    { group: "Milk",        name: "Whole milk",   delta: "0" },
    { group: "Milk",        name: "Oat milk",     delta: "5000" },
    { group: "Toppings",    name: "Whipped cream",delta: "3000" },
  ],
  "Cold Brew": [
    { group: "Ice",         name: "Less ice",     delta: "0" },
    { group: "Ice",         name: "No ice",       delta: "0" },
  ],
};

async function ensureModifiers() {
  let created = 0;
  for (const [itemName, mods] of Object.entries(SAMPLE_MODIFIERS)) {
    const item = await prisma.menuItem.findFirst({ where: { name: itemName } });
    if (!item) continue;
    for (let i = 0; i < mods.length; i++) {
      const m = mods[i];
      const existing = await prisma.modifier.findFirst({
        where: { menuItemId: item.id, groupName: m.group, name: m.name },
      });
      if (existing) continue;
      await prisma.modifier.create({
        data: {
          menuItemId: item.id,
          groupName: m.group,
          name: m.name,
          priceDelta: new Prisma.Decimal(m.delta),
          sortOrder: i,
        },
      });
      created++;
    }
  }
  if (created === 0) {
    const total = await prisma.modifier.count();
    console.log(`✓ modifiers already seeded (${total} total)`);
  } else {
    console.log(`✓ seeded ${created} new modifiers`);
  }
}

async function ensureManager() {
  const email = "manager@pos.local";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`✓ manager exists: ${existing.email}`);
    return;
  }
  const passwordHash = await bcrypt.hash("manager1234", 10);
  const u = await prisma.user.create({
    data: { email, name: "Maria Manager", role: Role.MANAGER, isActive: true },
  });
  await prisma.account.create({
    data: { id: randomUUID(), accountId: email, providerId: "credential", userId: u.id, password: passwordHash },
  });
  console.log(`✓ created manager: ${u.email} (${u.role})`);
}

async function ensureKasir(name: string, email: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`✓ kasir exists: ${existing.email}`);
    return existing;
  }
  const passwordHash = await bcrypt.hash("kasir1234", 10);
  const u = await prisma.user.create({
    data: { email, name, role: Role.KASIR, isActive: true },
  });
  await prisma.account.create({
    data: { id: randomUUID(), accountId: email, providerId: "credential", userId: u.id, password: passwordHash },
  });
  console.log(`✓ created kasir: ${u.email}`);
  return u;
}

async function ensureKitchen() {
  const email = "kitchen@pos.local";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`✓ kitchen user exists: ${existing.email}`);
    return;
  }
  const passwordHash = await bcrypt.hash("kitchen1234", 10);
  const u = await prisma.user.create({
    data: { email, name: "Karyawan Dapur", role: Role.KITCHEN, isActive: true },
  });
  await prisma.account.create({
    data: { id: randomUUID(), accountId: email, providerId: "credential", userId: u.id, password: passwordHash },
  });
  console.log(`✓ created kitchen user: ${u.email} (${u.role})`);
}

async function ensureDemoShift() {
  const kasir = await prisma.user.findUnique({ where: { email: "kasir1@pos.local" } });
  const outlet = await prisma.outlet.findFirst();
  if (!kasir || !outlet) return;
  const existing = await prisma.shift.findFirst({ where: { userId: kasir.id, status: "OPEN" } });
  if (existing) {
    console.log(`✓ demo shift exists for ${kasir.email}`);
    return;
  }
  await prisma.shift.create({
    data: {
      userId: kasir.id,
      outletId: outlet.id,
      status: "OPEN",
      openingCash: new Prisma.Decimal("200000"),
    },
  });
  console.log(`✓ opened demo shift for ${kasir.email}`);
}

async function ensureSampleOrders() {
  const kasir = await prisma.user.findUnique({ where: { email: "kasir1@pos.local" } });
  if (!kasir) return;
  const shift = await prisma.shift.findFirst({ where: { userId: kasir.id, status: "OPEN" } });
  if (!shift) return;
  const outlet = await prisma.outlet.findFirst();
  if (!outlet) return;

  const count = await prisma.order.count({ where: { shiftId: shift.id } });
  if (count >= 5) {
    console.log(`✓ sample orders exist (${count})`);
    return;
  }

  // pick 5 random menu items
  const items = await prisma.menuItem.findMany({ take: 5 });
  let total = new Prisma.Decimal(0);
  for (const item of items) {
    const qty = 1 + Math.floor(Math.random() * 3);
    const lineTotal = item.price.times(qty);
    await prisma.order.create({
      data: {
        orderNumber: `DEMO-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        shiftId: shift.id,
        status: "PAID",
        type: "DINE_IN",
        subtotal: lineTotal,
        total: lineTotal,
        tax: new Prisma.Decimal(0),
        discount: new Prisma.Decimal(0),
        paidAt: new Date(),
        items: {
          create: [{
            menuItemId: item.id,
            nameSnapshot: item.name,
            qty,
            unitPrice: item.price,
            lineTotal,
          }],
        },
        payments: {
          create: [{ method: "CASH", amount: lineTotal }],
        },
      },
    });
    total = total.plus(lineTotal);
  }
  console.log(`✓ created 5 sample orders (total ${total.toString()})`);
}

async function main() {
  await ensureAdmin();
  await ensureManager();
  await ensureKasir("Kasir Satu", "kasir1@pos.local");
  await ensureKasir("Kasir Dua",  "kasir2@pos.local");
  await ensureKitchen();
  await ensureOutlet();
  await ensureCategories();
  await ensureMenuItems();
  await ensureVariants();
  await ensureModifiers();
  await ensureDemoShift();
  await ensureSampleOrders();
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
