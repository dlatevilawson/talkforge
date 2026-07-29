import { getCurrentUserId, setCurrentUserId } from "@/lib/identity";
import { getUser, saveUser } from "@/lib/storage";
import type { TalkForgeUser } from "@/lib/types";

/**
 * Resolve the authenticated member for Gym client flows.
 * Identity comes from Supabase Auth (session cookie → /api/auth/session → sessionStorage).
 * Does not create anonymous guest accounts.
 */
export async function ensureGuestUser(
  displayName = "Member"
): Promise<TalkForgeUser> {
  let id = getCurrentUserId();

  if (!id) {
    const res = await fetch("/api/auth/session");
    const data = (await res.json()) as {
      authenticated?: boolean;
      userId?: string | null;
      displayName?: string | null;
    };
    if (!data.authenticated || !data.userId) {
      throw new Error("Please sign in to continue.");
    }
    id = data.userId;
    setCurrentUserId(id);
    const existing = await getUser().catch(() => null);
    if (existing) return existing;

    const user: TalkForgeUser = {
      id,
      displayName: data.displayName?.trim() || displayName.trim() || "Member",
      createdAt: new Date().toISOString(),
      role: "user",
    };
    try {
      await saveUser(user);
    } catch {
      // Profile may already exist from auth trigger; continue with local shape.
    }
    return user;
  }

  const existing = await getUser();
  if (existing) return existing;

  const user: TalkForgeUser = {
    id,
    displayName: displayName.trim() || "Member",
    createdAt: new Date().toISOString(),
    role: "user",
  };
  try {
    await saveUser(user);
  } catch {
    // ignore upsert conflicts when auth profile already exists
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
  };
  await saveUser(updated);
  setCurrentUserId(updated.id);
  return updated;
}
