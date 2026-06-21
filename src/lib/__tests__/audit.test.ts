import { describe, it, expect, afterAll } from "vitest";
import { db } from "@/lib/db";
import { recordAudit, listAudit } from "@/lib/audit/log";

describe("audit log", () => {
  const created: string[] = [];

  afterAll(async () => {
    for (const id of created) {
      await db.auditLog.delete({ where: { id } }).catch(() => {});
    }
    await db.$disconnect();
  });

  it("recordAudit writes a row, listAudit reads it back", async () => {
    await recordAudit({
      action: "test.event",
      entity: "Test",
      entityId: "test-1",
      data: { foo: "bar", n: 42 },
      userId: null,
    });
    const list = await listAudit({ action: "test.event" });
    expect(list.length).toBeGreaterThanOrEqual(1);
    const hit = list.find((l) => l.entityId === "test-1");
    expect(hit).toBeTruthy();
    expect(hit?.data).toContain("foo");
    created.push(hit!.id);
  });

  it("recordAudit is failure-tolerant (no throw on bad data)", async () => {
    // even with weird input, should not throw
    await expect(
      recordAudit({ action: "x", entity: "X", data: { circular: {} as unknown } }),
    ).resolves.toBeUndefined();
  });
});
