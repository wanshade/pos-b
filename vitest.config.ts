import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    css: false,
    // SQLite is single-writer; running many test files in parallel causes lock
    // contention and timeouts. Force a single fork so files run sequentially.
    pool: "forks",
    poolOptions: { forks: { singleFork: true } },
    testTimeout: 20000,
  },
});