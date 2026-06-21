import { describe, it, expect } from "vitest";
import { stockAdjustmentSchema } from "@/lib/schemas/inventory";

describe("stockAdjustmentSchema", () => {
  it("accepts a valid purchase adjustment", () => {
    const r = stockAdjustmentSchema.safeParse({
      stockItemId: "si-1",
      type: "PURCHASE",
      qty: "50",
      reason: "Restock",
    });
    expect(r.success).toBe(true);
  });

  it("accepts a negative qty", () => {
    const r = stockAdjustmentSchema.safeParse({
      stockItemId: "si-1",
      type: "ADJUSTMENT",
      qty: "-5",
    });
    expect(r.success).toBe(true);
  });

  it("rejects zero qty", () => {
    const r = stockAdjustmentSchema.safeParse({
      stockItemId: "si-1",
      type: "ADJUSTMENT",
      qty: "0",
    });
    expect(r.success).toBe(false);
  });

  it("rejects missing stockItemId", () => {
    const r = stockAdjustmentSchema.safeParse({
      stockItemId: "",
      type: "PURCHASE",
      qty: "1",
    });
    expect(r.success).toBe(false);
  });

  it("rejects non-numeric qty", () => {
    const r = stockAdjustmentSchema.safeParse({
      stockItemId: "si-1",
      type: "PURCHASE",
      qty: "abc",
    });
    expect(r.success).toBe(false);
  });

  it("accepts SALE? No — restricted set", () => {
    const r = stockAdjustmentSchema.safeParse({
      stockItemId: "si-1",
      type: "SALE",
      qty: "1",
    });
    expect(r.success).toBe(false);
  });

  it("treats empty reason as null", () => {
    const r = stockAdjustmentSchema.safeParse({
      stockItemId: "si-1",
      type: "ADJUSTMENT",
      qty: "-1",
      reason: "",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.reason).toBeNull();
  });
});
