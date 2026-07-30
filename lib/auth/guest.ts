import { migrateGuestPracticeData } from "@/lib/auth/migrate-guest";
import {
  bindAuthenticatedUserId,
  getCurrentUserId,
  isGuestUserId,
  setCurrentUserId,
  stashPendingGuestUserId,
} from "@/lib/identity";
import { getUser, saveUser } from "@/lib/storage";
import type { TalkForgeUser } from "@/lib/types";

/**
 * Resolve the authenticated member for Gym client flows.
 * Identity comes from Supabase Auth (session cookie → getUser / /api/auth/session).
 * Replaces any leftover guest session pointer. Does not create anonymous guests.
 */
export async function ensureGuestUser(
  displayName = "Member"
): Promise<TalkForgeUser> {
  // Prefer authoritative auth resolution.
  const fromAuth = await getUser().catch(() => null);
  if (fromAuth && !fromAuth.isGuest) {
    void migrateGuestPracticeData(fromAuth.id);
    return fromAuth;
  }

  const cached = getCurrentUserId();
  if (cached && isGuestUserId(cached)) {
    stashPendingGuestUserId(cached);
  }

  const res = await fetch("/api/auth/session");
  const data = (await res.json()) as {
    authenticated?: boolean;
    userId?: string | null;
    displayName?: string | null;
    email?: string | null;
  };

  if (!data.authenticated || !data.userId) {
    throw new Error("Please sign in to continue.");
  }

  bindAuthenticatedUserId(data.userId);
  await migrateGuestPracticeData(data.userId).catch(() => undefined);

  const existing = await getUser().catch(() => null);
  if (existing && !existing.isGuest) {
    return existing;
  }

  const user: TalkForgeUser = {
    id: data.userId,
    displayName: data.displayName?.trim() || displayName.trim() || "Member",
    createdAt: new Date().toISOString(),
    email: data.email ?? "",
    isGuest: false,
    role: "user",
  };
  try {
    await saveUser(user);
  } catch {
    // Profile may already exist from auth trigger; continue with local shape.
  }
  return user;
}

export async function updateDisplayName(
  displayName: string
): Promise<TalkForgeUser> {
  const current = await ensureGuestUser();
  const updated: TalkForgeUser = {
    ...current,
    displayName: displayName.trim() || current.displayName,
    isGuest: false,
  };
  await saveUser(updated);
  setCurrentUserId(updated.id);
  return updated;
}
