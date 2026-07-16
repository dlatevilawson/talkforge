"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import AppShell from "@/app/components/AppShell";
import { ensureGuestUser } from "@/lib/auth";
import {
  getReflection,
  getSession,
  saveReflection,
} from "@/lib/storage";
import type { PracticeSession, Reflection } from "@/lib/types";

export default function ReflectPage() {
  const params = useParams<{ sessionId: string }>();
  const router = useRouter();
  const wentWellRef = useRef<HTMLTextAreaElement>(null);
  const improveRef = useRef<HTMLTextAreaElement>(null);
  const [error, setError] = useState("");
  const [satisfaction, setSatisfaction] = useState(4);
  const [session, setSession] = useState<PracticeSession | null>(null);
  const [existing, setExisting] = useState<Reflection | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const current = await getSession(params.sessionId);
        const reflection = await getReflection(params.sessionId);
        if (cancelled) return;
        setSession(current);
        setExisting(reflection);
        if (reflection?.coachSatisfaction) {
          setSatisfaction(reflection.coachSatisfaction);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load session."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [params.sessionId]);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!session) return;

    const wentWell = wentWellRef.current?.value.trim() ?? "";
    const improveNext = improveRef.current?.value.trim() ?? "";

    if (!wentWell || !improveNext) {
      setError("Add a short reflection in both fields before continuing.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const user = await ensureGuestUser();
      await saveReflection({
        sessionId: session.id,
        userId: user.id,
        wentWell,
        improveNext,
        coachSatisfaction: satisfaction,
        createdAt: new Date().toISOString(),
      });
      router.push("/progress");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save reflection."
      );
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <p className="text-sm text-zinc-500">Loading session from Supabase…</p>
      </AppShell>
    );
  }

  if (!session) {
    return (
      <AppShell>
        <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <h1 className="text-2xl font-semibold">Session not found</h1>
          <p className="mt-3 text-sm text-zinc-400">
            This practice session could not be loaded from Supabase.
          </p>
          {error && (
            <p className="mt-3 text-sm text-red-300" role="alert">
              {error}
            </p>
          )}
          <Link
            href="/dashboard"
            className="mt-6 inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-black"
          >
            Back to dashboard
          </Link>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <section className="max-w-2xl">
        <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
          Reflection Screen
        </p>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
          Capture what you learned
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400 sm:text-base">
          People improve through practice, feedback, and reflection. Write down
          one strength and one improvement before you move on.
        </p>
      </section>

      <section className="mt-8 max-w-2xl rounded-3xl border border-white/10 bg-white/5 p-6">
        <p className="text-sm text-zinc-500">Mission</p>
        <p className="mt-1 text-lg font-medium">{session.scenarioTitle}</p>
        <p className="mt-3 text-sm text-zinc-400">
          Average coaching score: {session.averageScore ?? "—"}
        </p>
        <p className="mt-1 text-sm text-zinc-500">
          Turns coached:{" "}
          {session.turns.filter((turn) => turn.role === "forge").length}
        </p>
      </section>

      <form onSubmit={handleSave} className="mt-8 max-w-2xl space-y-6">
        <label className="block" htmlFor="went-well">
          <span className="text-sm text-zinc-300">What did you do well?</span>
          <textarea
            id="went-well"
            name="wentWell"
            key={`went-${existing?.createdAt ?? "new"}`}
            ref={wentWellRef}
            rows={4}
            defaultValue={existing?.wentWell ?? ""}
            disabled={saving}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm leading-6 text-white outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 disabled:opacity-60"
            placeholder="Name one specific strength from this conversation."
          />
        </label>

        <label className="block" htmlFor="improve-next">
          <span className="text-sm text-zinc-300">
            What will you improve next time?
          </span>
          <textarea
            id="improve-next"
            name="improveNext"
            key={`improve-${existing?.createdAt ?? "new"}`}
            ref={improveRef}
            rows={4}
            defaultValue={existing?.improveNext ?? ""}
            disabled={saving}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm leading-6 text-white outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 disabled:opacity-60"
            placeholder="Choose one concrete improvement to practice outside the app."
          />
        </label>

        <fieldset>
          <legend className="text-sm text-zinc-300">
            How helpful was Forge this session?
          </legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setSatisfaction(value)}
                aria-pressed={satisfaction === value}
                disabled={saving}
                className={`rounded-full px-4 py-2 text-sm ${
                  satisfaction === value
                    ? "bg-blue-500 text-white"
                    : "border border-white/15 text-zinc-300 hover:bg-white/10"
                }`}
              >
                {value}
              </button>
            ))}
          </div>
        </fieldset>

        {error && (
          <p className="text-sm text-red-300" role="alert">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-blue-500 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:opacity-60"
          >
            {saving ? "Saving to Supabase..." : "Save reflection"}
          </button>
          <Link
            href="/dashboard"
            className="rounded-full border border-white/15 px-6 py-3 text-sm text-zinc-200 hover:bg-white/10"
          >
            Skip for now
          </Link>
        </div>
      </form>
    </AppShell>
  );
}
