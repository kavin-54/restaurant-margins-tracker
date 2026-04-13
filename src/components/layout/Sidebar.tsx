"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { hasPermission } from "@/lib/utils/permissions";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const navItems = [
  { href: "/", label: "Dashboard", icon: "dashboard", permission: null },
  { href: "/events", label: "Events", icon: "event", permission: "manage_events" as const },
  { href: "/events/prep", label: "Prep Sheets", icon: "receipt_long", permission: "manage_events" as const },
  { href: "/recipes", label: "Recipes", icon: "menu_book", permission: "view_recipes" as const },
  { href: "/ingredients", label: "Ingredients", icon: "egg_alt", permission: "view_recipes" as const },
  { href: "/clients", label: "Clients", icon: "group", permission: "view_clients" as const },
  { href: "/vendors", label: "Vendors", icon: "local_shipping", permission: "manage_purchasing" as const },
  { href: "/purchasing", label: "Purchasing", icon: "shopping_cart", permission: "manage_purchasing" as const },
  { href: "/inventory", label: "Inventory", icon: "inventory_2", permission: "view_inventory" as const },
  { href: "/waste", label: "Waste", icon: "delete_sweep", permission: "log_waste" as const },
  { href: "/reports", label: "Reports", icon: "bar_chart", permission: "view_reports" as const },
  { href: "/settings", label: "Settings", icon: "settings", permission: "manage_system" as const },
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
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-slate-50 border-r border-slate-200/60 transition-transform duration-200 lg:translate-x-0 lg:static lg:z-auto",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between px-5">
          <Link href="/" className="flex items-center gap-2.5" onClick={onClose}>
            <div className="w-9 h-9 bg-blue-700 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-white text-xl">restaurant</span>
            </div>
            <span className="font-bold text-base tracking-tight text-gray-900">HFS Catering</span>
          </Link>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-slate-200 lg:hidden"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <ul className="space-y-0.5">
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
                      "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium tracking-tight transition-all duration-150",
                      isActive
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-500 hover:bg-slate-100 hover:text-gray-700"
                    )}
                  >
                    <span
                      className={cn(
                        "material-symbols-outlined text-xl",
                        isActive ? "text-blue-700" : "text-gray-400"
                      )}
                      style={isActive ? { fontVariationSettings: "'FILL' 1, 'wght' 500" } : undefined}
                    >
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User & Sign Out */}
        {user && (
          <div className="border-t border-slate-200/60 p-4">
            <div className="flex items-center gap-3 mb-3 px-1">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <span className="text-xs font-bold text-blue-700">
                  {(user.displayName || user.email || "U").charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{user.displayName || user.email}</p>
                <p className="text-xs text-gray-400 capitalize">{user.role.replace("-", " ")}</p>
              </div>
            </div>
            <button
              onClick={signOut}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium text-gray-400 hover:bg-red-50 hover:text-red-600 transition-all duration-150"
            >
              <span className="material-symbols-outlined text-xl">logout</span>
              Sign Out
            </button>
          </div>
        )}
      </aside>
    </>
  );
}
