/**
 * Server actions for the (authed) route group.
 *
 * - logoutAction: signs the user out via Better Auth and redirects to /login.
 */

"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export async function logoutAction() {
  try {
    await auth.api.signOut({ headers: await headers() });
  } catch {
    // even if sign-out fails, redirect to login
  }
  redirect("/login");
}
