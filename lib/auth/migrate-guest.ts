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
 * Cloud reassignment is retired; browser state authorizes same-device records only.
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
  const pendingCleared = clearPendingGuestUserId();

  return {
    guestId,
    localReassigned,
    remoteMigrated: false,
    message: pendingCleared
      ? undefined
      : "Local practice data migrated, but the pending guest marker could not be cleared.",
  };
}
