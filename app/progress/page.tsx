"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AppShell from "@/app/components/AppShell";
import {
  getProgressSummary,
  getUser,
  listReflections,
  listSessions,
} from "@/lib/storage";
import { getTransferSummary, listRealityCaptures } from "@/lib/transfer";
import type {
  PracticeSession,
  ProgressSummary,
  RealityCapture,
  Reflection,
  TransferSummary,
} from "@/lib/types";

export default function ProgressPage() {
  const [progress, setProgress] = useState<ProgressSummary>({
    sessionsCompleted: 0,
    averageScore: 0,
    lastSessionAt: null,
    lastScenarioTitle: null,
  });
  const [transfer, setTransfer] = useState<TransferSummary>({
    eventsNamed: 0,
    sessionsLinkedToEvents: 0,
    realityCaptures: 0,
    conversationsAttempted: 0,
  });
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [realities, setRealities] = useState<RealityCapture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const user = await getUser();
        const summary = await getProgressSummary(user?.id);
        const allSessions = user
          ? (await listSessions(user.id)).filter((session) => session.completedAt)
          : [];
        const allReflections = user ? await listReflections(user.id) : [];
        const transferSummary = getTransferSummary(user?.id);
        const allRealities = listRealityCaptures(user?.id);

        if (cancelled) return;
        setProgress(summary);
        setSessions(allSessions);
        setReflections(allReflections);
        setTransfer(transferSummary);
        setRealities(allRealities);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load progress."
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

  const empty = !loading && progress.sessionsCompleted === 0 && sessions.length === 0;

  return (
    <AppShell>
      <section>
        <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
          Progress
        </p>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
          How you’re growing
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
          What matters most is the conversation outside TalkForge. Practice here
          so you walk into that moment clearer and calmer.
        </p>
        <div className="mt-6">
          <Link
            href="/voice"
            className="inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
          >
            Practice with Forge
          </Link>
        </div>
      </section>

      {error && (
        <p className="mt-4 text-sm text-red-300" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-8 text-sm text-zinc-500">Loading your progress…</p>
      ) : empty ? (
        <div className="mt-10 rounded-2xl border border-dashed border-white/15 bg-white/5 px-5 py-6">
          <p className="text-base font-medium text-white/90">
            Nothing here yet — and that’s okay
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Complete one practice session with Forge. Your progress will show up
            here so you can see yourself getting ready.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm text-zinc-500">Sessions completed</p>
              <p className="mt-2 text-3xl font-semibold">
                {progress.sessionsCompleted}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm text-zinc-500">Conversations named</p>
              <p className="mt-2 text-3xl font-semibold">{transfer.eventsNamed}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm text-zinc-500">Real attempts logged</p>
              <p className="mt-2 text-3xl font-semibold">
                {transfer.conversationsAttempted}
              </p>
            </div>
          </div>

          <section className="mt-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">Completed sessions</h2>
              <Link
                href="/prepare"
                className="rounded-full border border-white/15 px-4 py-2 text-sm text-zinc-200 hover:bg-white/10"
              >
                Name a conversation
              </Link>
            </div>

            <ul className="mt-4 space-y-3">
              {sessions.map((session) => {
                const reflection = reflections.find(
                  (item) => item.sessionId === session.id
                );
                const reality = realities.find(
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
                      <Link
                        href="/voice"
                        className="text-sm text-zinc-300 underline-offset-4 hover:underline"
                      >
                        Practice again
                      </Link>
                    </div>
                    {reflection && (
                      <p className="mt-3 text-sm leading-6 text-zinc-400">
                        Next focus: {reflection.improveNext}
                      </p>
                    )}
                    {reality ? (
                      <p className="mt-2 text-sm text-emerald-300/90">
                        Real conversation logged
                        {reality.outcomeSignal !== "na"
                          ? ` · ${reality.outcomeSignal}`
                          : ""}
                      </p>
                    ) : (
                      <Link
                        href={`/reality/${session.id}`}
                        className="mt-3 inline-block text-sm text-zinc-300 underline-offset-4 hover:underline"
                      >
                        Log how the real conversation went
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}
    </AppShell>
  );
}
