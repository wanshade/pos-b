import { describe, it, expect } from "vitest";
import { modifierSchema } from "@/lib/schemas/menu";

describe("modifierSchema", () => {
  it("accepts a complete modifier", () => {
    const r = modifierSchema.safeParse({
      groupName: "Milk",
      name: "Oat milk",
      priceDelta: "5000",
      sortOrder: 0,
    });
    expect(r.success).toBe(true);
  });

  it("requires groupName", () => {
    const r = modifierSchema.safeParse({ groupName: "  ", name: "X" });
    expect(r.success).toBe(false);
  });

  it("requires name", () => {
    const r = modifierSchema.safeParse({ groupName: "G", name: "" });
    expect(r.success).toBe(false);
  });

  it("accepts negative priceDelta", () => {
    const r = modifierSchema.safeParse({ groupName: "G", name: "X", priceDelta: "-1000" });
    expect(r.success).toBe(true);
  });

  it("defaults priceDelta to '0' and sortOrder to 0", () => {
    const r = modifierSchema.safeParse({ groupName: "G", name: "X" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.priceDelta).toBe("0");
      expect(r.data.sortOrder).toBe(0);
    }
  });
});
