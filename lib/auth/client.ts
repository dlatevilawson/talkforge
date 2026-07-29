"use client";

import {
  clearCurrentUserId,
  getCurrentUserId,
  setCurrentUserId,
} from "@/lib/identity";

export type AuthSessionResult = {
  ok?: boolean;
  error?: string;
  userId?: string;
  displayName?: string;
  role?: "member" | "founder";
  warning?: string;
};

/** Shared login/signup for every user — Founder is a role, not a separate flow. */
export async function establishMemberSession(displayName: string) {
  const existingId = getCurrentUserId();
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "signup",
      displayName,
      userId: existingId || undefined,
    }),
  });
  const data = (await res.json()) as AuthSessionResult;
  if (!res.ok || !data.userId) {
    throw new Error(data.error || "Could not start session");
  }
  setCurrentUserId(data.userId);
  return data;
}

export async function destroySession() {
  await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "logout" }),
  });
  clearCurrentUserId();
}
