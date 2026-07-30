import type { UserRole } from "@/lib/auth/constants";
import { FOUNDER_PORTAL_ROLES, APP_ACCESS_ROLES } from "@/lib/auth/constants";

/**
 * Role-driven permissions. Pages and APIs check permissions — not role names inline.
 * Expand here when adding Premium, workspaces, or enterprise SSO.
 */
export const PERMISSIONS = [
  "app:access",
  "profile:read",
  "profile:write",
  "premium:features",
  "founder:portal",
  "founder:atlas",
  "founder:ops",
  "admin:users",
  "admin:system",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  guest: [],
  user: ["app:access", "profile:read", "profile:write"],
  premium: [
    "app:access",
    "profile:read",
    "profile:write",
    "premium:features",
  ],
  founder: [
    "app:access",
    "profile:read",
    "profile:write",
    "premium:features",
    "founder:portal",
    "founder:atlas",
    "founder:ops",
  ],
  admin: [
    "app:access",
    "profile:read",
    "profile:write",
    "premium:features",
    "founder:portal",
    "founder:atlas",
    "founder:ops",
    "admin:users",
    "admin:system",
  ],
  system: [
    "app:access",
    "profile:read",
    "profile:write",
    "premium:features",
    "founder:portal",
    "founder:atlas",
    "founder:ops",
    "admin:users",
    "admin:system",
  ],
};

export function permissionsForRole(role: UserRole | null | undefined): Permission[] {
  if (!role) return [];
  return [...(ROLE_PERMISSIONS[role] ?? [])];
}

export function hasPermission(
  role: UserRole | null | undefined,
  permission: Permission
): boolean {
  return permissionsForRole(role).includes(permission);
}

export function hasAnyPermission(
  role: UserRole | null | undefined,
  needed: readonly Permission[]
): boolean {
  const owned = new Set(permissionsForRole(role));
  return needed.some((p) => owned.has(p));
}

export function canAccessApp(role: UserRole | null | undefined): boolean {
  return Boolean(role && (APP_ACCESS_ROLES as readonly string[]).includes(role));
}

export function canAccessFounderPortal(
  role: UserRole | null | undefined
): boolean {
  return Boolean(
    role && (FOUNDER_PORTAL_ROLES as readonly string[]).includes(role)
  );
}

export function isValidRole(value: string): value is UserRole {
  return value in ROLE_PERMISSIONS;
}
