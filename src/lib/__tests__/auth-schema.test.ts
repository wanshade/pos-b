import { describe, it, expect } from "vitest";
import { loginSchema } from "@/lib/schemas/auth";

describe("loginSchema", () => {
  it("accepts a valid email + password", () => {
    const r = loginSchema.safeParse({ email: "user@example.com", password: "secret123" });
    expect(r.success).toBe(true);
  });

  it("rejects empty email", () => {
    const r = loginSchema.safeParse({ email: "", password: "secret123" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0].path).toEqual(["email"]);
    }
  });

  it("rejects malformed email", () => {
    const r = loginSchema.safeParse({ email: "not-an-email", password: "secret123" });
    expect(r.success).toBe(false);
  });

  it("rejects empty password", () => {
    const r = loginSchema.safeParse({ email: "user@example.com", password: "" });
    expect(r.success).toBe(false);
    if (!r.success) {
      expect(r.error.issues[0].path).toEqual(["password"]);
    }
  });
});
