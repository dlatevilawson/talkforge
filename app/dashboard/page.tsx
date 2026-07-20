"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AppShell from "@/app/components/AppShell";
import MissionPicker from "@/app/components/MissionPicker";
import PersistenceStatus from "@/app/components/PersistenceStatus";
import { getProgressSummary, getUser, listSessions } from "@/lib/storage";
import { getTransferSummary } from "@/lib/transfer";
import type {
  PracticeSession,
  ProgressSummary,
  TalkForgeUser,
  TransferSummary,
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
  const [transfer, setTransfer] = useState<TransferSummary>({
    eventsNamed: 0,
    sessionsLinkedToEvents: 0,
    realityCaptures: 0,
    conversationsAttempted: 0,
  });
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
        const transferSummary = getTransferSummary(currentUser?.id);

        if (cancelled) return;
        setUser(currentUser);
        setProgress(summary);
        setRecent(sessions.slice(0, 3));
        setTransfer(transferSummary);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load dashboard."
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

  return (
    <AppShell>
      <div className="mb-6">
        <PersistenceStatus />
      </div>
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8">
        <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
          Home Dashboard
        </p>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
          Welcome back{user ? `, ${user.displayName}` : ""}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
          V1 wedge: technical interview prep. North Star is transfer — better
          performance in the real conversation, not time in Forge.
        </p>

        {error && (
          <p className="mt-4 text-sm text-red-300" role="alert">
            {error}
          </p>
        )}

        {loading ? (
          <p className="mt-8 text-sm text-zinc-500">Loading stats from Supabase…</p>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="text-sm text-zinc-500">Events named</p>
              <p className="mt-2 text-3xl font-semibold">{transfer.eventsNamed}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="text-sm text-zinc-500">Reality captures</p>
              <p className="mt-2 text-3xl font-semibold">
                {transfer.realityCaptures}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="text-sm text-zinc-500">Real attempts</p>
              <p className="mt-2 text-3xl font-semibold">
                {transfer.conversationsAttempted}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <p className="text-sm text-zinc-500">Sessions · avg score</p>
              <p className="mt-2 text-3xl font-semibold">
                {progress.sessionsCompleted}
                <span className="text-lg text-zinc-400">
                  {" "}
                  · {progress.averageScore}
                </span>
              </p>
            </div>
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/prepare"
            className="rounded-full bg-blue-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-400"
          >
            Prepare for an interview
          </Link>
          <Link
            href="/progress"
            className="rounded-full border border-white/15 px-5 py-3 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
          >
            View progress
          </Link>
          {!user && (
            <Link
              href="/auth"
              className="rounded-full border border-white/15 px-5 py-3 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
            >
              Continue as Guest
            </Link>
          )}
        </div>
      </section>

      <div className="mt-10">
        <MissionPicker title="Choose your next forge" />
      </div>

      <section className="mt-10">
        <h2 className="text-xl font-semibold">Recent sessions</h2>
        {recent.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">
            Complete a mission and reflection to see your history here.
          </p>
        ) : (
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
                  <p className="text-sm text-zinc-300">
                    Score {session.averageScore ?? "—"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
