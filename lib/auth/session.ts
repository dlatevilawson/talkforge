import { cookies } from "next/headers";
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

export async function readSession(): Promise<SessionPayload> {
  const jar = await cookies();
  const auth = jar.get(TF_AUTH_COOKIE)?.value;
  const userId = jar.get(TF_UID_COOKIE)?.value ?? null;
  const role = (jar.get(TF_ROLE_COOKIE)?.value as UserRole | undefined) ?? null;
  const displayName = jar.get(TF_NAME_COOKIE)?.value ?? null;
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

/** Dev-safe Founder seed. Disabled unless FOUNDER_DEV_ENABLED=true. Never hardcode secrets. */
export function founderDevEnabled(): boolean {
  return process.env.FOUNDER_DEV_ENABLED === "true";
}

export function verifyFounderDevCredentials(
  email: string,
  password: string
): boolean {
  if (!founderDevEnabled()) return false;
  const expectedEmail = process.env.FOUNDER_DEV_EMAIL?.trim();
  const expectedPassword = process.env.FOUNDER_DEV_PASSWORD;
  if (!expectedEmail || !expectedPassword) return false;
  return (
    email.trim().toLowerCase() === expectedEmail.toLowerCase() &&
    password === expectedPassword
  );
}
