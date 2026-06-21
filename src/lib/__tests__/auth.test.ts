import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

describe("better auth — signInEmail", () => {
  beforeAll(async () => {
    // sanity: seeded admin must exist
    const admin = await db.user.findUnique({ where: { email: "admin@pos.local" } });
    expect(admin, "seed must have created admin@pos.local").not.toBeNull();
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("signs in the seeded admin with correct password", async () => {
    const result = await auth.api.signInEmail({
      body: { email: "admin@pos.local", password: "admin1234" },
      asResponse: false,
    });

    expect(result.user).toBeTruthy();
    expect(result.user.email).toBe("admin@pos.local");
    expect(result.user.role).toBe("ADMIN");
  });

  it("rejects wrong password", async () => {
    await expect(
      auth.api.signInEmail({
        body: { email: "admin@pos.local", password: "wrong-password" },
        asResponse: false,
      }),
    ).rejects.toThrow();
  });

  it("rejects unknown email", async () => {
    await expect(
      auth.api.signInEmail({
        body: { email: "nobody@pos.local", password: "anything" },
        asResponse: false,
      }),
    ).rejects.toThrow();
  });

  it("returns null for an anonymous getSession", async () => {
    const session = await auth.api.getSession({ headers: new Headers() });
    expect(session).toBeNull();
  });
});
