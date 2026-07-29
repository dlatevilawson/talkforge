"use client";

/** Client helpers for Gym identity sync. Prefer Server Actions for sign-in/out. */

import { clearCurrentUserId } from "@/lib/identity";

export async function destroySession() {
  await fetch("/api/auth/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "logout" }),
  });
  clearCurrentUserId();
}
