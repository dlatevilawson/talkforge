"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import PracticeHistoryGrid from "@/app/components/PracticeHistoryGrid";
import { getProgressSummary, getUser, listSessions } from "@/lib/storage";
import type {
  PracticeSession,
  ProgressSummary,
  TalkForgeUser,
} from "@/lib/types";

/**
 * Training History — exclusive owner of past practice session cards.
 * Living Profile must not duplicate this surface.
 */
export default function TrainingHistoryPage() {
  const [user, setUser] = useState<TalkForgeUser | null>(null);
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const currentUser = await getUser();
        if (!currentUser || currentUser.isGuest) {
          if (!cancelled) {
            setUser(null);
            setProgress(null);
            setSessions([]);
            setError(
              currentUser?.isGuest
                ? "Guest identity is no longer active. Please sign in again."
                : "Could not load your training history. Please sign in again."
            );
          }
          return;
        }

        const [summary, history] = await Promise.all([
          getProgressSummary(currentUser.id),
          listSessions(currentUser.id).then((rows) =>
            rows.filter((session) => session.completedAt)
          ),
        ]);

        if (cancelled) return;
        setUser(currentUser);
        setProgress(summary);
        setSessions(history);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Failed to load training history."
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
  }, []);

  const displayName =
    user?.displayName && user.displayName !== "Guest"
      ? user.displayName
      : null;

  return (
    <>
      <section className="max-w-3xl">
        <p className="text-sm uppercase tracking-[0.24em] text-[#c9a95f]">
          Training history
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          {displayName ? `${displayName}’s practice` : "Your practice"}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
          Completed sessions live here — Voice and Text reps, duration, and
          poise. Living Profile stays for focus and identity only.
        </p>
        <p className="mt-2 text-sm text-zinc-500">
          <Link href="/app" className="underline-offset-4 hover:underline">
            Return to Home
          </Link>
          {" · "}
          <Link
            href="/app/profile"
            className="underline-offset-4 hover:underline"
          >
            Living Profile
          </Link>
        </p>

        {error ? (
          <p className="mt-4 text-sm text-red-300" role="alert">
            {error}
          </p>
        ) : null}

        {!loading && progress ? (
          <div className="mt-8 grid max-w-xl grid-cols-2 gap-3">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs text-zinc-500">Sessions completed</p>
              <p className="mt-1 text-2xl font-semibold text-white">
                {progress.sessionsCompleted}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <p className="text-xs text-zinc-500">Last practice</p>
              <p className="mt-1 line-clamp-2 text-sm font-medium text-white">
                {progress.lastScenarioTitle ?? "—"}
              </p>
            </div>
          </div>
        ) : null}
      </section>

      <section className="mt-10 max-w-3xl">
        <h2 className="text-lg font-semibold tracking-tight">
          Recent practice
        </h2>
        {loading ? (
          <p className="mt-4 text-sm text-zinc-500">Loading sessions…</p>
        ) : (
          <PracticeHistoryGrid sessions={sessions} />
        )}
      </section>
    </>
  );
}
