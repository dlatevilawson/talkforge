import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseUrl } from "@/lib/supabase/config";

/**
 * Service-role client for privileged server operations only
 * (Founder bootstrap, migrations). Never import into Client Components.
 */
export function createAdminSupabaseClient(): SupabaseClient {
  const url = getSupabaseUrl();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "";
  if (!url || !serviceKey) {
    throw new Error(
      "Admin Supabase client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }
  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function adminConfigured(): boolean {
  return Boolean(
    getSupabaseUrl() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
}
