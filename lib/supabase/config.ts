/** Shared Supabase env helpers. Prefer anon key; publishable key is an alias. */

export type SupabaseConfigStatus = {
  configured: boolean;
  urlPresent: boolean;
  anonKeyPresent: boolean;
  message: string;
};

export function getSupabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
}

export function getSupabaseAnonKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    ""
  );
}

export function getSupabaseConfigStatus(): SupabaseConfigStatus {
  const urlPresent = getSupabaseUrl().length > 0;
  const anonKeyPresent = getSupabaseAnonKey().length > 0;
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

export function requireSupabaseEnv(): { url: string; key: string } {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }
  return { url, key };
}
