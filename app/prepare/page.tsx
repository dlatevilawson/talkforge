"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import AppShell from "@/app/components/AppShell";
import { ensureGuestUser } from "@/lib/auth";
import { createEvent } from "@/lib/transfer";
import type { ForgeEvent } from "@/lib/types";

const TRACKS: {
  id: ForgeEvent["track"];
  title: string;
  description: string;
}[] = [
  {
    id: "system_design",
    title: "System design interview",
    description: "Structure, tradeoffs, and composure under probe.",
  },
  {
    id: "behavioral_tech",
    title: "Behavioral / leadership (tech)",
    description: "Clear stories about impact, conflict, and ownership.",
  },
  {
    id: "coding_interview",
    title: "Coding interview communication",
    description: "Think aloud: clarify, approach, check, adapt.",
  },
];

export default function PreparePage() {
  const router = useRouter();
  const [track, setTrack] = useState<ForgeEvent["track"]>("system_design");
  const [title, setTitle] = useState("");
  const [whenLabel, setWhenLabel] = useState("");
  const [audience, setAudience] = useState("");
  const [successCriteria, setSuccessCriteria] = useState("");
  const [companyContext, setCompanyContext] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleStart(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (!title.trim() || !whenLabel.trim() || !successCriteria.trim()) {
      setError("Name the interview, when it is, and what success looks like.");
      return;
    }

    setSaving(true);
    try {
      const user = await ensureGuestUser();
      const forgeEvent = createEvent({
        userId: user.id,
        track,
        title,
        whenLabel,
        audience: audience || "Interviewer panel",
        successCriteria,
        companyContext,
      });

      const params = new URLSearchParams({
        mission: "1",
        event: forgeEvent.id,
        track: forgeEvent.track,
      });
      router.push(`/interview?${params.toString()}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not start preparation."
      );
      setSaving(false);
    }
  }

  return (
    <AppShell>
      <section className="max-w-2xl">
        <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
          Event-first · PPS-001
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          What interview are you preparing for?
        </h1>
        <p className="mt-4 text-base leading-7 text-zinc-400">
          Forge begins with the event. We prepare you to perform despite fear —
          confidence comes from capability.
        </p>
      </section>

      <form onSubmit={handleStart} className="mt-10 max-w-2xl space-y-8">
        <fieldset>
          <legend className="text-sm font-medium text-zinc-200">
            Interview track
          </legend>
          <div className="mt-3 grid gap-3">
            {TRACKS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTrack(item.id)}
                aria-pressed={track === item.id}
                className={`rounded-2xl border px-5 py-4 text-left transition ${
                  track === item.id
                    ? "border-blue-400/50 bg-blue-500/15"
                    : "border-white/10 bg-white/5 hover:bg-white/10"
                }`}
              >
                <p className="font-medium text-white">{item.title}</p>
                <p className="mt-1 text-sm text-zinc-400">{item.description}</p>
              </button>
            ))}
          </div>
        </fieldset>

        <label className="block">
          <span className="text-sm text-zinc-300">Event title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
            placeholder="e.g. Acme Staff SWE — system design onsite"
          />
        </label>

        <label className="block">
          <span className="text-sm text-zinc-300">When</span>
          <input
            value={whenLabel}
            onChange={(e) => setWhenLabel(e.target.value)}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
            placeholder="e.g. Thursday 2pm · in 48 hours"
          />
        </label>

        <label className="block">
          <span className="text-sm text-zinc-300">Audience</span>
          <input
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
            placeholder="e.g. Two senior engineers + hiring manager"
          />
        </label>

        <label className="block">
          <span className="text-sm text-zinc-300">
            What does success look like for you?
          </span>
          <textarea
            value={successCriteria}
            onChange={(e) => setSuccessCriteria(e.target.value)}
            rows={3}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm leading-6 text-white outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
            placeholder="e.g. Clear constraints first, name tradeoffs, stay calm when probed"
          />
        </label>

        <label className="block">
          <span className="text-sm text-zinc-300">
            Company / role context (optional)
          </span>
          <textarea
            value={companyContext}
            onChange={(e) => setCompanyContext(e.target.value)}
            rows={2}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm leading-6 text-white outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
            placeholder="Anything the interviewer would expect you to know"
          />
        </label>

        {error && (
          <p className="text-sm text-red-300" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-blue-500 px-8 py-3.5 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:opacity-60"
        >
          {saving ? "Starting…" : "Start deliberate practice"}
        </button>
      </form>
    </AppShell>
  );
}
