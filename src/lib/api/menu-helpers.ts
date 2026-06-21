/**
 * API helpers — role check + JSON response helpers.
 */

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import type { Role } from "@prisma/client";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

export async function getApiSession(): Promise<SessionUser | null> {
  const hdrs = await headers();
  const session = await auth.api.getSession({ headers: hdrs });
  if (!session) return null;
  const u = session.user as { id: string; email: string; name: string; role?: Role };
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role ?? "KASIR",
  };
}

export function jsonError(status: number, code: string, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ ok: false, error: { code, message, ...extra } }, { status });
}

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

/** Returns session if the user has one of the allowed roles, else returns a 401/403 response. */
export async function requireApiRole(roles: Role[]): Promise<{ ok: true; user: SessionUser } | { ok: false; response: NextResponse }> {
  const user = await getApiSession();
  if (!user) {
    return { ok: false, response: jsonError(401, "UNAUTHENTICATED", "Sign in required") };
  }
  if (!roles.includes(user.role)) {
    return { ok: false, response: jsonError(403, "FORBIDDEN", `Requires one of: ${roles.join(", ")}`) };
  }
  return { ok: true, user };
}
