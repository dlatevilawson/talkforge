"use client";

import { useState } from "react";
import { FORGE_CUE_KINDS, type ForgeCueKind } from "@/lib/forge-agent/types";

const KIND_OPTIONS: Array<{ value: ForgeCueKind; label: string }> = [
  { value: "upcoming_conversation", label: "Upcoming conversation" },
  { value: "practice_follow_up", label: "Practice follow-up" },
  { value: "homework", label: "Homework" },
];

function defaultDueLocal(): string {
  const due = new Date();
  due.setMinutes(due.getMinutes() - due.getTimezoneOffset());
  return due.toISOString().slice(0, 16);
}

type CueFormProps = {
  disabled?: boolean;
  onCreated: () => void;
};

export default function CueForm({ disabled, onCreated }: CueFormProps) {
  const [kind, setKind] = useState<ForgeCueKind>(FORGE_CUE_KINDS[0]);
  const [title, setTitle] = useState("");
  const [successCriteria, setSuccessCriteria] = useState("");
  const [dueLocal, setDueLocal] = useState(defaultDueLocal);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const dueAt = new Date(dueLocal).toISOString();
      const res = await fetch("/api/forge-agent/cues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          title,
          successCriteria: successCriteria.trim() || null,
          dueAt,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Could not save that cue.");
      }
      setTitle("");
      setSuccessCriteria("");
      setDueLocal(defaultDueLocal());
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that cue.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
      <div>
        <label className="text-xs uppercase tracking-[0.14em] text-zinc-500">
          Kind
          <select
            value={kind}
            disabled={disabled || saving}
            onChange={(event) => setKind(event.target.value as ForgeCueKind)}
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-zinc-100 outline-none ring-[#c9a95f]/35 focus:ring-2"
          >
            {KIND_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div>
        <label className="text-xs uppercase tracking-[0.14em] text-zinc-500">
          What you declared
          <input
            required
            value={title}
            disabled={disabled || saving}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="The conversation or homework"
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-zinc-100 outline-none ring-[#c9a95f]/35 focus:ring-2"
          />
        </label>
      </div>
      <div>
        <label className="text-xs uppercase tracking-[0.14em] text-zinc-500">
          Success line (optional)
          <input
            value={successCriteria}
            disabled={disabled || saving}
            onChange={(event) => setSuccessCriteria(event.target.value)}
            placeholder="What good looks like"
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-zinc-100 outline-none ring-[#c9a95f]/35 focus:ring-2"
          />
        </label>
      </div>
      <div>
        <label className="text-xs uppercase tracking-[0.14em] text-zinc-500">
          Due
          <input
            required
            type="datetime-local"
            value={dueLocal}
            disabled={disabled || saving}
            onChange={(event) => setDueLocal(event.target.value)}
            className="mt-1.5 w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-zinc-100 outline-none ring-[#c9a95f]/35 focus:ring-2"
          />
        </label>
      </div>
      {error ? (
        <p className="text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={disabled || saving}
        className="rounded-full bg-white px-6 py-2.5 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Declare cue"}
      </button>
    </form>
  );
}
