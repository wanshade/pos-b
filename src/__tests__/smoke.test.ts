import { describe, it, expect } from "vitest";

describe("smoke", () => {
  it("runs a basic assertion", () => {
    expect(1 + 1).toBe(2);
  });

  it("has a working math module", () => {
    const total = 2 + 3;
    expect(total).toBeGreaterThan(4);
  });
});