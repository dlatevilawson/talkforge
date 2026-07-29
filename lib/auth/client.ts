"use client";

import { clearCurrentUserId, getCurrentUserId, setCurrentUserId } from "@/lib/identity";

/** Establish cookie session + sync guest pointer for practice persistence. */
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
  const data = (await res.json()) as {
    ok?: boolean;
    error?: string;
    userId?: string;
    displayName?: string;
  };
  if (!res.ok || !data.userId) {
    throw new Error(data.error || "Could not start session");
  }
  setCurrentUserId(data.userId);
  return data;
}

export async function establishFounderSession(email: string, password: string) {
  const res = await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "founder", email, password }),
  });
  const data = (await res.json()) as {
    ok?: boolean;
    error?: string;
    userId?: string;
  };
  if (!res.ok || !data.userId) {
    throw new Error(data.error || "Founder login failed");
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
