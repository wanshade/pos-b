import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for POS E2E tests.
 * Run with `pnpm exec playwright test`.
 *
 * Assumes the dev server is already running on BASE_URL (default
 * http://localhost:3000). Use `pnpm dev` in another terminal.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: false, // SQLite is single-writer
  workers: 1,
  reporter: "list",
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
