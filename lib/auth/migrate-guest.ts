"use client";

import {
  clearPendingGuestUserId,
  getPendingGuestUserId,
  isGuestUserId,
} from "@/lib/identity";
import { reassignLocalPracticeData } from "@/lib/transfer";

export type GuestMigrationResult = {
  guestId: string | null;
  localReassigned: number;
  remoteMigrated: boolean;
  message?: string;
};

/**
 * After login, move any pending guest practice data onto the authenticated account.
 * - Always remaps localStorage Forge events / reality captures.
 * - Calls the migrate-guest API when a service role is available for cloud rows.
 */
export async function migrateGuestPracticeData(
  authUserId: string
): Promise<GuestMigrationResult> {
  const guestId = getPendingGuestUserId();
  if (!guestId || !isGuestUserId(guestId) || guestId === authUserId) {
    return {
      guestId: null,
      localReassigned: 0,
      remoteMigrated: false,
    };
  }

  const localReassigned = reassignLocalPracticeData(guestId, authUserId);

  let remoteMigrated = false;
  let message: string | undefined;

  try {
    const res = await fetch("/api/auth/migrate-guest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guestId }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      migrated?: boolean;
      message?: string;
    };
    remoteMigrated = Boolean(data.migrated);
    if (!res.ok && data.message) {
      message = data.message;
    }
  } catch {
    message = "Cloud guest migration unavailable.";
  }

  clearPendingGuestUserId();

  return {
    guestId,
    localReassigned,
    remoteMigrated,
    message,
  };
}
