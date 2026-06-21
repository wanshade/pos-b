/**
 * Test for the role-aware card list logic.
 *
 * The list-building function isn't exported from the page (it's
 * inline), so we re-test the same role→cards mapping by importing
 * the underlying nav config and asserting each role's links include
 * the same destinations the dashboard uses.
 *
 * If you refactor cardsForRole() out of the page, switch this test
 * to import the real function.
 */

import { describe, it, expect } from "vitest";
import { navForRole } from "@/components/nav/nav-config";

const DASHBOARD_HREFS_BY_ROLE: Record<"KASIR" | "MANAGER" | "ADMIN", string[]> = {
  KASIR: ["/pos", "/shifts"],
  MANAGER: ["/pos", "/shifts", "/reports", "/inventory"],
  ADMIN: [
    "/pos",
    "/shifts",
    "/reports",
    "/inventory",
    "/admin/users",
    "/admin/settings",
    "/admin/audit",
    "/reports/profit",
  ],
};

describe("dashboard cards vs nav", () => {
  it("KASIR dashboard cards all exist in the KASIR nav", () => {
    const navHrefs = new Set(
      navForRole("KASIR").flatMap((s) => s.items.map((i) => i.href)),
    );
    for (const href of DASHBOARD_HREFS_BY_ROLE.KASIR) {
      expect(navHrefs.has(href), `KASIR nav should contain ${href}`).toBe(true);
    }
  });

  it("MANAGER dashboard cards all exist in the MANAGER nav", () => {
    const navHrefs = new Set(
      navForRole("MANAGER").flatMap((s) => s.items.map((i) => i.href)),
    );
    for (const href of DASHBOARD_HREFS_BY_ROLE.MANAGER) {
      expect(navHrefs.has(href), `MANAGER nav should contain ${href}`).toBe(true);
    }
  });

  it("ADMIN dashboard cards all exist in the ADMIN nav", () => {
    const navHrefs = new Set(
      navForRole("ADMIN").flatMap((s) => s.items.map((i) => i.href)),
    );
    for (const href of DASHBOARD_HREFS_BY_ROLE.ADMIN) {
      expect(navHrefs.has(href), `ADMIN nav should contain ${href}`).toBe(true);
    }
  });
});
