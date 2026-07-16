"use client";

import Link from "next/link";
import AppShell from "@/app/components/AppShell";
import MissionPicker from "@/app/components/MissionPicker";
import { ensureGuestUser } from "@/lib/auth";
import { getProgressSummary, listSessions } from "@/lib/storage";
import { useLocalData } from "@/lib/use-local-data";

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
  const data = useLocalData(() => {
    const user = ensureGuestUser();
    return {
      user,
      progress: getProgressSummary(user.id),
      recent: listSessions()
        .filter((session) => session.userId === user.id && session.completedAt)
        .slice(0, 3),
    };
  }, null);

  const user = data?.user ?? null;
  const progress = data?.progress ?? {
    sessionsCompleted: 0,
    averageScore: 0,
    lastSessionAt: null,
    lastScenarioTitle: null,
  };
  const recent = data?.recent ?? [];

  return (
    <AppShell>
      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8">
        <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
          Home Dashboard
        </p>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
          Welcome back{user ? `, ${user.displayName}` : ""}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
          Practice, get coaching, reflect, and track progress. Success is
          measured by conversations outside the app.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <p className="text-sm text-zinc-500">Sessions completed</p>
            <p className="mt-2 text-3xl font-semibold">
              {progress.sessionsCompleted}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <p className="text-sm text-zinc-500">Average score</p>
            <p className="mt-2 text-3xl font-semibold">{progress.averageScore}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
            <p className="text-sm text-zinc-500">Last session</p>
            <p className="mt-2 text-lg font-medium">
              {progress.lastScenarioTitle ?? "None yet"}
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              {formatDate(progress.lastSessionAt)}
            </p>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/training"
            className="rounded-full bg-blue-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-400"
          >
            Start practicing
          </Link>
          <Link
            href="/progress"
            className="rounded-full border border-white/15 px-5 py-3 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
          >
            View progress
          </Link>
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
