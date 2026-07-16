import { getSupabaseConfigStatus } from "./client";

export function getPersistenceStatus() {
  const config = getSupabaseConfigStatus();
  return {
    ...config,
    backend: config.configured ? ("supabase" as const) : ("unconfigured" as const),
  };
}
