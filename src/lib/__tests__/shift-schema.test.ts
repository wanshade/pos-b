import { describe, it, expect } from "vitest";
import { openShiftSchema, closeShiftSchema } from "@/lib/schemas/inventory";

describe("shift schemas", () => {
  describe("openShiftSchema", () => {
    it("accepts a valid open", () => {
      const r = openShiftSchema.safeParse({
        outletId: "out-1",
        openingCash: "200000",
        notes: "start of day",
      });
      expect(r.success).toBe(true);
    });

    it("rejects empty openingCash", () => {
      const r = openShiftSchema.safeParse({ outletId: "out-1", openingCash: "" });
      expect(r.success).toBe(false);
    });

    it("rejects negative openingCash", () => {
      const r = openShiftSchema.safeParse({ outletId: "out-1", openingCash: "-100" });
      expect(r.success).toBe(false);
    });

    it("allows zero openingCash", () => {
      const r = openShiftSchema.safeParse({ outletId: "out-1", openingCash: "0" });
      expect(r.success).toBe(true);
    });
  });

  describe("closeShiftSchema", () => {
    it("accepts a valid close", () => {
      const r = closeShiftSchema.safeParse({ closingCash: "350000" });
      expect(r.success).toBe(true);
    });

    it("rejects negative closingCash", () => {
      const r = closeShiftSchema.safeParse({ closingCash: "-50" });
      expect(r.success).toBe(false);
    });
  });
});
