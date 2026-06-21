"use client";

import { useTransition } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  UserCircleIcon,
  Logout01Icon,
  ArrowDown01Icon,
  Settings01Icon,
} from "@hugeicons/core-free-icons";
import { logoutAction } from "@/app/(authed)/actions";
import { cn } from "@/lib/utils";

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function UserMenu({
  name,
  email,
  role,
}: {
  name: string;
  email: string;
  role: string;
}) {
  const [pending, start] = useTransition();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <button className="flex items-center gap-2 rounded-lg px-2 py-1.5 outline-none transition-all hover:bg-muted">
            <Avatar className="size-8">
              <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                {initials(name)}
              </AvatarFallback>
            </Avatar>
            <div className="hidden sm:flex flex-col items-start leading-tight">
              <span className="text-sm font-semibold text-foreground">{name}</span>
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{role}</span>
            </div>
            <HugeiconsIcon icon={ArrowDown01Icon} className="size-3 text-muted-foreground shrink-0" />
          </button>
        }
      />
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex items-center gap-3 px-2 py-2">
            <Avatar className="size-10 shrink-0">
              <AvatarFallback className="bg-primary/10 text-sm font-bold text-primary">
                {initials(name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate text-sm font-semibold text-foreground">{name}</span>
              <span className="truncate text-xs font-normal text-muted-foreground">{email}</span>
              <span className="mt-0.5 inline-flex w-fit items-center rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                {role}
              </span>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          render={
            <a
              href="/admin/settings"
              className={cn(
                "flex w-full items-center gap-2.5 text-sm",
              )}
            />
          }
        >
          <HugeiconsIcon icon={Settings01Icon} className="size-4 text-muted-foreground" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          closeOnClick={false}
          onClick={() => start(() => logoutAction())}
          disabled={pending}
          variant="destructive"
          className="flex w-full items-center gap-2.5 text-sm"
        >
          <HugeiconsIcon icon={Logout01Icon} className="size-4" />
          <span>{pending ? "Signing out…" : "Sign out"}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
