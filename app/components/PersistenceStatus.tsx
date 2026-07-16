"use client";

import { getSupabaseConfigStatus } from "@/lib/supabase/client";

export default function PersistenceStatus() {
  const status = getSupabaseConfigStatus();

  if (status.configured) {
    return (
      <p
        className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
        role="status"
      >
        Connected to Supabase. Profiles, practice sessions, and reflections sync
        to the cloud.
      </p>
    );
  }

  return (
    <p
      className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200"
      role="alert"
    >
      Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and
      NEXT_PUBLIC_SUPABASE_ANON_KEY to enable persistence.
    </p>
  );
}
