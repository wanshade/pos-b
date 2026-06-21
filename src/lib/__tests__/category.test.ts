import { describe, it, expect, afterAll } from "vitest";
import { db } from "@/lib/db";

describe("Category model", () => {
  const created: string[] = [];

  afterAll(async () => {
    if (created.length > 0) {
      await db.category.deleteMany({ where: { id: { in: created } } });
    }
    await db.$disconnect();
  });

  it("can create a category and read it back", async () => {
    const cat = await db.category.create({
      data: { name: "Test-Coffee-" + Date.now(), sortOrder: 1, icon: "Coffee", color: "#8B4513" },
    });
    created.push(cat.id);

    expect(cat.id).toBeTruthy();
    expect(cat.isActive).toBe(true);
    expect(cat.sortOrder).toBe(1);
    expect(cat.icon).toBe("Coffee");
    expect(cat.color).toBe("#8B4513");

    const fetched = await db.category.findUnique({ where: { id: cat.id } });
    expect(fetched?.name).toBe(cat.name);
  });

  it("enforces unique name", async () => {
    const name = "Test-Dup-" + Date.now();
    const first = await db.category.create({ data: { name } });
    created.push(first.id);

    await expect(
      db.category.create({ data: { name } }),
    ).rejects.toThrow();
  });

  it("can update a category", async () => {
    const cat = await db.category.create({
      data: { name: "Test-Update-" + Date.now(), sortOrder: 0 },
    });
    created.push(cat.id);

    const updated = await db.category.update({
      where: { id: cat.id },
      data: { sortOrder: 99, isActive: false },
    });
    expect(updated.sortOrder).toBe(99);
    expect(updated.isActive).toBe(false);
  });

  it("can soft-delete by toggling isActive and hard-delete", async () => {
    const cat = await db.category.create({
      data: { name: "Test-Delete-" + Date.now() },
    });
    // soft
    const soft = await db.category.update({
      where: { id: cat.id },
      data: { isActive: false },
    });
    expect(soft.isActive).toBe(false);
    // hard
    await db.category.delete({ where: { id: cat.id } });
    const found = await db.category.findUnique({ where: { id: cat.id } });
    expect(found).toBeNull();
  });

  it("lists categories sorted by sortOrder then name", async () => {
    const base = "Sort-" + Date.now();
    const a = await db.category.create({ data: { name: base + "-A", sortOrder: 2 } });
    const b = await db.category.create({ data: { name: base + "-B", sortOrder: 1 } });
    const c = await db.category.create({ data: { name: base + "-C", sortOrder: 1 } });
    created.push(a.id, b.id, c.id);

    const list = await db.category.findMany({
      where: { name: { startsWith: base } },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
    expect(list.map((x) => x.name)).toEqual([base + "-B", base + "-C", base + "-A"]);
  });
});
