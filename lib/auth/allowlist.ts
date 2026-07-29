import type { UserRole } from "@/lib/auth/constants";

/** Production allowlist of auth user IDs elevated to Founder (env-configured). */
export function founderUserIdAllowlist(): Set<string> {
  const raw = process.env.FOUNDER_USER_IDS?.trim() ?? "";
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
  );
}

export function resolveEffectiveRole(
  userId: string,
  role: UserRole
): UserRole {
  if (
    founderUserIdAllowlist().has(userId) &&
    role !== "admin" &&
    role !== "system"
  ) {
    return "founder";
  }
  return role;
}
