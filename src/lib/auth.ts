/**
 * Better Auth configuration.
 *
 * - Credentials provider (email + password) only
 * - Prisma adapter (SQLite dev.db)
 * - Session stored in cookies (default)
 * - Role + isActive on user (extra fields)
 * - bcryptjs for password hashing (compatible with seed.ts)
 */

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(db, { provider: "sqlite" }),

  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    minPasswordLength: 8,
    password: {
      // Use bcryptjs so the seed (T1.4) and the API share the same hash format.
      hash: async (password: string) => bcrypt.hash(password, 10),
      verify: async ({ password, hash }: { password: string; hash: string }) =>
        bcrypt.compare(password, hash),
    },
  },

  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "KASIR",
        input: false, // not settable from sign-up
      },
      isActive: {
        type: "boolean",
        required: false,
        defaultValue: true,
        input: false,
      },
    },
  },

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24,     // refresh once per day
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,            // 5 min
    },
  },

  advanced: {
    cookiePrefix: "pos",
  },
  // MUST be the last plugin. It rewrites cookies through next/headers so they
  // actually land on the browser response during Server Actions. Without this,
  // the session cookie is created in memory but never reaches the browser and
  // proxy.ts kicks the user back to /login.
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
