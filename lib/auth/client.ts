"use client";

/** Client helpers for Gym identity sync. Prefer Server Actions for sign-in/out. */

import { clearCurrentUserId, clearPendingGuestUserId } from "@/lib/identity";
import { logoutConfirmed } from "./logout";

export { logoutConfirmed };

export async function destroySession() {
  let res: Response;
  try {
    res = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
  } catch {
    return;
  }
  if (!logoutConfirmed(res)) return;
  clearCurrentUserId();
  clearPendingGuestUserId();
}
