import type { Metadata } from "next";
import Link from "next/link";
import AskAtlas from "./components/AskAtlas";
import {
  openDecisions,
  risks,
  strategicPriorities,
  todayFocus,
} from "./data";

export const metadata: Metadata = {
  title: "Atlas | TalkForge",
  description: "Chief of Staff dashboard for TalkForge",
};

function urgencyStyles(urgency: "high" | "medium" | "low") {
  switch (urgency) {
    case "high":
      return "bg-red-50 text-red-700 border-red-200";
    case "medium":
      return "bg-amber-50 text-amber-800 border-amber-200";
    default:
      return "bg-zinc-100 text-zinc-600 border-zinc-200";
  }
}

function statusLabel(status: "active" | "blocked" | "done") {
  switch (status) {
    case "blocked":
      return "Blocked";
    case "done":
      return "Done";
    default:
      return "Active";
  }
}

export default function AtlasPage() {
  return (
    <main className="min-h-screen bg-zinc-50 font-sans text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-zinc-500">
              TalkForge
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">
              Atlas
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              Chief of Staff · Stewardship &amp; execution
            </p>
          </div>
          <Link
            href="/"
            className="text-sm text-zinc-500 underline-offset-4 hover:text-zinc-800 hover:underline"
          >
            Back to TalkForge
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-6 py-8">
        {/* 1. Today's Focus */}
        <section className="rounded-xl border border-zinc-200 bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Today&apos;s Focus</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Highest-leverage work right now
              </p>
            </div>
            <span
              className={`rounded-md border px-2.5 py-1 text-xs font-medium ${urgencyStyles(
                todayFocus.status === "blocked" ? "high" : "low"
              )}`}
            >
              {statusLabel(todayFocus.status)}
            </span>
          </div>
          <h3 className="mt-5 text-xl font-medium text-zinc-900">
            {todayFocus.title}
          </h3>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-600">
            {todayFocus.why}
          </p>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* 2. Strategic Priorities */}
          <section className="rounded-xl border border-zinc-200 bg-white p-6">
            <h2 className="text-lg font-semibold">Strategic Priorities</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Outcomes that create long-term value
            </p>
            <ul className="mt-5 space-y-4">
              {strategicPriorities.map((priority) => (
                <li
                  key={priority.id}
                  className="border-t border-zinc-100 pt-4 first:border-t-0 first:pt-0"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-medium text-zinc-900">
                      {priority.title}
                    </h3>
                    <span className="shrink-0 rounded-md border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-500">
                      {priority.horizon}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">
                    {priority.outcome}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          {/* 3. Open Decisions */}
          <section className="rounded-xl border border-zinc-200 bg-white p-6">
            <h2 className="text-lg font-semibold">Open Decisions</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Questions that deserve founder attention
            </p>
            <ul className="mt-5 space-y-4">
              {openDecisions.map((decision) => (
                <li
                  key={decision.id}
                  className="border-t border-zinc-100 pt-4 first:border-t-0 first:pt-0"
                >
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-medium text-zinc-900">
                      {decision.question}
                    </h3>
                    <span
                      className={`shrink-0 rounded-md border px-2 py-0.5 text-xs font-medium capitalize ${urgencyStyles(
                        decision.urgency
                      )}`}
                    >
                      {decision.urgency}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-zinc-600">
                    {decision.context}
                  </p>
                  <p className="mt-2 text-xs text-zinc-400">
                    Owner: {decision.owner}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* 4. Risks & Mission Alignment */}
        <section className="rounded-xl border border-zinc-200 bg-white p-6">
          <h2 className="text-lg font-semibold">
            Risks &amp; Mission Alignment
          </h2>
          <p className="mt-1 text-sm text-zinc-500">
            Emerging risks and pressure against purpose
          </p>
          <ul className="mt-5 grid gap-4 md:grid-cols-3">
            {risks.map((risk) => (
              <li
                key={risk.id}
                className="rounded-lg border border-zinc-200 bg-zinc-50 p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-medium text-zinc-900">{risk.title}</h3>
                  <span
                    className={`shrink-0 rounded-md border px-2 py-0.5 text-xs font-medium capitalize ${urgencyStyles(
                      risk.severity
                    )}`}
                  >
                    {risk.severity}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-zinc-600">
                  {risk.detail}
                </p>
                <p className="mt-3 text-xs leading-5 text-zinc-500">
                  <span className="font-medium text-zinc-700">
                    Mission impact:{" "}
                  </span>
                  {risk.missionImpact}
                </p>
              </li>
            ))}
          </ul>
        </section>

        {/* 5. Ask Atlas */}
        <AskAtlas />
      </div>
    </main>
  );
}
