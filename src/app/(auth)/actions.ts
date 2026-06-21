/**
 * Server actions for the (auth) route group — login.
 *
 * Uses Better Auth's signInEmail API. Returns a typed result so the
 * client form can render errors without throwing.
 */

"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { APIError } from "better-auth/api";
import { auth } from "@/lib/auth";
import { loginSchema } from "@/lib/schemas/auth";

export type LoginState =
  | { status: "idle" }
  | { status: "error"; message: string; fieldErrors?: Record<string, string> };

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const raw = {
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { status: "error", message: "Please check the form", fieldErrors };
  }

  const next = String(formData.get("next") ?? "") || "/dashboard";

  try {
    // With better-auth/next-js nextCookies() plugin installed, signInEmail
    // will set the session cookie via next/headers automatically when called
    // from a Server Action. We don't need to forward Set-Cookie headers
    // ourselves (and doing so via asResponse:true triggers an internal
    // self-fetch that breaks in dev mode with "Connection closed").
    await auth.api.signInEmail({
      body: { email: parsed.data.email, password: parsed.data.password },
      headers: await headers(),
      asResponse: false,
    });
  } catch (err) {
    if (err instanceof APIError) {
      // Map common auth errors to friendly messages
      const msg = err.body?.code === "INVALID_EMAIL_OR_PASSWORD"
        ? "Invalid email or password"
        : err.message || "Sign-in failed";
      return { status: "error", message: msg };
    }
    return { status: "error", message: "Sign-in failed" };
  }

  redirect(next);
}
