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
import { shouldShowOverall } from "@/lib/coach/progress-display";
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

/** Practice shape — scores stay; labels are member-facing, not a dashboard brand. */
function SkillsWaveform({
  skills,
  showOverall,
}: {
  skills: Partial<Record<SkillKey, number>> | undefined;
  showOverall: boolean;
}) {
  const keys = Object.keys(SKILL_LABELS) as SkillKey[];
  const values = keys.map((key) =>
    Math.max(0, Math.min(100, Number(skills?.[key] ?? 0)))
  );
  const avg =
    values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);

  // Build a smooth audio-style path from skill amplitudes.
  const width = 640;
  const height = 160;
  const mid = height / 2;
  const step = width / (values.length * 4);
  const points: string[] = [];
  for (let i = 0; i <= values.length * 4; i += 1) {
    const skillIndex = Math.min(values.length - 1, Math.floor(i / 4));
    const nextIndex = Math.min(values.length - 1, skillIndex + 1);
    const t = (i % 4) / 4;
    const amplitude =
      (values[skillIndex] * (1 - t) + values[nextIndex] * t) / 100;
    const envelope = 0.35 + 0.65 * Math.sin((i / (values.length * 4)) * Math.PI);
    const y = mid - amplitude * envelope * (mid - 18);
    const x = i * step;
    points.push(`${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  // Mirror lower half for a full waveform silhouette.
  for (let i = values.length * 4; i >= 0; i -= 1) {
    const skillIndex = Math.min(values.length - 1, Math.floor(i / 4));
    const nextIndex = Math.min(values.length - 1, skillIndex + 1);
    const t = (i % 4) / 4;
    const amplitude =
      (values[skillIndex] * (1 - t) + values[nextIndex] * t) / 100;
    const envelope = 0.35 + 0.65 * Math.sin((i / (values.length * 4)) * Math.PI);
    const y = mid + amplitude * envelope * (mid - 18);
    const x = i * step;
    points.push(`L ${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  points.push("Z");
  const path = points.join(" ");
  const strokePoints = keys
    .map((_, index) => {
      const x = ((index + 0.5) / keys.length) * width;
      const amplitude = values[index] / 100;
      const y = mid - amplitude * 0.85 * (mid - 18);
      return `${index === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <div className="overflow-hidden rounded-[1.6rem] border border-white/10 bg-gradient-to-b from-[#16191e] to-[#0c0d10] p-4 sm:p-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-[#c9a95f]">
            How you showed up
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            From your sessions — not a quiz.
          </p>
        </div>
        {showOverall ? (
          <p className="text-right">
            <span className="block text-[0.65rem] uppercase tracking-[0.16em] text-zinc-600">
              Overall
            </span>
            <span className="text-lg font-semibold tabular-nums text-[#e7d6b1]">
              {avg > 0 ? Math.round(avg) : "—"}
            </span>
          </p>
        ) : null}
      </div>

      <div className="relative mt-4">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-36 w-full sm:h-40"
          role="img"
          aria-label="Communication skills waveform"
        >
          <defs>
            <linearGradient id="tf-wave-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#e0c07a" stopOpacity="0.45" />
              <stop offset="55%" stopColor="#c9a95f" stopOpacity="0.16" />
              <stop offset="100%" stopColor="#c9a95f" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="tf-wave-stroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#8b9098" stopOpacity="0.35" />
              <stop offset="50%" stopColor="#e0c07a" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#8b9098" stopOpacity="0.35" />
            </linearGradient>
          </defs>
          <line
            x1="0"
            y1={mid}
            x2={width}
            y2={mid}
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="1"
          />
          <path d={path} fill="url(#tf-wave-fill)" />
          <path
            d={strokePoints}
            fill="none"
            stroke="url(#tf-wave-stroke)"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {keys.map((key, index) => {
            const x = ((index + 0.5) / keys.length) * width;
            const amplitude = values[index] / 100;
            const y = mid - amplitude * 0.85 * (mid - 18);
            return (
              <circle
                key={key}
                cx={x}
                cy={y}
                r={values[index] > 0 ? 3.2 : 2}
                fill={values[index] > 0 ? "#f0c97d" : "rgba(255,255,255,0.2)"}
              />
            );
          })}
        </svg>
      </div>

      <ul className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {keys.map((key, index) => (
          <li
            key={key}
            className="rounded-xl border border-white/[0.08] bg-black/25 px-3 py-2.5"
          >
            <p className="text-[0.68rem] uppercase tracking-[0.12em] text-zinc-500">
              {SKILL_LABELS[key]}
            </p>
            <p className="mt-1 text-sm font-semibold tabular-nums text-zinc-200">
              {values[index] || "—"}
            </p>
          </li>
        ))}
      </ul>
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
          What you’ve practiced.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400 sm:text-base">
          The conversations you’ve practiced. What happened here helps shape
          what comes next.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/app"
            className="inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
          >
            Return to homepage
          </Link>
          <Link
            href="/app"
            className="inline-flex rounded-full border border-white/15 px-5 py-3 text-sm font-medium text-zinc-300 transition hover:bg-white/10 hover:text-white"
          >
            Train again
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
            <div className="mt-2">
              <SkillsWaveform
                skills={skills}
                showOverall={shouldShowOverall(
                  growth?.sessionsCompleted ?? progress.sessionsCompleted
                )}
              />
            </div>
          </section>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              label="Sessions completed"
              value={String(growth?.sessionsCompleted ?? progress.sessionsCompleted)}
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
            <Stat
              label="Hours practiced"
              value={String(growth?.hoursPracticed ?? 0)}
            />
            <Stat
              label="Longest conversation"
              value={formatDuration(growth?.longestConversationSeconds)}
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
                href="/app"
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
