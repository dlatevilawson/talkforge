"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import SkillsWaveform, {
  compositeSignalScore,
} from "@/app/components/progress/SkillsWaveform";
import {
  getGrowthSummary,
  getProgressSummary,
  getUser,
} from "@/lib/storage";
import { formatPracticeHours } from "@/lib/system2/practice-history-display";
import type { GrowthSummary, ProgressSummary } from "@/lib/types";

function sessionsThisWeek(
  trend30d: GrowthSummary["trend30d"] | undefined
): number {
  if (!trend30d?.length) return 0;
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return trend30d.reduce((sum, day) => {
    const t = Date.parse(day.date);
    if (!Number.isFinite(t) || t < cutoff) return sum;
    return sum + day.sessions;
  }, 0);
}

function StatCard({
  label,
  value,
  trend,
}: {
  label: string;
  value: string;
  trend: string;
}) {
  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-4 sm:p-5">
      <p className="text-[0.68rem] font-medium uppercase tracking-[0.14em] text-neutral-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-white tabular-nums">
        {value}
      </p>
      <p className="mt-1.5 text-xs text-neutral-500">{trend}</p>
    </div>
  );
}

function SkillProgressRow({
  label,
  score,
}: {
  label: string;
  score: number;
}) {
  const clamped = Math.max(0, Math.min(100, Math.round(score || 0)));
  const display = clamped > 0 ? String(clamped) : "—";
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium text-zinc-200">{label}</p>
        <p className="text-sm font-semibold tabular-nums text-[#e0c07a]">
          {display}
        </p>
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#8a7340] to-[#e0c07a] transition-[width] duration-500"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

export default function ProgressPage() {
  const [progress, setProgress] = useState<ProgressSummary>({
    sessionsCompleted: 0,
    averageScore: 0,
    lastSessionAt: null,
    lastScenarioTitle: null,
  });
  const [growth, setGrowth] = useState<GrowthSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

        const [summary, growthSummary] = await Promise.all([
          getProgressSummary(user.id),
          getGrowthSummary(user.id),
        ]);

        if (cancelled) return;
        setProgress(summary);
        setGrowth(growthSummary);
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

  const completedSessions =
    growth?.sessionsCompleted ?? progress.sessionsCompleted;
  const empty = !loading && completedSessions === 0;
  const skills = growth?.skills;
  const composite =
    compositeSignalScore(skills) ??
    (growth?.averageScore && growth.averageScore > 0
      ? growth.averageScore
      : null);
  const weekSessions = sessionsThisWeek(growth?.trend30d);
  const listeningEmpathy = Math.round(
    ((skills?.listening ?? 0) + (skills?.empathy ?? 0)) / 2
  );

  return (
    <div className="mx-auto max-w-4xl space-y-10 pb-8">
      <section className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#c9a95f]">
          Member Signal & Analytics
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-white">
          Presence & Growth Matrix
        </h1>
        <p className="max-w-2xl text-sm text-neutral-400">
          How your composure, clarity, and authority evolve across high-stakes
          reps.
        </p>
      </section>

      {error ? (
        <p className="text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-zinc-500">Loading your progress…</p>
      ) : empty ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 px-5 py-6">
          <p className="text-base font-medium text-white/90">
            Nothing here yet — and that’s okay
          </p>
          <p className="mt-2 text-sm leading-6 text-zinc-400">
            Complete one practice session with Forge. Your signal scores and
            growth trajectory will appear here.
          </p>
          <Link
            href="/app"
            className="mt-5 inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
          >
            Begin on Home
          </Link>
        </div>
      ) : (
        <>
          <section className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            <StatCard
              label="Practice Reps"
              value={String(completedSessions)}
              trend={
                weekSessions > 0
                  ? `+${weekSessions} this week`
                  : "Build your cadence"
              }
            />
            <StatCard
              label="Pressure Duration"
              value={formatPracticeHours(growth?.hoursPracticed)}
              trend="Total Arena Time"
            />
            <StatCard
              label="Peak Presence Score"
              value={
                growth?.bestScore || progress.averageScore
                  ? String(growth?.bestScore || progress.averageScore)
                  : "—"
              }
              trend="Target: 80+"
            />
            <StatCard
              label="Consistency Streak"
              value={`${growth?.streakDays ?? 0} day${
                (growth?.streakDays ?? 0) === 1 ? "" : "s"
              }`}
              trend="Active Practice"
            />
          </section>

          <section className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 backdrop-blur-md sm:p-6">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-widest text-[#c9a95f]">
                  Voice of Your Growth
                </h2>
                <p className="mt-1 text-lg font-medium text-white">
                  30-Day Signal Trajectory
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold tabular-nums text-[#e0c07a]">
                  {composite && composite > 0 ? composite : "—"}
                </span>
                <span className="block text-xs text-neutral-400">
                  Current Composite
                </span>
              </div>
            </div>
            <SkillsWaveform skills={skills} />
          </section>

          <section className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-5 sm:p-6">
            <h3 className="mb-1 text-lg font-semibold text-white">
              Core Communication Vectors
            </h3>
            <p className="mb-6 text-xs text-neutral-400">
              Behavioral signal scores derived from your live audio reps.
            </p>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <SkillProgressRow
                label="Confidence Under Fire"
                score={skills?.confidence ?? 0}
              />
              <SkillProgressRow
                label="Clarity & Conciseness"
                score={skills?.clarity ?? 0}
              />
              <SkillProgressRow
                label="Active Listening & Empathy"
                score={listeningEmpathy}
              />
              <SkillProgressRow
                label="Status & Boundary Setting"
                score={skills?.leadership ?? 0}
              />
            </div>
          </section>
        </>
      )}

      <div className="pt-2 text-center">
        <Link
          href="/app/history"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#c9a95f] transition-colors hover:text-[#e0c07a]"
        >
          View detailed session logs in Training History →
        </Link>
      </div>
    </div>
  );
}
