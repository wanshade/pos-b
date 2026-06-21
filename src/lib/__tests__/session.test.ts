import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock next/navigation so redirect() throws a tagged error we can assert on.
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    const err = new Error("__redirect__:" + url) as Error & { __redirectTo: string };
    err.__redirectTo = url;
    throw err;
  },
}));

const mockHeaders = vi.fn();
vi.mock("next/headers", () => ({
  headers: () => mockHeaders(),
}));

import { requireAuth, requireRole } from "@/lib/session";
import { auth } from "@/lib/auth";

const dummyHeaders = () => new Headers();

async function signInAndGetCookieHeader() {
  const res = await auth.api.signInEmail({
    body: { email: "admin@pos.local", password: "admin1234" },
    asResponse: true,
  });
  return res.headers.getSetCookie().join("; ");
}

async function catchRedirect(fn: () => Promise<unknown>): Promise<string> {
  try {
    await fn();
  } catch (e) {
    return (e as Error & { __redirectTo: string }).__redirectTo;
  }
  throw new Error("expected redirect to throw");
}

describe("session helpers", () => {
  beforeEach(() => {
    mockHeaders.mockReset();
  });

  it("requireAuth redirects to /login with next param when no session", async () => {
    mockHeaders.mockResolvedValue(dummyHeaders());
    const target = await catchRedirect(() => requireAuth("/dashboard"));
    expect(target).toBe("/login?next=%2Fdashboard");
  });

  it("requireAuth redirects to bare /login when no destination", async () => {
    mockHeaders.mockResolvedValue(dummyHeaders());
    const target = await catchRedirect(() => requireAuth());
    expect(target).toBe("/login");
  });

  it("requireAuth returns session when signed in", async () => {
    const cookieHeader = await signInAndGetCookieHeader();
    mockHeaders.mockResolvedValue(new Headers({ cookie: cookieHeader }));
    const session = await requireAuth();
    expect(session.user.email).toBe("admin@pos.local");
  });

  it("requireRole passes for ADMIN", async () => {
    const cookieHeader = await signInAndGetCookieHeader();
    mockHeaders.mockResolvedValue(new Headers({ cookie: cookieHeader }));
    const session = await requireRole(["ADMIN"]);
    expect((session.user as { role: string }).role).toBe("ADMIN");
  });

  it("requireRole redirects to /dashboard when role not allowed", async () => {
    const cookieHeader = await signInAndGetCookieHeader();
    mockHeaders.mockResolvedValue(new Headers({ cookie: cookieHeader }));
    const target = await catchRedirect(() => requireRole(["KASIR"]));
    expect(target).toBe("/dashboard");
  });
});
