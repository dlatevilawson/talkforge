"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Drill } from "@/lib/drills/catalog";

export default function TextDrillCompletion({ drill, programId }: { drill: Drill; programId: string }) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function complete() {
    setSaving(true); setError("");
    const response = await fetch("/api/journey/complete-day", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ programId, drillId: drill.id, notes }) });
    if (!response.ok) { setError("Could not save this rep. Try again."); setSaving(false); return; }
    router.push("/app"); router.refresh();
  }
  return (
    <main className="min-h-screen bg-[#07070a] px-6 py-16 text-zinc-100"><div className="mx-auto max-w-xl">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#c9a95f]">Today’s practice · {drill.modality}</p>
      <h1 className="mt-4 text-4xl font-semibold tracking-tight">{drill.name}</h1>
      <p className="mt-3 text-zinc-400">{drill.durationMinutes} minutes · {drill.signal}</p>
      <section className="mt-10 rounded-2xl border border-white/10 bg-white/[0.04] p-6"><p className="text-lg leading-8 text-zinc-200">{drill.instructions}</p><p className="mt-6 border-t border-white/10 pt-5 text-sm leading-6 text-zinc-400">Look for: {drill.goodLooksLike}</p></section>
      <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Log what happened (optional)" className="mt-6 min-h-28 w-full rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-white outline-none focus:border-[#c9a95f]" />
      {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
      <button type="button" onClick={complete} disabled={saving} className="mt-6 rounded-full bg-[#f4f0e8] px-6 py-3 font-semibold text-black">{saving ? "Saving…" : "Mark today complete"}</button>
    </div></main>
  );
}
