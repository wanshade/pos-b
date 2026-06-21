/**
 * Home page — redirects to /dashboard for signed-in users, /login otherwise.
 * The proxy already redirects unauthed users to /login, so by the time we
 * reach this RSC, the user has a session.
 */

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) redirect("/dashboard");
  redirect("/login");
}
