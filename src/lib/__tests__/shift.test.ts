import { describe, it, expect, afterAll } from "vitest";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

describe("Shift model", () => {
  let testUserId: string;
  let testOutletId: string;
  const created: string[] = [];

  afterAll(async () => {
    for (const id of created) {
      await db.shift.delete({ where: { id } }).catch(() => {});
    }
    if (testUserId) {
      await db.user.delete({ where: { id: testUserId } }).catch(() => {});
    }
    if (testOutletId) {
      await db.outlet.delete({ where: { id: testOutletId } }).catch(() => {});
    }
    await db.$disconnect();
  });

  it("can open a shift with opening cash", async () => {
    testOutletId = (await db.outlet.create({ data: { name: "Shift-Outlet-" + Date.now() } })).id;
    testUserId = (
      await db.user.create({
        data: {
          email: `shift-test-${Date.now()}@pos.local`,
          name: "Shift Tester",
          role: "KASIR",
          isActive: true,
        },
      })
    ).id;

    const shift = await db.shift.create({
      data: {
        userId: testUserId,
        outletId: testOutletId,
        openingCash: new Prisma.Decimal("200000"),
        status: "OPEN",
      },
    });
    created.push(shift.id);

    expect(shift.status).toBe("OPEN");
    expect(shift.openingCash.toString()).toBe("200000");
    expect(shift.closedAt).toBeNull();
    expect(shift.closingCash).toBeNull();
  });

  it("can close a shift with closing + expected + variance", async () => {
    const shift = await db.shift.findFirst({ where: { status: "OPEN" } });
    if (!shift) throw new Error("no open shift from previous test");

    const closing = new Prisma.Decimal("350000");
    const expected = new Prisma.Decimal("345000");
    const variance = closing.minus(expected);

    const closed = await db.shift.update({
      where: { id: shift.id },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
        closingCash: closing,
        expectedCash: expected,
        variance,
      },
    });
    expect(closed.status).toBe("CLOSED");
    expect(closed.closedAt).not.toBeNull();
    expect(closed.closingCash?.toString()).toBe("350000");
    expect(closed.expectedCash?.toString()).toBe("345000");
    expect(closed.variance?.toString()).toBe("5000"); // over
  });

  it("variance is negative when drawer is short", async () => {
    const shift = (await db.shift.findFirst({ where: { status: "CLOSED" } }))!;
    const closing = new Prisma.Decimal("100");
    const expected = new Prisma.Decimal("150");
    const variance = closing.minus(expected);
    expect(variance.toString()).toBe("-50");
  });

  it("shifts scoped to user: own history vs others", async () => {
    const otherUser = await db.user.create({
      data: {
        email: `other-${Date.now()}@pos.local`,
        name: "Other User",
        role: "KASIR",
        isActive: true,
      },
    });
    const otherShift = await db.shift.create({
      data: {
        userId: otherUser.id,
        outletId: testOutletId,
        openingCash: new Prisma.Decimal("100"),
      },
    });
    created.push(otherShift.id);

    const myShifts = await db.shift.findMany({ where: { userId: testUserId } });
    const otherShifts = await db.shift.findMany({ where: { userId: otherUser.id } });
    expect(myShifts.every((s) => s.userId === testUserId)).toBe(true);
    expect(otherShifts.every((s) => s.userId === otherUser.id)).toBe(true);
    expect(myShifts.find((s) => s.id === otherShift.id)).toBeUndefined();
  });
});
