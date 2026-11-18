"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { useState } from "react";
import { completeBlockAction, updateDailyMinutesAction } from "@/app/actions/journey";
import type { DrillSignal } from "@/lib/drills/catalog";

const SIGNALS: Array<{ id: DrillSignal; label: string }> = [
  { id: "purpose", label: "Purpose" },
  { id: "perspective", label: "Perspective" },
  { id: "composure", label: "Composure" },
  { id: "message", label: "Message" },
  { id: "adaptability", label: "Adaptability" },
];

export default function CheckInPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-[#07070a] px-6 py-16 text-zinc-100">Loading check-in…</main>}>
      <CheckInForm />
    </Suspense>
  );
}

function CheckInForm() {
  const params = useSearchParams();
  const router = useRouter();
  const planId = params.get("planId") ?? "";
  const programId = params.get("programId") ?? "";
  const blockNumber = params.get("block") ?? "";
  const completedDays = params.get("days") ?? "";
  const initialFocus = params.get("focus");
  const currentBottleneck = params.get("bottleneck") ?? "";
  const initialMinutes = [5, 10, 15].includes(Number(params.get("minutes"))) ? Number(params.get("minutes")) : 5;
  const [focusSignal, setFocusSignal] = useState<DrillSignal>(
    SIGNALS.some((signal) => signal.id === initialFocus) ? (initialFocus as DrillSignal) : "purpose",
  );
  const [goalText, setGoalText] = useState("");
  const [bottleneck, setBottleneck] = useState(currentBottleneck);
  const [dailyMinutes, setDailyMinutes] = useState(initialMinutes);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!planId || !programId || !goalText.trim() || !bottleneck.trim()) {
      setError("Confirm the current bottleneck, choose a focus, and write the next block’s goal before continuing.");
      return;
    }
    setSaving(true);
    setError("");
    const profileResponse = await fetch("/api/living-profile", { cache: "no-store" });
    const profileData = await profileResponse.json() as { profile?: { version?: number } };
    if (!profileResponse.ok || !Number.isInteger(profileData.profile?.version)) {
      setError("Could not load your profile. Please try again.");
      setSaving(false);
      return;
    }
    const profileSave = await fetch("/api/living-profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expectedVersion: profileData.profile!.version, memberDeclaredBottleneck: bottleneck.trim() }) });
    if (!profileSave.ok) {
      setError("Could not save your updated bottleneck. Please try again.");
      setSaving(false);
      return;
    }
    const minutesResult = await updateDailyMinutesAction(planId, dailyMinutes);
    if (!minutesResult.ok) {
      setError(minutesResult.message ?? "Could not save your practice time.");
      setSaving(false);
      return;
    }
    const result = await completeBlockAction({ planId, programId, focusSignal, goalText: goalText.trim() });
    if (!result.ok) {
      setError(result.message ?? "Could not start the next block.");
      setSaving(false);
      return;
    }
    router.push("/app");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-[#07070a] px-6 py-16 text-zinc-100">
      <div className="mx-auto max-w-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#c9a95f]">Block check-in</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">Your next block starts with one choice.</h1>
        <p className="mt-4 text-sm leading-6 text-zinc-400">Block {blockNumber || ""} is complete ({completedDays || "all"} days). Review what you want to work on next. Nothing is created until you confirm.</p>
        <form onSubmit={submit} className="mt-10 space-y-6 rounded-3xl border border-white/10 bg-white/[0.04] p-6">
          <label className="block text-sm text-zinc-300">Next focus
            <select value={focusSignal} onChange={(event) => setFocusSignal(event.target.value as DrillSignal)} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-white">
              {SIGNALS.map((signal) => <option key={signal.id} value={signal.id}>{signal.label}</option>)}
            </select>
          </label>
          <label className="block text-sm text-zinc-300">Is this still the thing that trips you up?
            <textarea value={bottleneck} onChange={(event) => setBottleneck(event.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-white" />
          </label>
          <fieldset>
            <legend className="text-sm text-zinc-300">Still how many minutes a day?</legend>
            <div className="mt-2 flex gap-2">{([5, 10, 15] as const).map((minutes) => <button key={minutes} type="button" aria-pressed={dailyMinutes === minutes} onClick={() => setDailyMinutes(minutes)} className={`rounded-full border px-4 py-2 ${dailyMinutes === minutes ? "border-[#c9a95f] text-white" : "border-white/15 text-zinc-400"}`}>{minutes} minutes</button>)}</div>
          </fieldset>
          <label className="block text-sm text-zinc-300">What should this block help you do?
            <textarea value={goalText} onChange={(event) => setGoalText(event.target.value)} rows={4} placeholder="Example: State my point clearly before giving the background." className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-white" />
          </label>
          {error ? <p className="text-sm text-red-300" role="alert">{error}</p> : null}
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={saving} className="rounded-full bg-[#f4f0e8] px-6 py-3 font-semibold text-black disabled:opacity-60">{saving ? "Starting next block…" : "Start next block"}</button>
            <button type="button" disabled={saving} onClick={() => router.push("/app")} className="rounded-full border border-white/20 px-6 py-3 text-sm text-zinc-300">Not yet</button>
          </div>
        </form>
      </div>
    </main>
  );
}
