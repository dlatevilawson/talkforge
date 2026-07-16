"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import type { FounderOpsSnapshot } from "@/atlas/engine/ops-types";
import AskAtlasPanel from "./components/AskAtlasPanel";
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
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="flex min-h-0 flex-col border border-white/10 bg-[#0f1115]/40">
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

export default function FounderOS({ snapshot }: FounderOSProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mountedAt] = useState(() => snapshot.generatedAt);
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

  const { nextAction, sprint, productHealth, database, aiUsage, github } =
    snapshot;

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
            Generated {formatWhen(snapshot.generatedAt)}
            <br />
            Snapshot seed {formatWhen(mountedAt)}
          </p>
        </div>
      </header>

      <section
        className={`mt-8 border border-white/10 bg-[radial-gradient(1200px_circle_at_0%_0%,rgba(59,130,246,0.14),transparent_45%),linear-gradient(180deg,#12151c,#0d0f14)] px-5 py-6 transition duration-700 delay-150 sm:px-7 sm:py-7 ${
          pulse ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"
        }`}
        aria-labelledby="next-action-heading"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-3xl">
            <p className="text-[11px] uppercase tracking-[0.24em] text-blue-300/80">
              What should the founder do next?
            </p>
            <h2
              id="next-action-heading"
              className="mt-3 text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl"
            >
              {nextAction.title}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
              {nextAction.reason}
            </p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <span
              className={`text-[11px] uppercase tracking-[0.2em] ${severityClasses(
                nextAction.urgency
              )}`}
            >
              {nextAction.urgency} urgency
            </span>
            <Link
              href={nextAction.href}
              className="border border-zinc-100 bg-zinc-100 px-5 py-2.5 text-sm font-medium text-zinc-950 transition hover:bg-white"
            >
              {nextAction.cta}
            </Link>
          </div>
        </div>
      </section>

      <div className="mt-6 grid gap-4 lg:grid-cols-4">
        <Panel title="Current sprint">
          <p className="text-lg font-medium text-zinc-100">{sprint.name}</p>
          <p className="mt-2 text-sm leading-6 text-zinc-400">{sprint.goal}</p>
          <ul className="mt-4 space-y-2">
            {sprint.focus.map((item) => (
              <li key={item} className="flex gap-2 text-sm text-zinc-300">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-zinc-500" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Product health">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${toneDot(productHealth.tone)}`}
            />
            <p className="text-sm text-zinc-200">{productHealth.summary}</p>
          </div>
          <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-zinc-500">Completed</dt>
              <dd className="mt-1 text-xl text-zinc-100">
                {productHealth.sessionsCompleted}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Avg score</dt>
              <dd className="mt-1 text-xl text-zinc-100">
                {productHealth.averageScore}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Reflections</dt>
              <dd className="mt-1 text-xl text-zinc-100">
                {productHealth.reflectionsSaved}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Users</dt>
              <dd className="mt-1 text-xl text-zinc-100">
                {productHealth.uniqueUsers}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-zinc-500">
            Last: {productHealth.lastScenarioTitle ?? "None"} ·{" "}
            {formatWhen(productHealth.lastSessionAt)}
          </p>
        </Panel>

        <Panel title="Database status">
          <p
            className={`inline-flex border px-2.5 py-1 text-xs uppercase tracking-[0.16em] ${toneClasses(
              database.tone
            )}`}
          >
            {database.backend}
          </p>
          <p className="mt-4 text-sm leading-6 text-zinc-300">
            {database.message}
          </p>
          <dl className="mt-5 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-zinc-500">Configured</dt>
              <dd>{database.configured ? "Yes" : "No"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-zinc-500">Reachable</dt>
              <dd>{database.reachable ? "Yes" : "No"}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-zinc-500">Profiles</dt>
              <dd>{database.profileCount ?? "—"}</dd>
            </div>
          </dl>
        </Panel>

        <Panel title="AI usage">
          <p
            className={`inline-flex border px-2.5 py-1 text-xs uppercase tracking-[0.16em] ${toneClasses(
              aiUsage.tone
            )}`}
          >
            {aiUsage.openaiConfigured ? "OpenAI ready" : "OpenAI missing"}
          </p>
          <p className="mt-4 text-sm leading-6 text-zinc-300">
            {aiUsage.message}
          </p>
          <dl className="mt-5 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-zinc-500">Forge turns</dt>
              <dd>{aiUsage.forgeTurnsRecent}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-zinc-500">Coached sessions</dt>
              <dd>{aiUsage.sessionsWithCoaching}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-zinc-500">Avg coach score</dt>
              <dd>{aiUsage.averageCoachScore || "—"}</dd>
            </div>
          </dl>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel
          title="Founder priorities"
          action={
            <span className="text-[11px] uppercase tracking-[0.16em] text-zinc-600">
              Ranked
            </span>
          }
        >
          <ol className="space-y-4">
            {snapshot.priorities.map((item) => (
              <li key={item.rank} className="flex gap-3">
                <span className="mt-0.5 w-6 shrink-0 font-mono text-sm text-zinc-500">
                  {String(item.rank).padStart(2, "0")}
                </span>
                <div>
                  <p className="text-sm font-medium text-zinc-100">
                    {item.title}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-zinc-500">
                    {item.detail}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </Panel>

        <Panel
          title="Open bugs"
          action={
            <span className="text-[11px] uppercase tracking-[0.16em] text-zinc-600">
              {snapshot.openBugCount} open
            </span>
          }
        >
          {snapshot.bugs.length === 0 ? (
            <p className="text-sm text-zinc-500">No open bugs in ops state.</p>
          ) : (
            <ul className="space-y-4">
              {snapshot.bugs.map((bug) => (
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
                  <p className="mt-1 text-sm font-medium text-zinc-100">
                    {bug.title}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-zinc-500">
                    {bug.detail}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Recent practice sessions">
          {snapshot.recentSessions.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No sessions in Supabase yet.
            </p>
          ) : (
            <ul className="divide-y divide-white/5">
              {snapshot.recentSessions.map((session) => (
                <li
                  key={session.id}
                  className="flex flex-wrap items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div>
                    <p className="text-sm font-medium text-zinc-100">
                      {session.scenarioTitle}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {session.completedAt ? "Completed" : "In progress"} ·{" "}
                      {formatWhen(session.completedAt ?? session.startedAt)}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="text-zinc-200">
                      {session.averageScore ?? "—"}
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {session.turnCount} turns
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title="GitHub activity"
          action={
            <span className="text-[11px] uppercase tracking-[0.16em] text-zinc-600">
              {github.repo}
            </span>
          }
        >
          <p className="mb-4 text-sm text-zinc-400">{github.message}</p>
          {github.items.length === 0 ? (
            <p className="text-sm text-zinc-500">No recent GitHub events.</p>
          ) : (
            <ul className="divide-y divide-white/5">
              {github.items.map((item) => (
                <li key={item.id} className="py-3 first:pt-0 last:pb-0">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="group block"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">
                        {item.kind === "pull_request" ? "PR" : "Commit"}
                      </span>
                      <span className="text-xs text-zinc-600">
                        {formatWhen(item.at)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-zinc-200 group-hover:text-white">
                      {item.title}
                    </p>
                    {item.author && (
                      <p className="mt-1 text-xs text-zinc-500">{item.author}</p>
                    )}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="mt-4">
        <Panel title="Quick actions">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {snapshot.quickActions.map((action) => (
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
            ))}
          </div>
        </Panel>
      </div>

      <div className="mt-10">
        <AskAtlasPanel />
      </div>
    </div>
  );
}
