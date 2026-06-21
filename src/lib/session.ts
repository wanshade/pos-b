/**
 * Server-side session helpers.
 *
 * Use these in Server Components, layouts, and Server Actions.
 * For middleware (Edge runtime) use src/middleware.ts instead — it
 * only does a cheap cookie presence check.
 */

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import type { Role } from "@prisma/client";

export type AuthSession = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

export async function getSession(): Promise<AuthSession | null> {
  const hdrs = await headers();
  return auth.api.getSession({ headers: hdrs });
}

export async function requireAuth(nextPath?: string): Promise<AuthSession> {
  const session = await getSession();
  if (!session) {
    const target = nextPath
      ? "/login?next=" + encodeURIComponent(nextPath)
      : "/login";
    redirect(target);
  }
  return session;
}

export async function requireRole(roles: Role[]): Promise<AuthSession> {
  const session = await requireAuth();
  const userRole = (session.user as { role?: Role }).role;
  if (!userRole || !roles.includes(userRole)) {
    redirect("/dashboard");
  }
  return session;
}
