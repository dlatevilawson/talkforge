import { getUser, saveUser } from "./storage";
import type { TalkForgeUser } from "./types";

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `user_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function ensureGuestUser(displayName = "Guest"): TalkForgeUser {
  const existing = getUser();
  if (existing) {
    return existing;
  }

  const user: TalkForgeUser = {
    id: createId(),
    displayName: displayName.trim() || "Guest",
    createdAt: new Date().toISOString(),
  };

  saveUser(user);
  return user;
}

export function updateDisplayName(displayName: string): TalkForgeUser {
  const current = ensureGuestUser();
  const updated: TalkForgeUser = {
    ...current,
    displayName: displayName.trim() || current.displayName,
  };
  saveUser(updated);
  return updated;
}
