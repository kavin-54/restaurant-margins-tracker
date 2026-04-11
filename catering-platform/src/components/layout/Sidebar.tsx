"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { hasPermission } from "@/lib/utils/permissions";
import {
  ChefHat,
  LayoutDashboard,
  Egg,
  BookOpen,
  CalendarDays,
  Users,
  Truck,
  ShoppingCart,
  Package,
  Trash2,
  BarChart3,
  Settings,
  LogOut,
  X,
} from "lucide-react";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, permission: null },
  { href: "/events", label: "Events", icon: CalendarDays, permission: "manage_events" as const },
  { href: "/recipes", label: "Recipes", icon: BookOpen, permission: "view_recipes" as const },
  { href: "/ingredients", label: "Ingredients", icon: Egg, permission: "view_recipes" as const },
  { href: "/clients", label: "Clients", icon: Users, permission: "view_clients" as const },
  { href: "/vendors", label: "Vendors", icon: Truck, permission: "manage_purchasing" as const },
  { href: "/purchasing", label: "Purchasing", icon: ShoppingCart, permission: "manage_purchasing" as const },
  { href: "/inventory", label: "Inventory", icon: Package, permission: "view_inventory" as const },
  { href: "/waste", label: "Waste", icon: Trash2, permission: "log_waste" as const },
  { href: "/reports", label: "Reports", icon: BarChart3, permission: "view_reports" as const },
  { href: "/settings", label: "Settings", icon: Settings, permission: "manage_system" as const },
];

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, signOut } = useAuth();

  const filteredItems = navItems.filter((item) => {
    if (!item.permission) return true;
    if (!user) return false;
    return hasPermission(user.role, item.permission);
  });

  return (
    <>
      {/* Overlay for mobile */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-white border-r border-border transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-border px-4">
          <Link href="/" className="flex items-center gap-2" onClick={onClose}>
            <ChefHat className="h-7 w-7 text-primary" />
            <span className="font-semibold text-lg">HFS Catering</span>
          </Link>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-accent lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="space-y-1">
            {filteredItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-5 w-5 flex-shrink-0" />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User & Sign Out */}
        {user && (
          <div className="border-t border-border p-4">
            <div className="mb-2">
              <p className="text-sm font-medium truncate">{user.displayName || user.email}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {user.role.replace("-", " ")}
              </p>
            </div>
            <button
              onClick={signOut}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
