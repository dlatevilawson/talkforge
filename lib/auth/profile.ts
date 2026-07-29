import type { AccountStatus, UserRole } from "@/lib/auth/constants";
import { isValidRole } from "@/lib/auth/roles";

export type UserProfile = {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  accountStatus: AccountStatus;
  role: UserRole;
  timeZone: string;
  preferredLanguage: string;
  onboardingComplete: boolean;
  mustChangePassword: boolean;
};

export type ProfileRow = {
  id: string;
  first_name: string;
  last_name: string;
  display_name: string;
  email: string;
  email_verified: boolean;
  created_at: string;
  last_login_at: string | null;
  account_status: string;
  role: string;
  time_zone: string;
  preferred_language: string;
  onboarding_complete: boolean;
  must_change_password: boolean;
};

export function mapProfile(row: ProfileRow): UserProfile {
  const role: UserRole = isValidRole(row.role) ? row.role : "user";
  const status = (
    ["pending", "active", "suspended", "deleted"] as const
  ).includes(row.account_status as AccountStatus)
    ? (row.account_status as AccountStatus)
    : "pending";

  return {
    id: row.id,
    firstName: row.first_name ?? "",
    lastName: row.last_name ?? "",
    displayName:
      row.display_name ||
      [row.first_name, row.last_name].filter(Boolean).join(" ") ||
      "Member",
    email: row.email,
    emailVerified: Boolean(row.email_verified),
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
    accountStatus: status,
    role,
    timeZone: row.time_zone || "UTC",
    preferredLanguage: row.preferred_language || "en",
    onboardingComplete: Boolean(row.onboarding_complete),
    mustChangePassword: Boolean(row.must_change_password),
  };
}

const PROFILE_SELECT =
  "id, first_name, last_name, display_name, email, email_verified, created_at, last_login_at, account_status, role, time_zone, preferred_language, onboarding_complete, must_change_password";

export { PROFILE_SELECT };
