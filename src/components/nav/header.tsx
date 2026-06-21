import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Calendar03Icon,
  ClockIcon,
  CircleCheckIcon,
  AlertCircleIcon,
} from "@hugeicons/core-free-icons";
import { UserMenu } from "./user-menu";

export function Header({
  name,
  email,
  role,
  openShift,
}: {
  name: string;
  email: string;
  role: string;
  openShift: { id: string; openedAt: string; openingCash: string } | null;
}) {
  const now = new Date().toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <header className="flex h-16 items-center justify-between gap-3 border-b border-border bg-card/80 backdrop-blur-sm px-4 sm:px-6 sticky top-0 z-20 w-full shrink-0">
      <div className="flex min-w-0 items-center gap-3">
        <SidebarTrigger className="-ml-1 md:hidden" />

        <div className="hidden items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-1.5 lg:flex">
          <HugeiconsIcon icon={Calendar03Icon} className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">{now}</span>
        </div>

        <div className="hidden items-center gap-2.5 sm:flex">
          <span className="text-sm text-muted-foreground">Welcome,</span>
          <span className="font-semibold text-sm text-foreground">{name}</span>
          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
            {role}
          </span>
        </div>

        {openShift ? (
          <Link
            href={`/shifts/${openShift.id}`}
            className="hidden md:inline-flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400 transition-all hover:bg-emerald-500/15"
          >
            <span className="relative flex size-2 shrink-0">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            <span>Shift open</span>
            <span className="font-mono text-xs opacity-80">
              Rp {Number(openShift.openingCash).toLocaleString("id-ID")}
            </span>
          </Link>
        ) : (
          <Link
            href="/shifts/open"
            className="hidden md:inline-flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-sm font-medium text-amber-600 dark:text-amber-400 transition-all hover:bg-amber-500/15"
          >
            <HugeiconsIcon icon={AlertCircleIcon} className="size-3.5" />
            <span>No open shift</span>
          </Link>
        )}
      </div>

      <div className="flex items-center gap-2">
        {openShift && (
          <Link
            href={`/shifts/${openShift.id}`}
            className="md:hidden flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400"
          >
            <span className="size-1.5 rounded-full bg-emerald-500" />
          </Link>
        )}
        <ThemeToggle />
        <UserMenu name={name} email={email} role={role} />
      </div>
    </header>
  );
}
