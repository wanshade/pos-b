"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Role } from "@prisma/client";
import { navForRole } from "./nav-config";
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function SidebarNav({ role }: { role: Role }) {
  const pathname = usePathname();
  const sections = navForRole(role);
  const allHrefs = sections.flatMap((s) => s.items.map((i) => i.href));

  const isActive = (href: string) => {
    if (pathname === href) return true;
    if (pathname.startsWith(href + "/")) {
      const hasMoreSpecific = allHrefs.some(
        (other) =>
          other !== href &&
          other.length > href.length &&
          (pathname === other || pathname.startsWith(other + "/")),
      );
      return !hasMoreSpecific;
    }
    return false;
  };

  return (
    <SidebarContent className="px-2">
      {sections.map((section) => (
        <SidebarGroup key={section.title} className="p-0">
          <SidebarGroupLabel className="px-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70">
            {section.title}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      isActive={active}
                      tooltip={item.label}
                      className="h-9"
                      render={<Link href={item.href} />}
                    >
                      <Icon className="size-[18px] shrink-0" />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </SidebarContent>
  );
}
