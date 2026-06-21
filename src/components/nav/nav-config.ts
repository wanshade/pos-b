/**
 * Nav items, grouped by section, each tagged with the roles that can see them.
 * The sidebar filters items by the current user's role.
 *
 * Order matters — it defines the order in the sidebar.
 */

import {
  LayoutDashboard,
  ShoppingCart,
  ClipboardList,
  UtensilsCrossed,
  Package,
  PackageOpen,
  Truck,
  BarChart3,
  Users,
  Settings,
  ScrollText,
  CircleDollarSign,
  CalendarClock,
  Wallet,
  ChefHat,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@prisma/client";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  roles: Role[];
};

export type NavSection = {
  title: string;
  items: NavItem[];
};

export const NAV_SECTIONS: NavSection[] = [
  {
    title: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["KASIR", "MANAGER", "ADMIN", "KITCHEN"] },
    ],
  },
  {
    title: "POS",
    items: [
      { href: "/pos", label: "Terminal", icon: ShoppingCart, roles: ["KASIR", "MANAGER", "ADMIN"] },
      { href: "/pos/holds", label: "Held Orders", icon: ClipboardList, roles: ["KASIR", "MANAGER", "ADMIN"] },
      { href: "/pos/orders", label: "All Orders", icon: ScrollText, roles: ["MANAGER", "ADMIN"] },
    ],
  },
  {
    title: "Kitchen",
    items: [
      { href: "/kitchen", label: "Kitchen Display", icon: ChefHat, roles: ["KITCHEN", "MANAGER", "ADMIN"] },
    ],
  },
  {
    title: "Catalog",
    items: [
      { href: "/menu", label: "Menu", icon: UtensilsCrossed, roles: ["KASIR", "MANAGER", "ADMIN"] },
      { href: "/menu/categories", label: "Categories", icon: Package, roles: ["ADMIN"] },
    ],
  },
  {
    title: "Inventory",
    items: [
      { href: "/inventory", label: "Stock", icon: PackageOpen, roles: ["KASIR", "MANAGER", "ADMIN"] },
      { href: "/inventory/movements", label: "Movements", icon: ScrollText, roles: ["MANAGER", "ADMIN"] },
      { href: "/inventory/purchase-orders", label: "Purchase Orders", icon: Truck, roles: ["MANAGER", "ADMIN"] },
    ],
  },
  {
    title: "Shifts",
    items: [
      { href: "/shifts", label: "My Shifts", icon: ClipboardList, roles: ["KASIR", "MANAGER", "ADMIN"] },
      { href: "/shifts/all", label: "All Shifts", icon: CalendarClock, roles: ["MANAGER", "ADMIN"] },
    ],
  },
  {
    title: "Reports",
    items: [
      { href: "/reports", label: "Sales", icon: BarChart3, roles: ["MANAGER", "ADMIN"] },
      { href: "/reports/finance", label: "Finance", icon: Wallet, roles: ["MANAGER", "ADMIN"] },
      { href: "/reports/items", label: "Items", icon: BarChart3, roles: ["MANAGER", "ADMIN"] },
      { href: "/reports/staff", label: "Staff", icon: BarChart3, roles: ["MANAGER", "ADMIN"] },
      { href: "/reports/stock", label: "Stock Report", icon: BarChart3, roles: ["MANAGER", "ADMIN"] },
      { href: "/reports/profit", label: "Profit / Loss", icon: CircleDollarSign, roles: ["ADMIN"] },
    ],
  },
  {
    title: "Admin",
    items: [
      { href: "/admin/users", label: "Users", icon: Users, roles: ["ADMIN"] },
      { href: "/admin/settings", label: "Outlet Settings", icon: Settings, roles: ["ADMIN"] },
      { href: "/admin/audit", label: "Audit Log", icon: ScrollText, roles: ["ADMIN"] },
    ],
  },
];

/** Filter nav config for a given role. */
export function navForRole(role: Role): NavSection[] {
  return NAV_SECTIONS
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => item.roles.includes(role)),
    }))
    .filter((section) => section.items.length > 0);
}
