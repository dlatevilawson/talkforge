"use client";

import { useCallback } from "react";
import Link from "next/link";
import AppShell from "@/app/components/AppShell";
import { ensureGuestUser } from "@/lib/auth";
import { getProgressSummary, listReflections, listSessions } from "@/lib/storage";
import { useLocalData } from "@/lib/use-local-data";

export default function ProgressPage() {
  const getClientValue = useCallback(() => {
    const user = ensureGuestUser();
    return {
      progress: getProgressSummary(user.id),
      sessions: listSessions().filter(
        (session) => session.userId === user.id && session.completedAt
      ),
      reflections: listReflections().filter(
        (reflection) => reflection.userId === user.id
      ),
    };
  }, []);

  const data = useLocalData(getClientValue, null);

  const progress = data?.progress ?? {
    sessionsCompleted: 0,
    averageScore: 0,
    lastSessionAt: null,
    lastScenarioTitle: null,
  };
  const sessions = data?.sessions ?? [];
  const reflections = data?.reflections ?? [];

  return (
    <AppShell>
      <section>
        <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
          Progress Screen
        </p>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">Your results</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
          Measure outcomes, not activity. Sessions completed and coaching quality
          matter more than time spent.
        </p>
      </section>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm text-zinc-500">Sessions completed</p>
          <p className="mt-2 text-3xl font-semibold">
            {progress.sessionsCompleted}
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm text-zinc-500">Average coaching score</p>
          <p className="mt-2 text-3xl font-semibold">{progress.averageScore}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-sm text-zinc-500">Reflections saved</p>
          <p className="mt-2 text-3xl font-semibold">{reflections.length}</p>
        </div>
      </div>

      <section className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Completed sessions</h2>
          <Link
            href="/training"
            className="rounded-full border border-white/15 px-4 py-2 text-sm text-zinc-200 hover:bg-white/10"
          >
            Practice again
          </Link>
        </div>

        {sessions.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">
            No completed sessions yet. Finish a mission and reflection to track
            progress.
          </p>
        ) : (
          <ul className="mt-4 space-y-3">
            {sessions.map((session) => {
              const reflection = reflections.find(
                (item) => item.sessionId === session.id
              );
              return (
                <li
                  key={session.id}
                  className="rounded-2xl border border-white/10 bg-white/5 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{session.scenarioTitle}</p>
                      <p className="mt-1 text-sm text-zinc-500">
                        {session.completedAt
                          ? new Date(session.completedAt).toLocaleString()
                          : "In progress"}
                      </p>
                    </div>
                    <p className="text-sm text-zinc-300">
                      Score {session.averageScore ?? "—"}
                    </p>
                  </div>
                  {reflection && (
                    <p className="mt-3 text-sm leading-6 text-zinc-400">
                      Next focus: {reflection.improveNext}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </AppShell>
  );
}
