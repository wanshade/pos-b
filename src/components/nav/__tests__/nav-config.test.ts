import { describe, it, expect } from "vitest";
import { navForRole, NAV_SECTIONS } from "@/components/nav/nav-config";

describe("nav config", () => {
  it("includes the shared items for every role", () => {
    for (const role of ["KASIR", "MANAGER", "ADMIN"] as const) {
      const sections = navForRole(role);
      const items = sections.flatMap((s) => s.items.map((i) => i.href));
      expect(items).toContain("/dashboard");
      expect(items).toContain("/pos");
      expect(items).toContain("/menu");
    }
  });

  it("hides admin-only items from KASIR", () => {
    const items = navForRole("KASIR").flatMap((s) => s.items.map((i) => i.href));
    expect(items).not.toContain("/admin/users");
    expect(items).not.toContain("/admin/settings");
    expect(items).not.toContain("/admin/audit");
    expect(items).not.toContain("/menu/categories");
    expect(items).not.toContain("/reports/profit");
    expect(items).not.toContain("/pos/orders");
  });

  it("shows manager items to MANAGER but not admin-only", () => {
    const items = navForRole("MANAGER").flatMap((s) => s.items.map((i) => i.href));
    expect(items).toContain("/pos/orders");
    expect(items).toContain("/inventory");
    expect(items).toContain("/reports");
    expect(items).toContain("/reports/items");
    expect(items).not.toContain("/admin/users");
    expect(items).not.toContain("/reports/profit");
    expect(items).not.toContain("/menu/categories");
  });

  it("shows every nav item to ADMIN", () => {
    const adminItems = navForRole("ADMIN").flatMap((s) => s.items.map((i) => i.href));
    const allItems = NAV_SECTIONS.flatMap((s) => s.items.map((i) => i.href));
    for (const href of allItems) {
      expect(adminItems).toContain(href);
    }
  });

  it("drops empty sections", () => {
    const sections = navForRole("KASIR");
    for (const s of sections) {
      expect(s.items.length).toBeGreaterThan(0);
    }
  });
});
