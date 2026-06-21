import { describe, it, expect } from "vitest";
import { lineItemsArraySchema } from "@/lib/schemas/inventory";

describe("lineItemsArraySchema", () => {
  it("accepts a valid array", () => {
    const r = lineItemsArraySchema.safeParse([
      { menuItemId: "mi-1", qty: "10", unitCost: "5.00" },
      { menuItemId: "mi-2", qty: "20", unitCost: "3.50" },
    ]);
    expect(r.success).toBe(true);
  });

  it("rejects empty array", () => {
    const r = lineItemsArraySchema.safeParse([]);
    expect(r.success).toBe(false);
  });

  it("rejects negative qty", () => {
    const r = lineItemsArraySchema.safeParse([
      { menuItemId: "mi-1", qty: "-5", unitCost: "1" },
    ]);
    expect(r.success).toBe(false);
  });

  it("rejects negative unitCost", () => {
    const r = lineItemsArraySchema.safeParse([
      { menuItemId: "mi-1", qty: "5", unitCost: "-1" },
    ]);
    expect(r.success).toBe(false);
  });

  it("rejects non-numeric qty", () => {
    const r = lineItemsArraySchema.safeParse([
      { menuItemId: "mi-1", qty: "abc", unitCost: "1" },
    ]);
    expect(r.success).toBe(false);
  });
});
