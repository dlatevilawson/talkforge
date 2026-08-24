"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ExecutiveMemoryRecord } from "@/atlas/engine/executive-memory";
import {
  ATLAS_THREAD_MAX_TURNS,
  type AtlasThreadTurn,
} from "@/atlas/engine/thread";

function classLabel(record: ExecutiveMemoryRecord): string {
  if (record.class === "promotion_candidate") return "Promotion Candidate";
  if (record.class === "operational") return "Operational Memory";
  return record.class;
}

export default function AskAtlasPanel() {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [, startTransition] = useTransition();
  const [thread, setThread] = useState<AtlasThreadTurn[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState(false);
  const [lastClose, setLastClose] = useState<{
    sitting_id: string;
    records: ExecutiveMemoryRecord[];
  } | null>(null);

  async function handleAsk(event: React.FormEvent) {
    event.preventDefault();
    const message = textareaRef.current?.value.trim() ?? "";
    if (!message || loading || closing) return;

    setError("");
    setLastClose(null);
    setLoading(true);

    try {
      const res = await fetch("/api/atlas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          thread: thread.slice(-ATLAS_THREAD_MAX_TURNS),
        }),
      });

      const data = (await res.json()) as { response?: string; error?: string };
      if (!res.ok) throw new Error(data.error || "Atlas could not respond.");
      if (!data.response) throw new Error("Atlas returned an empty response.");
      setThread((prev) => [
        ...prev,
        { role: "user", content: message },
        { role: "assistant", content: data.response as string },
      ]);
      if (textareaRef.current) textareaRef.current.value = "";
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Atlas could not respond."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCloseSitting() {
    if (thread.length === 0 || loading || closing) return;

    setError("");
    setClosing(true);

    try {
      const res = await fetch("/api/atlas/sitting/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thread }),
      });
      const data = (await res.json()) as {
        sitting_id?: string;
        records?: ExecutiveMemoryRecord[];
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || "Could not close sitting.");
      }

      setLastClose({
        sitting_id: data.sitting_id ?? "",
        records: data.records ?? [],
      });
      setThread([]);
      startTransition(() => router.refresh());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not close sitting."
      );
    } finally {
      setClosing(false);
    }
  }

  return (
    <section className="border-t border-white/10 pt-8">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-zinc-500">
            Ask Atlas
          </h2>
          <p className="mt-2 text-sm text-zinc-500">
            Institutional counsel after the operating picture. This sitting is
            Temporary.
          </p>
        </div>
        {thread.length > 0 ? (
          <button
            type="button"
            onClick={handleCloseSitting}
            disabled={loading || closing}
            className="border border-white/15 px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] text-zinc-300 transition hover:border-white/30 hover:text-zinc-50 disabled:opacity-40"
          >
            {closing ? "Closing…" : "Close sitting"}
          </button>
        ) : null}
      </div>

      {thread.length > 0 ? (
        <ol className="mb-6 space-y-4">
          {thread.map((turn, index) => (
            <li key={`${turn.role}-${index}`}>
              <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-600">
                {turn.role === "user" ? "You" : "Atlas"}
              </p>
              <p className="mt-1 whitespace-pre-wrap text-sm leading-7 text-zinc-200">
                {turn.content}
              </p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mb-6 text-sm leading-6 text-zinc-600">
          Atlas answers from the Founder Brief, Constitution, Forge Laws,
          Philosophy, Projects, Decisions, Roadmap, and Metrics. Close the
          sitting to run Memory Keeper. Raw chat is never Canonical.
        </p>
      )}

      <form onSubmit={handleAsk} className="space-y-4">
        <label className="block" htmlFor="atlas-message">
          <span className="sr-only">Ask Atlas</span>
          <textarea
            id="atlas-message"
            name="message"
            ref={textareaRef}
            rows={3}
            placeholder={
              thread.length > 0
                ? "Follow up — Atlas still has this sitting."
                : "Challenge this priority. What am I missing?"
            }
            disabled={loading || closing}
            className="w-full resize-y border border-white/10 bg-[#111318] px-4 py-3 text-sm leading-6 text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-white/25 disabled:opacity-60"
          />
        </label>
        <button
          type="submit"
          disabled={loading || closing}
          className="border border-white/15 bg-zinc-100 px-5 py-2.5 text-sm font-medium text-zinc-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "Asking Atlas..." : "Ask Atlas"}
        </button>
      </form>

      {error ? (
        <p className="mt-4 text-sm leading-6 text-red-300" role="alert">
          {error}
        </p>
      ) : null}

      {lastClose ? (
        <div className="mt-6 border border-white/10 px-4 py-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
            Sitting closed · Memory Keeper · not Canonical
          </p>
          {lastClose.records.length === 0 ? (
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Nothing durable extracted. Temporary sitting ended.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {lastClose.records.map((record) => (
                <li key={record.id}>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-600">
                    {classLabel(record)} · {record.kind} · not Canonical
                  </p>
                  <p className="mt-1 text-sm text-zinc-200">{record.summary}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  );
}
