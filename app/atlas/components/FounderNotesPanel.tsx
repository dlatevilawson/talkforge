"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { FounderNote, NoteCategory } from "@/atlas/engine/ops-types";
import { formatWhen } from "./tone";

const CATEGORY_ORDER: NoteCategory[] = [
  "Product",
  "Marketing",
  "Engineering",
  "Company",
  "Future Ideas",
];

type FounderNotesPanelProps = {
  initialNotes: FounderNote[];
};

export default function FounderNotesPanel({
  initialNotes,
}: FounderNotesPanelProps) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [notes, setNotes] = useState(initialNotes);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [, startTransition] = useTransition();

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    const body = textareaRef.current?.value.trim() ?? "";
    if (!body || saving) return;

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/atlas/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      const data = (await res.json()) as {
        note?: FounderNote;
        error?: string;
      };

      if (!res.ok || !data.note) {
        throw new Error(data.error || "Could not save note.");
      }

      setNotes((current) => [data.note!, ...current]);
      if (textareaRef.current) textareaRef.current.value = "";
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save note.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section id="founder-notes" className="scroll-mt-8">
      <div className="flex items-end justify-between gap-3 border-b border-white/10 px-4 py-3">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.22em] text-zinc-500">
          Founder Notes
        </h2>
        <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-600">
          Auto-categorized · Supabase
        </p>
      </div>

      <div className="px-4 py-4">
        <form onSubmit={handleSave} className="space-y-3">
          <label className="block" htmlFor="founder-note">
            <span className="sr-only">Founder note</span>
            <textarea
              id="founder-note"
              name="note"
              ref={textareaRef}
              rows={3}
              placeholder="Capture a product insight, engineering risk, marketing move, or future idea…"
              disabled={saving}
              className="w-full resize-y border border-white/10 bg-[#111318] px-4 py-3 text-sm leading-6 text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-white/25 disabled:opacity-60"
            />
          </label>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="border border-zinc-100 bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-white disabled:opacity-40"
            >
              {saving ? "Saving…" : "Save note"}
            </button>
            <p className="text-xs text-zinc-500">
              Categories: {CATEGORY_ORDER.join(" · ")}
            </p>
          </div>
        </form>

        {error && (
          <p className="mt-3 text-sm text-red-300" role="alert">
            {error}
          </p>
        )}

        <ul className="mt-6 divide-y divide-white/5">
          {notes.length === 0 ? (
            <li className="py-2 text-sm text-zinc-500">
              No founder notes yet. Add one to start the operating log.
            </li>
          ) : (
            notes.map((note) => (
              <li key={note.id} className="py-3 first:pt-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="border border-white/10 px-2 py-0.5 text-[11px] uppercase tracking-[0.14em] text-zinc-300">
                    {note.category}
                  </span>
                  <span className="text-xs text-zinc-600">
                    {formatWhen(note.createdAt)}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-200">
                  {note.body}
                </p>
              </li>
            ))
          )}
        </ul>
      </div>
    </section>
  );
}
