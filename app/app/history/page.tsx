"use client";

import { useEffect, useState } from "react";
import PracticeHistoryGrid from "@/app/components/PracticeHistoryGrid";
import {
  getProgressSummary,
  getUser,
  listSessionReports,
  listSessions,
} from "@/lib/storage";
import { formatDuration } from "@/lib/system2/practice-history-display";
import type {
  PracticeSession,
  ProgressSummary,
  SessionReport,
  TalkForgeUser,
} from "@/lib/types";

/**
 * Training History — exclusive owner of past practice session cards / logs.
 * Progress analytics live on /app/progress.
 */
export default function TrainingHistoryPage() {
  const [user, setUser] = useState<TalkForgeUser | null>(null);
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [reports, setReports] = useState<SessionReport[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
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
            setReports([]);
            setError(
              currentUser?.isGuest
                ? "Guest identity is no longer active. Please sign in again."
                : "Could not load your training history. Please sign in again."
            );
          }
          return;
        }

        const [summary, history, sessionReports] = await Promise.all([
          getProgressSummary(currentUser.id),
          listSessions(currentUser.id).then((rows) =>
            rows.filter((session) => session.completedAt)
          ),
          listSessionReports(currentUser.id),
        ]);

        if (cancelled) return;
        setUser(currentUser);
        setProgress(summary);
        setSessions(history);
        setReports(sessionReports);
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

  const detailReports =
    reports.length > 0
      ? reports
      : sessions.map(
          (session, index): SessionReport => ({
            sessionId: session.id,
            userId: session.userId,
            sessionNumber: sessions.length - index,
            modality: session.modality ?? "text",
            durationSeconds: session.durationSeconds ?? null,
            overallScore: session.averageScore ?? null,
            confidence: null,
            empathy: null,
            listening: null,
            clarity: null,
            storytelling: null,
            negotiation: null,
            leadership: null,
            questionsAsked: 0,
            interruptions: 0,
            fillerWords: 0,
            breakthrough: "",
            biggestWeakness: "",
            homework: "",
            coachSummary: "",
            transcript: [],
            createdAt: session.completedAt ?? session.startedAt,
            scenarioTitle: session.scenarioTitle,
            startedAt: session.startedAt,
            completedAt: session.completedAt,
          })
        );

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
          Review past practice reps, voice transcripts, and coaching
          breakdowns.
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
        <h2 className="text-lg font-semibold tracking-tight">Recent practice</h2>
        {loading ? (
          <p className="mt-4 text-sm text-zinc-500">Loading sessions…</p>
        ) : (
          <PracticeHistoryGrid sessions={sessions} />
        )}
      </section>

      {!loading && detailReports.length > 0 ? (
        <section className="mt-12 max-w-3xl">
          <h2 className="text-lg font-semibold tracking-tight">
            Detailed session logs
          </h2>
          <ul className="mt-4 space-y-3">
            {detailReports.map((report) => {
              const open = expandedId === report.sessionId;
              return (
                <li
                  key={report.sessionId}
                  className="rounded-2xl border border-white/10 bg-white/5 p-5"
                >
                  <button
                    type="button"
                    className="flex w-full flex-wrap items-start justify-between gap-3 text-left"
                    onClick={() =>
                      setExpandedId(open ? null : report.sessionId)
                    }
                  >
                    <div>
                      <p className="font-medium">
                        Session #{report.sessionNumber} ·{" "}
                        {report.scenarioTitle || "Practice"}
                      </p>
                      <p className="mt-1 text-sm text-zinc-500">
                        {report.completedAt || report.createdAt
                          ? new Date(
                              report.completedAt ?? report.createdAt
                            ).toLocaleString()
                          : "Completed"}
                        {" · "}
                        {formatDuration(report.durationSeconds) ?? "—"}
                        {" · "}
                        {report.modality}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-semibold tabular-nums">
                        {report.overallScore ?? "—"}
                      </p>
                      <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
                        overall
                      </p>
                    </div>
                  </button>

                  {open ? (
                    <div className="mt-5 space-y-4 border-t border-white/10 pt-5">
                      {report.coachSummary ? (
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                            Coach summary
                          </p>
                          <p className="mt-2 text-sm leading-6 text-zinc-300">
                            {report.coachSummary}
                          </p>
                        </div>
                      ) : null}
                      {report.transcript.length > 0 ? (
                        <div>
                          <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                            Conversation transcript
                          </p>
                          <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto text-sm leading-6 text-zinc-300">
                            {report.transcript.map((turn, i) => (
                              <li key={`${report.sessionId}-${i}`}>
                                <span className="text-zinc-500">
                                  {turn.role === "user" ? "You" : "Forge"}:
                                </span>{" "}
                                {turn.text}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <p className="text-sm text-zinc-500">
                          No transcript stored for this session.
                        </p>
                      )}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </>
  );
}
