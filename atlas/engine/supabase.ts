import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseConfigStatus } from "@/lib/supabase/config";
import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Server-side Supabase client for Founder OS loaders.
 * Uses the authenticated Founder cookie session so RLS
 * (`is_founder_or_admin`) can read AUTH-001 tables.
 */
export async function getFounderSupabase(): Promise<SupabaseClient | null> {
  if (!getSupabaseConfigStatus().configured) return null;
  try {
    return await createServerSupabaseClient();
  } catch {
    return null;
  }
}

/** Auth user id from the current server session, or null. */
export async function getFounderAuthUserId(
  supabase: SupabaseClient
): Promise<string | null> {
  const { data, error } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  if (error || typeof sub !== "string" || !sub) return null;
  return sub;
}
