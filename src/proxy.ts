/**
 * Auth middleware — runs on the Edge runtime.
 *
 * We can't use Prisma here (Edge is restricted), so we just check whether
 * the session cookie exists. The (authed) layout does the real
 * validation via auth.api.getSession (Node runtime).
 *
 * Public paths: /login, /register, /api/auth/*, Next internals, static files.
 * Everything else requires a session cookie, otherwise → /login.
 */

import { type NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = new Set(["/login", "/register"]);
const PUBLIC_PREFIXES = ["/api/auth/", "/_next/", "/favicon"];
const SESSION_COOKIE = "pos.session_token";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Allow public assets / auth API / static
  if (
    PUBLIC_PATHS.has(pathname) ||
    PUBLIC_PREFIXES.some((p) => pathname.startsWith(p)) ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    // Preserve intended destination so the login page can redirect back.
    if (pathname !== "/") loginUrl.searchParams.set("next", pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except static files & image optimizer
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
