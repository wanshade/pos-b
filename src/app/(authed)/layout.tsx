/**
 * (authed) layout — wraps all pages that require a signed-in user.
 *
 * - Calls requireAuth() — redirects to /login if not signed in.
 * - Renders the collapsible sidebar (role-aware) and header (user menu / logout / theme toggle).
 * - Shows shift indicator in the header.
 */

import type { Role } from "@prisma/client";
import { requireAuth } from "@/lib/session";
import { db } from "@/lib/db";
import { Sidebar } from "@/components/nav/sidebar";
import { Header } from "@/components/nav/header";
import { Toaster } from "@/components/ui/sonner";
import { SidebarProvider } from "@/components/ui/sidebar";

export default async function AuthedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();
  const user = session.user as {
    name: string;
    email: string;
    id?: string;
    role?: Role;
  };
  const role: Role = user.role ?? "KASIR";

  const openShift = user.id
    ? await db.shift.findFirst({
        where: { userId: user.id, status: "OPEN" },
        select: { id: true, openedAt: true, openingCash: true },
      })
    : null;

  return (
    <SidebarProvider>
      <Sidebar role={role} />
      <div className="flex min-w-0 flex-1 flex-col h-svh overflow-hidden">
        <Header
          name={user.name}
          email={user.email}
          role={role}
          openShift={openShift
            ? {
                id: openShift.id,
                openedAt: openShift.openedAt.toISOString(),
                openingCash: openShift.openingCash.toString(),
              }
            : null}
        />
        <main className="flex-1 overflow-y-auto bg-muted/30 p-6 md:p-8">
          {children}
        </main>
      </div>
      <Toaster position="top-right" richColors closeButton />
    </SidebarProvider>
  );
}
