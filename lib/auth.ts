import {
  clearCurrentUserId,
  getCurrentUserId,
  setCurrentUserId,
} from "./identity";
import { getSupabaseClient } from "./supabase/client";
import { getUser, saveUser } from "./storage";
import type { TalkForgeUser } from "./types";

function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `user_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function requireSupabase() {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }
  return client;
}

function displayNameFromGithubUser(user: {
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): string {
  const meta = user.user_metadata ?? {};
  const candidates = [
    meta.user_name,
    meta.preferred_username,
    meta.full_name,
    meta.name,
    user.email?.split("@")[0],
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "GitHub User";
}

async function loadProfileById(id: string): Promise<TalkForgeUser | null> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, created_at")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to load profile: ${error.message}`);
  }
  if (!data) return null;

  return {
    id: data.id,
    displayName: data.display_name,
    createdAt: data.created_at,
  };
}

/**
 * Sync the signed-in Supabase Auth user into the TalkForge profiles table
 * and set the local session pointer to that auth user id.
 */
export async function syncAuthUserToProfile(): Promise<TalkForgeUser | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    throw new Error(`Failed to read auth session: ${error.message}`);
  }
  if (!user) return null;

  const existing = await loadProfileById(user.id);
  const profile: TalkForgeUser = existing ?? {
    id: user.id,
    displayName: displayNameFromGithubUser(user),
    createdAt: user.created_at ?? new Date().toISOString(),
  };

  if (!existing) {
    await saveUser(profile);
  }

  setCurrentUserId(profile.id);
  return profile;
}

export async function signInWithGithub(): Promise<void> {
  const supabase = requireSupabase();
  const redirectTo = `${window.location.origin}/auth/callback`;

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "github",
    options: {
      redirectTo,
      scopes: "read:user user:email",
    },
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function signOut(): Promise<void> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw new Error(error.message);
    }
  }
  clearCurrentUserId();
}

export async function getAuthProvider(): Promise<"github" | "guest" | null> {
  const supabase = getSupabaseClient();
  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) return "github";
  }

  if (getCurrentUserId()) return "guest";
  return null;
}

export async function ensureGuestUser(
  displayName = "Guest"
): Promise<TalkForgeUser> {
  // Prefer a live GitHub / Supabase Auth session when present.
  const authed = await syncAuthUserToProfile();
  if (authed) return authed;

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
