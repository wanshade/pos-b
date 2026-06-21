import { describe, it, expect, afterAll } from "vitest";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";
import { Role } from "@prisma/client";

describe("db schema", () => {
  let createdUserId: string | null = null;

  afterAll(async () => {
    if (createdUserId) {
      // Account cascades to User via onDelete: Cascade
      await db.user.delete({ where: { id: createdUserId } });
    }
    await db.$disconnect();
  });

  it("can create and read back a user with role + account password hash", async () => {
    const email = `test-${Date.now()}@pos.local`;
    const passwordHash = await bcrypt.hash("hunter2", 10);

    const user = await db.user.create({
      data: {
        email,
        name: "Test User",
        role: Role.MANAGER,
        accounts: {
          create: {
            id: randomUUID(),
            accountId: email,
            providerId: "credential",
            password: passwordHash,
          },
        },
      },
      include: { accounts: true },
    });
    createdUserId = user.id;

    expect(user.id).toBeTruthy();
    expect(user.email).toBe(email);
    expect(user.role).toBe(Role.MANAGER);
    expect(user.isActive).toBe(true);
    expect(user.emailVerified).toBe(false);
    expect(user.accounts).toHaveLength(1);

    const account = user.accounts[0];
    expect(account.password).not.toBe("hunter2");
    expect(account.password?.length).toBeGreaterThan(20);
    expect(account.providerId).toBe("credential");

    // verify bcrypt works against the stored hash
    const ok = await bcrypt.compare("hunter2", account.password!);
    expect(ok).toBe(true);
  });

  it("seeded admin user exists with ADMIN role + account", async () => {
    const admin = await db.user.findUnique({
      where: { email: "admin@pos.local" },
      include: { accounts: true },
    });
    expect(admin).not.toBeNull();
    expect(admin?.role).toBe(Role.ADMIN);
    expect(admin?.isActive).toBe(true);
    expect(admin?.accounts).toHaveLength(1);
    expect(admin?.accounts[0].providerId).toBe("credential");
    // the seed password should verify
    const ok = await bcrypt.compare("admin1234", admin!.accounts[0].password!);
    expect(ok).toBe(true);
  });

  it("seeded default outlet exists with currency IDR", async () => {
    const outlet = await db.outlet.findFirst({ where: { name: "Main Outlet" } });
    expect(outlet).not.toBeNull();
    expect(outlet?.currency).toBe("IDR");
  });
});
