/**
 * Integration tests for /api/menu + /api/categories route handlers.
 *
 * We mock next/headers to inject the Better Auth session cookie,
 * then call the route handlers directly with a Request object.
 */

import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";

const mockHeaders = vi.fn();
vi.mock("next/headers", () => ({
  headers: () => mockHeaders(),
}));

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { GET as listMenu, POST as createMenu } from "@/app/api/menu/route";
import { PATCH as updateMenu, DELETE as deleteMenu } from "@/app/api/menu/[id]/route";
import { GET as listCategories, POST as createCategory } from "@/app/api/categories/route";
import { DELETE as deleteCategory } from "@/app/api/categories/[id]/route";

const created: { kind: "menu" | "category"; id: string }[] = [];

async function adminCookieHeader() {
  const res = await auth.api.signInEmail({
    body: { email: "admin@pos.local", password: "admin1234" },
    asResponse: true,
  });
  return res.headers.getSetCookie().join("; ");
}

async function kasirCookieHeader() {
  // Create a KASIR user with credential account in one shot, then sign in.
  const email = "kasir-test@pos.local";
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    await db.user.delete({ where: { email } }); // also deletes their accounts (Cascade)
  }
  const bcrypt = await import("bcryptjs");
  const passwordHash = await bcrypt.default.hash("admin1234", 10);
  const user = await db.user.create({
    data: {
      email,
      name: "Test Kasir",
      role: "KASIR",
      isActive: true,
      accounts: {
        create: {
          id: `cred-${email}`,
          accountId: email,
          providerId: "credential",
          password: passwordHash,
        },
      },
    },
  });
  expect(user.role).toBe("KASIR");

  const res = await auth.api.signInEmail({
    body: { email, password: "admin1234" },
    asResponse: true,
  });
  return res.headers.getSetCookie().join("; ");
}

function asRequest(input: string, init: RequestInit = {}): Request {
  return new Request(`http://localhost${input}`, init);
}

function setCookie(cookieHeader: string) {
  mockHeaders.mockResolvedValue(new Headers({ cookie: cookieHeader }));
}

afterAll(async () => {
  // cleanup
  for (const c of created) {
    if (c.kind === "menu") {
      await db.menuItem.delete({ where: { id: c.id } }).catch(() => {});
    } else {
      await db.category.delete({ where: { id: c.id } }).catch(() => {});
    }
  }
  // delete the test kasir user (cascade deletes their account)
  await db.user.delete({ where: { email: "kasir-test@pos.local" } }).catch(() => {});
  await db.$disconnect();
});

describe("/api/menu + /api/categories — role gates", () => {
  beforeAll(async () => {
    // sanity: admin user exists (seeded)
    const admin = await db.user.findUnique({ where: { email: "admin@pos.local" } });
    expect(admin).not.toBeNull();
  });

  it("GET /api/categories without session returns 401", async () => {
    mockHeaders.mockResolvedValue(new Headers({}));
    const res = await listCategories();
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("UNAUTHENTICATED");
  });

  it("GET /api/menu as KASIR works (read)", async () => {
    const cookie = await kasirCookieHeader();
    setCookie(cookie);
    const res = await listMenu(asRequest("/api/menu"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  it("POST /api/categories as KASIR returns 403", async () => {
    const cookie = await kasirCookieHeader();
    setCookie(cookie);
    const req = asRequest("/api/categories", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Test-NoPerm-" + Date.now() }),
    });
    const res = await createCategory(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("POST /api/categories as ADMIN works", async () => {
    const cookie = await adminCookieHeader();
    setCookie(cookie);
    const name = "Test-Perm-" + Date.now();
    const req = asRequest("/api/categories", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, color: "#AABBCC", icon: "Coffee" }),
    });
    const res = await createCategory(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.data.id).toBeTruthy();
    created.push({ kind: "category", id: body.data.id });
  });

  it("POST /api/menu as ADMIN works with valid payload", async () => {
    // need a category
    const cat = await db.category.findFirst({ where: { isActive: true } });
    if (!cat) throw new Error("no category");
    const cookie = await adminCookieHeader();
    setCookie(cookie);
    const sku = "API-TEST-" + Date.now();
    const req = asRequest("/api/menu", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "API Test Latte",
        categoryId: cat.id,
        sku,
        price: "20000",
        cost: "5000",
        isAvailable: true,
        trackStock: false,
        sortOrder: 0,
      }),
    });
    const res = await createMenu(req);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.ok).toBe(true);
    created.push({ kind: "menu", id: body.data.id });
  });

  it("POST /api/menu with invalid price returns 422 with fieldErrors", async () => {
    const cat = await db.category.findFirst({ where: { isActive: true } });
    if (!cat) throw new Error("no category");
    const cookie = await adminCookieHeader();
    setCookie(cookie);
    const req = asRequest("/api/menu", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Bad", categoryId: cat.id, price: "not-a-number" }),
    });
    const res = await createMenu(req);
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.error.code).toBe("VALIDATION");
    expect(body.error.fieldErrors).toBeDefined();
  });

  it("GET /api/menu?available=true only returns available items", async () => {
    const cookie = await adminCookieHeader();
    setCookie(cookie);
    const res = await listMenu(asRequest("/api/menu?available=true"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.every((i: { isAvailable: boolean }) => i.isAvailable)).toBe(true);
  });

  it("DELETE /api/menu/[id] as KASIR returns 403", async () => {
    // create a menu item first as admin
    const cat = await db.category.findFirst({ where: { isActive: true } });
    if (!cat) throw new Error("no category");
    setCookie(await adminCookieHeader());
    const createReq = asRequest("/api/menu", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Delete Guard", categoryId: cat.id, price: "1000", sku: "DEL-" + Date.now() }),
    });
    const createRes = await createMenu(createReq);
    const { id } = (await createRes.json()).data;

    // now try to delete as kasir
    setCookie(await kasirCookieHeader());
    const delRes = await deleteMenu(asRequest(`/api/menu/${id}`), { params: Promise.resolve({ id }) });
    expect(delRes.status).toBe(403);

    // cleanup
    await db.menuItem.delete({ where: { id } });
  });
});
