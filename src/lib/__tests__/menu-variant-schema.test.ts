import { describe, it, expect } from "vitest";
import { menuVariantSchema } from "@/lib/schemas/menu";

describe("menuVariantSchema", () => {
  it("accepts a positive priceDelta", () => {
    const r = menuVariantSchema.safeParse({ name: "Large", priceDelta: "5000" });
    expect(r.success).toBe(true);
  });

  it("accepts a negative priceDelta", () => {
    const r = menuVariantSchema.safeParse({ name: "Small", priceDelta: "-3000" });
    expect(r.success).toBe(true);
  });

  it("defaults priceDelta to '0' when empty", () => {
    const r = menuVariantSchema.safeParse({ name: "Regular" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.priceDelta).toBe("0");
  });

  it("rejects non-numeric priceDelta", () => {
    const r = menuVariantSchema.safeParse({ name: "X", priceDelta: "abc" });
    expect(r.success).toBe(false);
  });

  it("rejects too many decimals", () => {
    const r = menuVariantSchema.safeParse({ name: "X", priceDelta: "1.234" });
    expect(r.success).toBe(false);
  });

  it("rejects empty name", () => {
    const r = menuVariantSchema.safeParse({ name: "  " });
    expect(r.success).toBe(false);
  });
});
