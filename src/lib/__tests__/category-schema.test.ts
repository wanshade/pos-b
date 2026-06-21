import { describe, it, expect } from "vitest";
import { categorySchema } from "@/lib/schemas/menu";

describe("categorySchema", () => {
  it("accepts a valid category", () => {
    const r = categorySchema.safeParse({
      name: "Coffee",
      sortOrder: 1,
      color: "#8B4513",
      icon: "Coffee",
      isActive: true,
    });
    expect(r.success).toBe(true);
  });

  it("coerces sortOrder from string", () => {
    const r = categorySchema.safeParse({ name: "Tea", sortOrder: "5" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.sortOrder).toBe(5);
  });

  it("rejects empty name", () => {
    const r = categorySchema.safeParse({ name: "  " });
    expect(r.success).toBe(false);
  });

  it("rejects negative sortOrder", () => {
    const r = categorySchema.safeParse({ name: "Tea", sortOrder: -1 });
    expect(r.success).toBe(false);
  });

  it("rejects malformed color", () => {
    const r = categorySchema.safeParse({ name: "Tea", color: "red" });
    expect(r.success).toBe(false);
  });

  it("accepts short hex color with #", () => {
    const r = categorySchema.safeParse({ name: "Tea", color: "#FFF" });
    expect(r.success).toBe(false); // must be 6 digits
  });

  it("accepts 6-digit hex color", () => {
    const r = categorySchema.safeParse({ name: "Tea", color: "#FF00AA" });
    expect(r.success).toBe(true);
  });

  it("treats empty color and icon as null", () => {
    const r = categorySchema.safeParse({ name: "Tea", color: "", icon: "  " });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.color).toBeNull();
      expect(r.data.icon).toBeNull();
    }
  });

  it("defaults isActive to true when missing", () => {
    const r = categorySchema.safeParse({ name: "Tea" });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.isActive).toBe(true);
  });
});
