"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getGrowthSummary,
  getProgressSummary,
  getUser,
  listSessionReports,
  listSessions,
} from "@/lib/storage";
import type {
  GrowthSummary,
  PracticeSession,
  ProgressSummary,
  SessionReport,
  SkillKey,
} from "@/lib/types";

const SKILL_LABELS: Record<SkillKey, string> = {
  confidence: "Confidence",
  empathy: "Empathy",
  listening: "Listening",
  clarity: "Clarity",
  storytelling: "Storytelling",
  negotiation: "Negotiation",
  leadership: "Leadership",
};

function SkillBar({ label, value }: { label: string; value: number }) {
  const width = Math.max(4, Math.min(100, value || 0));
  return (
    <div>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-zinc-300">{label}</span>
        <span className="tabular-nums text-zinc-500">{value || "—"}</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-500/80 to-emerald-400/80 transition-all duration-700"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return "—";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s ? `${m}m ${s}s` : `${m}m`;
}

export default function ProgressPage() {
  const [progress, setProgress] = useState<ProgressSummary>({
    sessionsCompleted: 0,
    averageScore: 0,
    lastSessionAt: null,
    lastScenarioTitle: null,
  });
  const [growth, setGrowth] = useState<GrowthSummary | null>(null);
  const [reports, setReports] = useState<SessionReport[]>([]);
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const user = await getUser();
        if (!user) {
          if (!cancelled) {
            setLoading(false);
            setError("Sign in to see your communication history.");
          }
          return;
        }

        const [summary, growthSummary, sessionReports, allSessions] =
          await Promise.all([
            getProgressSummary(user.id),
            getGrowthSummary(user.id),
            listSessionReports(user.id),
            listSessions(user.id),
          ]);

        if (cancelled) return;
        setProgress(summary);
        setGrowth(growthSummary);
        setReports(sessionReports);
        setSessions(allSessions.filter((session) => session.completedAt));
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

  const empty =
    !loading &&
    progress.sessionsCompleted === 0 &&
    sessions.length === 0 &&
    reports.length === 0;

  const skills = growth?.skills;
  const maxTrend = Math.max(
    1,
    ...(growth?.trend30d.map((d) => d.averageScore) ?? [1])
  );

  return (
    <>
      <section>
        <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
          Progress
        </p>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
          How you’re growing
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
          Every practice session becomes permanent history. Forge uses it to
          coach you like someone who knows you — not a stranger every time.
        </p>
        <div className="mt-6">
          <Link
            href="/app/practice"
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
            Complete one practice session with Forge. Your scores, transcript,
            and coach summary will show up here permanently.
          </p>
        </div>
      ) : (
        <>
          {growth?.adaptiveInsight ? (
            <section className="mt-8 rounded-2xl border border-sky-400/20 bg-sky-500/10 px-5 py-5">
              <p className="text-xs uppercase tracking-[0.2em] text-sky-200/70">
                Coach insight
              </p>
              <p className="mt-2 text-base leading-7 text-zinc-100">
                {growth.adaptiveInsight}
              </p>
            </section>
          ) : null}

          <section className="mt-10">
            <h2 className="text-xl font-semibold">Communication skills</h2>
            <p className="mt-2 text-sm text-zinc-500">
              Averaged from your permanent session reports.
            </p>
            <div className="mt-6 space-y-4">
              {(Object.keys(SKILL_LABELS) as SkillKey[]).map((key) => (
                <SkillBar
                  key={key}
                  label={SKILL_LABELS[key]}
                  value={skills?.[key] ?? 0}
                />
              ))}
            </div>
          </section>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Sessions completed"
              value={String(growth?.sessionsCompleted ?? progress.sessionsCompleted)}
            />
            <Stat
              label="Best coaching score"
              value={String(growth?.bestScore || progress.averageScore || "—")}
            />
            <Stat
              label="Hours practiced"
              value={String(growth?.hoursPracticed ?? 0)}
            />
            <Stat
              label="Streak"
              value={`${growth?.streakDays ?? 0} day${
                (growth?.streakDays ?? 0) === 1 ? "" : "s"
              }`}
            />
            <Stat
              label="Avg filler words"
              value={String(growth?.averageFillerWords ?? "—")}
            />
            <Stat
              label="Longest conversation"
              value={formatDuration(growth?.longestConversationSeconds)}
            />
            <Stat
              label="Average score"
              value={String(growth?.averageScore || progress.averageScore || "—")}
            />
            <Stat
              label="Last practice"
              value={
                growth?.lastScenarioTitle ||
                progress.lastScenarioTitle ||
                "—"
              }
              detail={
                growth?.lastSessionAt
                  ? new Date(growth.lastSessionAt).toLocaleDateString()
                  : undefined
              }
            />
          </div>

          {growth && growth.trend30d.length > 0 ? (
            <section className="mt-10">
              <h2 className="text-xl font-semibold">30-day trend</h2>
              <div className="mt-5 flex h-36 items-end gap-1.5">
                {growth.trend30d.map((day) => (
                  <div
                    key={day.date}
                    className="group relative flex-1"
                    title={`${day.date}: ${day.averageScore} avg · ${day.sessions} session(s)`}
                  >
                    <div
                      className="w-full rounded-t bg-gradient-to-t from-sky-600/70 to-emerald-400/80 transition group-hover:opacity-90"
                      style={{
                        height: `${Math.max(
                          8,
                          (day.averageScore / maxTrend) * 100
                        )}%`,
                      }}
                    />
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-zinc-500">
                Daily average coaching score · last 30 days
              </p>
            </section>
          ) : null}

          <section className="mt-10">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-semibold">Session history</h2>
              <Link
                href="/app/practice"
                className="rounded-full border border-white/15 px-4 py-2 text-sm text-zinc-200 hover:bg-white/10"
              >
                Practice again
              </Link>
            </div>

            <ul className="mt-4 space-y-3">
              {(reports.length > 0
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
                  )
              ).map((report) => {
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
                          {formatDuration(report.durationSeconds)}
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
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                          <MiniStat label="Confidence" value={report.confidence} />
                          <MiniStat label="Empathy" value={report.empathy} />
                          <MiniStat label="Listening" value={report.listening} />
                          <MiniStat label="Clarity" value={report.clarity} />
                          <MiniStat
                            label="Questions"
                            value={report.questionsAsked}
                          />
                          <MiniStat
                            label="Interruptions"
                            value={report.interruptions}
                          />
                          <MiniStat
                            label="Filler words"
                            value={report.fillerWords}
                          />
                        </div>

                        {report.coachSummary ? (
                          <Block title="Coach summary" body={report.coachSummary} />
                        ) : null}
                        {report.breakthrough ? (
                          <Block
                            title="Today's breakthrough"
                            body={report.breakthrough}
                          />
                        ) : null}
                        {report.biggestWeakness ? (
                          <Block
                            title="Biggest weakness"
                            body={report.biggestWeakness}
                          />
                        ) : null}
                        {report.homework ? (
                          <Block title="Homework" body={report.homework} />
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
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}
    </>
  );
}

function Stat({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <p className="text-sm text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
      {detail ? <p className="mt-1 text-xs text-zinc-500">{detail}</p> : null}
    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: number | null | undefined;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
      <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-lg font-medium tabular-nums text-zinc-100">
        {typeof value === "number" ? value : "—"}
      </p>
    </div>
  );
}

function Block({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
        {title}
      </p>
      <p className="mt-2 text-sm leading-6 text-zinc-300">{body}</p>
    </div>
  );
}
