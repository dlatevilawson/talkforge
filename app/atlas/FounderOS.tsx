"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { FounderOpsSnapshot } from "@/atlas/engine/ops-types";
import AskAtlasPanel from "./components/AskAtlasPanel";
import FounderNotesPanel from "./components/FounderNotesPanel";
import {
  formatWhen,
  severityClasses,
  toneClasses,
  toneDot,
} from "./components/tone";

type FounderOSProps = {
  snapshot: FounderOpsSnapshot;
};

function Panel({
  title,
  children,
  action,
  id,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  id?: string;
}) {
  return (
    <section
      id={id}
      className="flex min-h-0 flex-col border border-white/10 bg-[#0f1115]/40"
    >
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.22em] text-zinc-500">
          {title}
        </h2>
        {action}
      </div>
      <div className="flex-1 px-4 py-4">{children}</div>
    </section>
  );
}

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.16em] text-zinc-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-zinc-50">
        {value}
      </p>
      {detail ? <p className="mt-1 text-xs text-zinc-500">{detail}</p> : null}
    </div>
  );
}

export default function FounderOS({ snapshot }: FounderOSProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setPulse(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  function refresh() {
    startTransition(() => {
      router.refresh();
    });
  }

  const {
    missionControl,
    companyHealth,
    founderMetrics,
    brief,
    quickActions,
    nextAction,
  } = snapshot;

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 text-sm">
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/dashboard"
            className="text-zinc-500 underline-offset-4 hover:text-zinc-200 hover:underline"
          >
            Product
          </Link>
          <Link
            href="/training"
            className="text-zinc-500 underline-offset-4 hover:text-zinc-200 hover:underline"
          >
            Practice
          </Link>
          <Link
            href="/progress"
            className="text-zinc-500 underline-offset-4 hover:text-zinc-200 hover:underline"
          >
            Progress
          </Link>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={isPending}
          className="border border-white/10 px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-zinc-400 transition hover:border-white/20 hover:text-zinc-200 disabled:opacity-50"
        >
          {isPending ? "Refreshing…" : "Refresh"}
        </button>
      </div>

      <header className="border-b border-white/10 pb-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p
              className={`text-[11px] uppercase tracking-[0.28em] text-zinc-500 transition duration-700 ${
                pulse ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
              }`}
            >
              TalkForge · Founder Operating System
            </p>
            <h1
              className={`mt-3 text-4xl font-semibold tracking-[0.28em] text-zinc-50 transition duration-700 delay-75 sm:text-5xl ${
                pulse ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
              }`}
            >
              ATLAS
            </h1>
          </div>
          <p className="max-w-sm text-right text-xs leading-5 text-zinc-500">
            Daily brief {brief.date}
            <br />
            Snapshot {formatWhen(snapshot.generatedAt)}
          </p>
        </div>
      </header>

      {/* Founder Brief — auto on open */}
      <section
        className={`mt-8 border border-white/10 bg-[radial-gradient(1200px_circle_at_0%_0%,rgba(59,130,246,0.16),transparent_45%),linear-gradient(180deg,#12151c,#0d0f14)] px-5 py-6 transition duration-700 delay-100 sm:px-7 sm:py-7 ${
          pulse ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
        }`}
        aria-labelledby="founder-brief-heading"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.24em] text-blue-300/80">
              Daily Founder Brief · {brief.source}
            </p>
            <h2
              id="founder-brief-heading"
              className="mt-3 text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl"
            >
              Company state & next three priorities
            </h2>
            <p className="mt-4 text-sm leading-7 text-zinc-300">
              {brief.summary}
            </p>
          </div>
          <div className="min-w-[220px]">
            <p className="text-[11px] uppercase tracking-[0.2em] text-zinc-500">
              Next three
            </p>
            <ol className="mt-3 space-y-3">
              {brief.priorities.map((item, index) => (
                <li key={item} className="flex gap-3 text-sm text-zinc-200">
                  <span className="font-mono text-zinc-500">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ol>
            <Link
              href={nextAction.href}
              className="mt-5 inline-flex border border-zinc-100 bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950 transition hover:bg-white"
            >
              {nextAction.cta}
            </Link>
          </div>
        </div>
      </section>

      {/* 1. Mission Control */}
      <div className="mt-6">
        <p className="mb-3 text-[11px] uppercase tracking-[0.22em] text-zinc-600">
          1 · Mission Control
        </p>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Panel title="Current Sprint">
            <p className="text-lg font-medium text-zinc-100">
              {missionControl.sprint.name}
            </p>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              {missionControl.sprint.goal}
            </p>
            <p className="mt-4 text-[11px] uppercase tracking-[0.16em] text-zinc-500">
              {missionControl.sprint.status}
            </p>
          </Panel>

          <Panel title="Today's Mission">
            <p className="text-lg font-medium text-zinc-100">
              {missionControl.todayMission.title}
            </p>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              {missionControl.todayMission.detail}
            </p>
          </Panel>

          <Panel title="Top Priority">
            {missionControl.topPriority ? (
              <>
                <p className="font-mono text-xs text-zinc-500">
                  P{missionControl.topPriority.rank}
                </p>
                <p className="mt-2 text-lg font-medium text-zinc-100">
                  {missionControl.topPriority.title}
                </p>
                <p className="mt-2 text-sm leading-6 text-zinc-400">
                  {missionControl.topPriority.detail}
                </p>
              </>
            ) : (
              <p className="text-sm text-zinc-500">No open priorities.</p>
            )}
          </Panel>

          <Panel title="Current Milestone">
            <p className="text-lg font-medium text-zinc-100">
              {missionControl.milestone.title}
            </p>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              {missionControl.milestone.detail}
            </p>
            <div className="mt-4">
              <div className="mb-2 flex justify-between text-xs text-zinc-500">
                <span>{missionControl.milestone.id}</span>
                <span>{missionControl.milestone.progress}%</span>
              </div>
              <div className="h-1.5 overflow-hidden bg-white/10">
                <div
                  className="h-full bg-blue-400 transition-all duration-700"
                  style={{
                    width: `${Math.min(100, missionControl.milestone.progress)}%`,
                  }}
                />
              </div>
            </div>
          </Panel>
        </div>
      </div>

      {/* 2. Company Health */}
      <div className="mt-8">
        <p className="mb-3 text-[11px] uppercase tracking-[0.22em] text-zinc-600">
          2 · Company Health
        </p>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Panel title="Product Health">
            <div className="flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${toneDot(
                  companyHealth.productHealth.tone
                )}`}
              />
              <p className="text-sm text-zinc-200">
                {companyHealth.productHealth.summary}
              </p>
            </div>
            <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-zinc-500">Completed</dt>
                <dd className="mt-1 text-xl text-zinc-100">
                  {companyHealth.productHealth.sessionsCompleted}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Avg score</dt>
                <dd className="mt-1 text-xl text-zinc-100">
                  {companyHealth.productHealth.averageScore}
                </dd>
              </div>
            </dl>
          </Panel>

          <Panel
            title="Open Bugs"
            action={
              <span className="text-[11px] uppercase tracking-[0.16em] text-zinc-600">
                {companyHealth.openBugCount} open
              </span>
            }
          >
            {companyHealth.openBugs.length === 0 ? (
              <p className="text-sm text-zinc-500">No open bugs.</p>
            ) : (
              <ul className="space-y-3">
                {companyHealth.openBugs.map((bug) => (
                  <li key={bug.id}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-zinc-500">
                        {bug.id}
                      </span>
                      <span
                        className={`text-[11px] uppercase tracking-[0.14em] ${severityClasses(
                          bug.severity
                        )}`}
                      >
                        {bug.severity}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-zinc-100">{bug.title}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Database Status">
            <p
              className={`inline-flex border px-2.5 py-1 text-xs uppercase tracking-[0.16em] ${toneClasses(
                companyHealth.database.tone
              )}`}
            >
              {companyHealth.database.backend}
            </p>
            <p className="mt-4 text-sm leading-6 text-zinc-300">
              {companyHealth.database.message}
            </p>
          </Panel>

          <Panel title="GitHub Status">
            <p
              className={`inline-flex border px-2.5 py-1 text-xs uppercase tracking-[0.16em] ${toneClasses(
                companyHealth.github.tone
              )}`}
            >
              {companyHealth.github.available ? "Connected" : "Unavailable"}
            </p>
            <p className="mt-4 text-sm leading-6 text-zinc-300">
              {companyHealth.github.message}
            </p>
            <p className="mt-3 text-xs text-zinc-500">
              {companyHealth.github.openPullRequests} open PRs ·{" "}
              {companyHealth.github.repo}
            </p>
          </Panel>

          <Panel title="AI Cost">
            <p className="text-3xl font-semibold text-zinc-50">
              ${companyHealth.aiCost.estimatedCostUsd.toFixed(2)}
            </p>
            <p className="mt-2 text-sm text-zinc-400">
              {companyHealth.aiCost.currency} est. recent usage
            </p>
            <p className="mt-4 text-sm leading-6 text-zinc-300">
              {companyHealth.aiCost.message}
            </p>
          </Panel>

          <Panel title="Deployment Status">
            <p
              className={`inline-flex border px-2.5 py-1 text-xs uppercase tracking-[0.16em] ${toneClasses(
                companyHealth.deployment.tone
              )}`}
            >
              {companyHealth.deployment.status}
            </p>
            <p className="mt-4 text-sm font-medium text-zinc-100">
              {companyHealth.deployment.provider} ·{" "}
              {companyHealth.deployment.environment}
            </p>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              {companyHealth.deployment.message}
            </p>
          </Panel>
        </div>
      </div>

      {/* 3. Founder Metrics */}
      <div className="mt-8">
        <p className="mb-3 text-[11px] uppercase tracking-[0.22em] text-zinc-600">
          3 · Founder Metrics
        </p>
        <Panel title="Operating metrics">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            <Metric
              label="Practice Sessions"
              value={founderMetrics.practiceSessions}
            />
            <Metric
              label="Average Coaching Score"
              value={founderMetrics.averageCoachingScore}
            />
            <Metric label="Users" value={founderMetrics.users} />
            <Metric
              label="Growth"
              value={founderMetrics.growth.sessions7d}
              detail={founderMetrics.growth.label}
            />
            <Metric
              label="Retention"
              value={`${founderMetrics.retention.rate}%`}
              detail={founderMetrics.retention.label}
            />
          </div>
        </Panel>
      </div>

      {/* 4. Quick Actions */}
      <div className="mt-8">
        <p className="mb-3 text-[11px] uppercase tracking-[0.22em] text-zinc-600">
          4 · Quick Actions
        </p>
        <Panel title="Move now">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {quickActions.map((action) =>
              action.external ? (
                <a
                  key={action.id}
                  href={action.href}
                  target="_blank"
                  rel="noreferrer"
                  className="border border-white/10 px-4 py-4 transition hover:border-white/25 hover:bg-white/[0.03]"
                >
                  <p className="text-sm font-medium text-zinc-100">
                    {action.label}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-zinc-500">
                    {action.description}
                  </p>
                </a>
              ) : (
                <Link
                  key={action.id}
                  href={action.href}
                  className="border border-white/10 px-4 py-4 transition hover:border-white/25 hover:bg-white/[0.03]"
                >
                  <p className="text-sm font-medium text-zinc-100">
                    {action.label}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-zinc-500">
                    {action.description}
                  </p>
                </Link>
              )
            )}
          </div>
        </Panel>
      </div>

      {/* 5. Founder Notes */}
      <div className="mt-8">
        <p className="mb-3 text-[11px] uppercase tracking-[0.22em] text-zinc-600">
          5 · Founder Notes
        </p>
        <div className="border border-white/10 bg-[#0f1115]/40">
          <FounderNotesPanel initialNotes={snapshot.notes} />
        </div>
      </div>

      {/* Recent activity strip */}
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <Panel title="Recent practice sessions">
          {snapshot.recentSessions.length === 0 ? (
            <p className="text-sm text-zinc-500">No sessions in Supabase yet.</p>
          ) : (
            <ul className="divide-y divide-white/5">
              {snapshot.recentSessions.slice(0, 5).map((session) => (
                <li
                  key={session.id}
                  className="flex justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm text-zinc-100">
                      {session.scenarioTitle}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {formatWhen(session.completedAt ?? session.startedAt)}
                    </p>
                  </div>
                  <p className="text-sm text-zinc-300">
                    {session.averageScore ?? "—"}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="GitHub activity">
          {companyHealth.github.items.length === 0 ? (
            <p className="text-sm text-zinc-500">No recent GitHub events.</p>
          ) : (
            <ul className="divide-y divide-white/5">
              {companyHealth.github.items.slice(0, 5).map((item) => (
                <li key={item.id} className="py-3 first:pt-0 last:pb-0">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group block"
                  >
                    <p className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">
                      {item.kind === "pull_request" ? "PR" : "Commit"} ·{" "}
                      {formatWhen(item.at)}
                    </p>
                    <p className="mt-1 text-sm text-zinc-200 group-hover:text-white">
                      {item.title}
                    </p>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      {/* 7. Ask Atlas */}
      <div className="mt-10">
        <p className="mb-3 text-[11px] uppercase tracking-[0.22em] text-zinc-600">
          7 · Ask Atlas
        </p>
        <AskAtlasPanel />
      </div>
    </div>
  );
}
