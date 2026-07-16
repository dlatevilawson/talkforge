"use client";

import { getPersistenceStatus } from "@/lib/supabase/persist";

export default function PersistenceStatus() {
  const status = getPersistenceStatus();

  if (status.configured) {
    return (
      <p
        className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
        role="status"
      >
        Persistence: Supabase connected. Profile, sessions, and reflections sync
        on save.
      </p>
    );
  }

  return (
    <p
      className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100"
      role="status"
    >
      Persistence: local-only right now. Add{" "}
      <code className="text-amber-50">NEXT_PUBLIC_SUPABASE_URL</code> and{" "}
      <code className="text-amber-50">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>, then
      run <code className="text-amber-50">supabase/schema.sql</code> so data is
      stored in Supabase.
    </p>
  );
}
