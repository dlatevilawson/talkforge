"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AppShell from "@/app/components/AppShell";
import { getProgressSummary, getUser, listSessions } from "@/lib/storage";
import type {
  PracticeSession,
  ProgressSummary,
  TalkForgeUser,
} from "@/lib/types";

function formatDate(value: string | null): string {
  if (!value) return "No sessions yet";
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function DashboardPage() {
  const [user, setUser] = useState<TalkForgeUser | null>(null);
  const [progress, setProgress] = useState<ProgressSummary>({
    sessionsCompleted: 0,
    averageScore: 0,
    lastSessionAt: null,
    lastScenarioTitle: null,
  });
  const [recent, setRecent] = useState<PracticeSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const currentUser = await getUser();
        const summary = await getProgressSummary(currentUser?.id);
        const sessions = currentUser
          ? (await listSessions(currentUser.id)).filter(
              (session) => session.completedAt
            )
          : [];

        if (cancelled) return;
        setUser(currentUser);
        setProgress(summary);
        setRecent(sessions.slice(0, 3));
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load your home."
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
  const hasPractice = progress.sessionsCompleted > 0 || recent.length > 0;

  return (
    <AppShell>
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8">
        <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
          TalkForge
        </p>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
          {displayName ? `Welcome back, ${displayName}` : "Welcome back"}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
          {hasPractice
            ? "Your next rep is waiting. Practice now — then take one clearer move into the real conversation."
            : "You’re in the right place. Let’s get you onto the floor with Forge — no performance required."}
        </p>

        {error && (
          <p className="mt-4 text-sm text-red-300" role="alert">
            {error}
          </p>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/voice"
            className="rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-black transition hover:bg-zinc-200"
          >
            {hasPractice ? "Practice with Forge" : "Begin with Forge"}
          </Link>
          <Link
            href="/prepare"
            className="rounded-full border border-white/15 px-5 py-3.5 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
          >
            Name what you’re preparing for
          </Link>
        </div>

        {loading ? (
          <p className="mt-10 text-sm text-zinc-500">Getting your space ready…</p>
        ) : hasPractice ? (
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="text-sm text-zinc-500">Sessions completed</p>
              <p className="mt-2 text-3xl font-semibold">
                {progress.sessionsCompleted}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="text-sm text-zinc-500">Last practice</p>
              <p className="mt-2 text-lg font-medium leading-7">
                {progress.lastScenarioTitle ?? "Recent session"}
              </p>
              <p className="mt-1 text-sm text-zinc-500">
                {formatDate(progress.lastSessionAt)}
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-10 rounded-2xl border border-dashed border-white/15 bg-black/20 px-5 py-6">
            <p className="text-base font-medium text-white/90">
              Your first session is waiting
            </p>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Forge will greet you, learn what you’re here for, and practice with
              you — gently at first.
            </p>
          </div>
        )}
      </section>

      {recent.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-semibold">Recent practice</h2>
          <ul className="mt-4 space-y-3">
            {recent.map((session) => (
              <li
                key={session.id}
                className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{session.scenarioTitle}</p>
                    <p className="mt-1 text-sm text-zinc-500">
                      {formatDate(session.completedAt ?? null)}
                    </p>
                  </div>
                  <Link
                    href="/voice"
                    className="text-sm text-zinc-300 underline-offset-4 hover:underline"
                  >
                    Practice again
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </AppShell>
  );
}
