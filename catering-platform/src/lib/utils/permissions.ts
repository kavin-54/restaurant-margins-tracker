import { UserRole } from "@/lib/firebase/auth";

type Permission =
  | "view_costs"
  | "view_margins"
  | "view_clients"
  | "manage_recipes"
  | "manage_events"
  | "manage_clients"
  | "manage_ingredients"
  | "manage_system"
  | "manage_users"
  | "view_recipes"
  | "log_waste"
  | "view_inventory"
  | "manage_inventory"
  | "generate_proposals"
  | "view_reports"
  | "manage_purchasing";

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  admin: [
    "view_costs",
    "view_margins",
    "view_clients",
    "manage_recipes",
    "manage_events",
    "manage_clients",
    "manage_ingredients",
    "manage_system",
    "manage_users",
    "view_recipes",
    "log_waste",
    "view_inventory",
    "manage_inventory",
    "generate_proposals",
    "view_reports",
    "manage_purchasing",
  ],
  "kitchen-manager": [
    "view_costs",
    "manage_recipes",
    "view_recipes",
    "manage_ingredients",
    "log_waste",
    "view_inventory",
    "manage_inventory",
    "manage_purchasing",
  ],
  "prep-cook": ["view_recipes", "log_waste", "view_inventory"],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function getPermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export type { Permission };
