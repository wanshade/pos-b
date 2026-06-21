/**
 * Better Auth — catch-all API route.
 * Handles all auth endpoints: /api/auth/sign-in, /api/auth/sign-up,
 * /api/auth/sign-out, /api/auth/session, etc.
 */

import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { POST, GET } = toNextJsHandler(auth);
