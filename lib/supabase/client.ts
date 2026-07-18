import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export type SupabaseConfigStatus = {
  configured: boolean;
  urlPresent: boolean;
  anonKeyPresent: boolean;
  message: string;
};

export function getSupabaseConfigStatus(): SupabaseConfigStatus {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  const urlPresent = url.length > 0;
  const anonKeyPresent = anonKey.length > 0;
  const configured = urlPresent && anonKeyPresent;

  return {
    configured,
    urlPresent,
    anonKeyPresent,
    message: configured
      ? "Supabase is configured."
      : "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
  };
}

export function getSupabaseClient(): SupabaseClient | null {
  const status = getSupabaseConfigStatus();
  if (!status.configured) {
    return null;
  }

  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
          flowType: "pkce",
        },
      }
    );
  }

  return client;
}
