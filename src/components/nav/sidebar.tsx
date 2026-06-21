"use client";

import { StoreIcon } from "lucide-react";
import type { Role } from "@prisma/client";
import {
  Sidebar as UISidebar,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { SidebarNav } from "./sidebar-nav";
import { LogoutButton } from "./logout-button";

export function Sidebar({ role }: { role: Role }) {
  return (
    <UISidebar collapsible="icon" className="lg:border-r-0!">
      <SidebarHeader className="px-3 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <StoreIcon className="size-5" />
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-bold leading-tight tracking-tight">POS App</span>
            <span className="text-[11px] font-medium text-muted-foreground">Point of Sale</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarNav role={role} />
      <SidebarFooter className="p-3 group-data-[collapsible=icon]:hidden">
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2">
          <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-[11px] font-bold text-primary">
            {role.charAt(0)}
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Role</span>
            <span className="font-mono text-xs font-bold">{role}</span>
          </div>
        </div>
        <LogoutButton />
      </SidebarFooter>
    </UISidebar>
  );
}
