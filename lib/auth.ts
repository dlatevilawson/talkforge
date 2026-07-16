import { getCurrentUserId, setCurrentUserId } from "./identity";
import { getUser, saveUser } from "./storage";
import type { TalkForgeUser } from "./types";

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `user_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export async function ensureGuestUser(
  displayName = "Guest"
): Promise<TalkForgeUser> {
  const existingId = getCurrentUserId();
  if (existingId) {
    const existing = await getUser();
    if (existing) {
      return existing;
    }
  }

  const user: TalkForgeUser = {
    id: createId(),
    displayName: displayName.trim() || "Guest",
    createdAt: new Date().toISOString(),
  };

  await saveUser(user);
  setCurrentUserId(user.id);
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
