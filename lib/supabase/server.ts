import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseEnv } from "@/lib/supabase/config";

/** Server Component / Server Action / Route Handler client. */
export async function createServerSupabaseClient(): Promise<SupabaseClient> {
  const { url, key } = requireSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component — proxy refreshes sessions.
        }
      },
    },
  });
}
