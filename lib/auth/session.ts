import {
  AUTH_COOKIE_MAX_AGE,
  TF_AUTH_COOKIE,
  TF_NAME_COOKIE,
  TF_ROLE_COOKIE,
  TF_UID_COOKIE,
  type UserRole,
} from "@/lib/auth/constants";

export type SessionPayload = {
  authenticated: boolean;
  userId: string | null;
  role: UserRole | null;
  displayName: string | null;
};

/** Parse FOUNDER_USER_IDS allowlist (comma-separated). Production Founder gate. */
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

/**
 * Temporary Founder elevation for local/dev only.
 * Impossible to enable on Vercel Production: requires NODE_ENV !== production
 * AND VERCEL_ENV !== production AND FOUNDER_DEV_ENABLED=true.
 */
export function founderDevAllowed(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (process.env.VERCEL_ENV === "production") return false;
  return process.env.FOUNDER_DEV_ENABLED === "true";
}

export function founderDevUserId(): string {
  return process.env.FOUNDER_DEV_USER_ID?.trim() || "founder-dev";
}

export function founderDevDisplayName(): string {
  return process.env.FOUNDER_DEV_DISPLAY_NAME?.trim() || "Founder";
}

/**
 * Resolve role for a user in the shared auth system.
 * Same login for everyone — Founder is an allowlisted role, not a separate login.
 */
export function resolveUserRole(input: {
  userId: string;
  displayName: string;
}): UserRole {
  const allow = founderUserIdAllowlist();
  if (allow.has(input.userId)) return "founder";

  if (founderDevAllowed()) {
    const devId = founderDevUserId();
    const devName = founderDevDisplayName();
    if (
      input.userId === devId ||
      input.displayName.trim().toLowerCase() === devName.toLowerCase()
    ) {
      return "founder";
    }
  }

  return "member";
}

export function isFounderUserId(userId: string | null | undefined): boolean {
  if (!userId) return false;
  if (founderUserIdAllowlist().has(userId)) return true;
  if (founderDevAllowed() && userId === founderDevUserId()) return true;
  return false;
}

export async function readSession(): Promise<SessionPayload> {
  const { cookies } = await import("next/headers");
  const jar = await cookies();
  const auth = jar.get(TF_AUTH_COOKIE)?.value;
  const userId = jar.get(TF_UID_COOKIE)?.value ?? null;
  const displayName = jar.get(TF_NAME_COOKIE)?.value ?? null;
  // Re-resolve role from allowlist — do not trust cookie alone for authorization.
  const role: UserRole | null =
    auth === "1" && userId
      ? resolveUserRole({
          userId,
          displayName: displayName || "Member",
        })
      : null;
  return {
    authenticated: auth === "1" && Boolean(userId),
    userId,
    role,
    displayName,
  };
}

export async function writeSession(input: {
  userId: string;
  role: UserRole;
  displayName: string;
}): Promise<void> {
  const { cookies } = await import("next/headers");
  const jar = await cookies();
  const base = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: AUTH_COOKIE_MAX_AGE,
  };
  jar.set(TF_AUTH_COOKIE, "1", base);
  jar.set(TF_UID_COOKIE, input.userId, base);
  jar.set(TF_ROLE_COOKIE, input.role, base);
  jar.set(TF_NAME_COOKIE, input.displayName.slice(0, 64), base);
}

export async function clearSession(): Promise<void> {
  const { cookies } = await import("next/headers");
  const jar = await cookies();
  for (const name of [
    TF_AUTH_COOKIE,
    TF_UID_COOKIE,
    TF_ROLE_COOKIE,
    TF_NAME_COOKIE,
  ]) {
    jar.set(name, "", { httpOnly: true, path: "/", maxAge: 0 });
  }
}
