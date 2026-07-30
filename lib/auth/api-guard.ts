import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSupabaseConfigStatus } from "@/lib/supabase/config";

/** Require an authenticated Supabase user for spendy / sensitive API routes. */
export async function requireApiUser(): Promise<
  { ok: true; userId: string } | { ok: false; status: number; error: string }
> {
  if (!getSupabaseConfigStatus().configured) {
    return { ok: false, status: 503, error: "Authentication unavailable." };
  }
  try {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase.auth.getClaims();
    const userId = data?.claims?.sub;
    if (error || typeof userId !== "string" || !userId) {
      return { ok: false, status: 401, error: "Sign in required." };
    }
    return { ok: true, userId };
  } catch {
    return { ok: false, status: 401, error: "Sign in required." };
  }
}
