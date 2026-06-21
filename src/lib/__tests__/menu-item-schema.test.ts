import { describe, it, expect } from "vitest";
import { menuItemSchema } from "@/lib/schemas/menu";

const base = {
  name: "Latte",
  categoryId: "cat-1",
  sku: "LAT-1",
  price: "25000",
};

describe("menuItemSchema", () => {
  it("accepts a complete valid item", () => {
    const r = menuItemSchema.safeParse({
      ...base,
      cost: "8000",
      barcode: "123456",
      imageUrl: "https://example.com/latte.jpg",
      isAvailable: true,
      trackStock: false,
      sortOrder: 0,
    });
    expect(r.success).toBe(true);
  });

  it("rejects empty name", () => {
    const r = menuItemSchema.safeParse({ ...base, name: "  " });
    expect(r.success).toBe(false);
  });

  it("rejects missing categoryId", () => {
    const r = menuItemSchema.safeParse({ ...base, categoryId: "" });
    expect(r.success).toBe(false);
  });

  it("rejects negative price-like string", () => {
    const r = menuItemSchema.safeParse({ ...base, price: "-5" });
    expect(r.success).toBe(false);
  });

  it("rejects non-numeric price", () => {
    const r = menuItemSchema.safeParse({ ...base, price: "abc" });
    expect(r.success).toBe(false);
  });

  it("rejects price with too many decimals", () => {
    const r = menuItemSchema.safeParse({ ...base, price: "10.123" });
    expect(r.success).toBe(false);
  });

  it("accepts price with 1-2 decimals", () => {
    const r1 = menuItemSchema.safeParse({ ...base, price: "10.5" });
    const r2 = menuItemSchema.safeParse({ ...base, price: "10.50" });
    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);
  });

  it("empty cost becomes '0' and is valid", () => {
    const r = menuItemSchema.safeParse({ ...base, cost: "" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.cost).toBe("0");
  });

  it("rejects http-less imageUrl", () => {
    const r = menuItemSchema.safeParse({ ...base, imageUrl: "not-a-url" });
    expect(r.success).toBe(false);
  });

  it("treats empty sku as null", () => {
    const r = menuItemSchema.safeParse({ ...base, sku: "" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.sku).toBeNull();
  });

  it("defaults isAvailable / trackStock / sortOrder", () => {
    const r = menuItemSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.isAvailable).toBe(true);
      expect(r.data.trackStock).toBe(false);
      expect(r.data.sortOrder).toBe(0);
      expect(r.data.cost).toBe("0");
    }
  });
});
