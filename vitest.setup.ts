import "@testing-library/jest-dom/vitest";
import { config as loadEnv } from "dotenv";

// Load .env so Better Auth has BETTER_AUTH_SECRET, BETTER_AUTH_URL, DATABASE_URL.
loadEnv({ path: ".env" });