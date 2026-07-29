/**
 * TalkForge authentication constants.
 * Auth owns identity, authentication, authorization, and session only.
 */

export const APP_ROLES = [
  "guest",
  "user",
  "premium",
  "founder",
  "admin",
  "system",
] as const;

export type UserRole = (typeof APP_ROLES)[number];

/** Canonical production origin — used for auth emails so phones never hit localhost. */
export const PRODUCTION_SITE_URL = "https://talkforge.io";

/** Roles that may access the Founder Portal. */
export const FOUNDER_PORTAL_ROLES: readonly UserRole[] = [
  "founder",
  "admin",
  "system",
] as const;

/** Roles that may access the Communication Gym (/app). */
export const APP_ACCESS_ROLES: readonly UserRole[] = [
  "user",
  "premium",
  "founder",
  "admin",
  "system",
] as const;

export type AccountStatus =
  | "pending"
  | "active"
  | "suspended"
  | "deleted";

/**
 * Public site origin for auth redirects (verification, recovery, OAuth).
 * On Vercel, always prefer the product domain so email links work on any device.
 * Localhost is only used for true local development.
 */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }

  // Any Vercel deployment must emit reachable auth links (not *.vercel.app / localhost).
  if (process.env.VERCEL) {
    return PRODUCTION_SITE_URL;
  }

  if (process.env.NODE_ENV === "production") {
    return PRODUCTION_SITE_URL;
  }

  return "http://localhost:3000";
}

/** Auth callback URL with optional next path (must be allowlisted in Supabase). */
export function authCallbackUrl(next = "/onboarding"): string {
  const safeNext = next.startsWith("/") ? next : "/onboarding";
  return `${getSiteUrl()}/auth/callback?next=${encodeURIComponent(safeNext)}`;
}
