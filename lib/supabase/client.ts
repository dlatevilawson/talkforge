import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getSupabaseAnonKey,
  getSupabaseConfigStatus,
  getSupabaseUrl,
  type SupabaseConfigStatus,
} from "@/lib/supabase/config";

export type { SupabaseConfigStatus };
export { getSupabaseConfigStatus };

/** Browser client with cookie-backed Supabase Auth session. */
export function createBrowserSupabaseClient(): SupabaseClient {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }
  return createBrowserClient(url, key);
}

/** @deprecated Prefer createBrowserSupabaseClient — kept for storage callers. */
export function getSupabaseClient(): SupabaseClient | null {
  const status = getSupabaseConfigStatus();
  if (!status.configured) return null;
  return createBrowserSupabaseClient();
}
