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

export function getSiteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL?.trim()) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL?.trim()) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }
  return "http://localhost:3000";
}
