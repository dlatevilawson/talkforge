"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
  ASSESSMENT_SLOT_LABELS,
  ASSESSMENT_SLOT_ORDER,
  isUsableAssessmentResultValue,
  readAssessmentSnapshotClient,
  type AssessmentSnapshot,
  type AssessmentSlotId,
} from "@/lib/ce/assessment-lifecycle";
import {
  buildTrainingScenarios,
  trainingScenarioPracticeHref,
} from "@/lib/ce/assessment-training-scenarios";

/**
 * Assessment Results — diagnostic integrity fields when diagnosis exists.
 * LP write still happens via the existing complete API (Step 7 cutover).
 * Incomplete endings must NOT offer a completed Living Profile CTA.
 */
function AssessmentResultsBody() {
  const searchParams = useSearchParams();
  const statusParam = searchParams.get("status");
  const [snapshot, setSnapshot] = useState<AssessmentSnapshot | null>(null);

  useEffect(() => {
    setSnapshot(readAssessmentSnapshotClient());
  }, []);

  const incomplete =
    statusParam === "incomplete" || snapshot?.sufficient === false;

  const filledSlotIds: AssessmentSlotId[] = snapshot
    ? ASSESSMENT_SLOT_ORDER.filter((id) => {
        if (!snapshot.filledSlotIds.includes(id)) return false;
        return isUsableAssessmentResultValue(snapshot.answers[id] ?? null);
      })
    : [];

  const scenarios = useMemo(
    () =>
      !incomplete && snapshot?.diagnosis
        ? buildTrainingScenarios(snapshot.diagnosis)
        : [],
    [incomplete, snapshot]
  );

  const practiceHref =
    scenarios.length > 0
      ? trainingScenarioPracticeHref(scenarios)
      : "/app/practice?start=1";

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[#070708] text-white">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_20%,rgba(212,175,55,0.14),transparent_55%)]"
        aria-hidden
      />
      <div className="relative mx-auto flex min-h-[100dvh] max-w-xl flex-col px-6 pb-10 pt-[max(1.5rem,env(safe-area-inset-top))]">
        <Link
          href="/app"
          className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#D4AF37]/70 transition hover:text-[#D4AF37]"
        >
          TalkForge
        </Link>

        <p className="mt-14 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#D4AF37]/75">
          {incomplete ? "Assessment unfinished" : "Assessment complete"}
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">
          {incomplete
            ? "Not enough yet for a Living Profile"
            : "Baseline captured"}
        </h1>
        <p className="mt-4 max-w-md text-base leading-7 text-white/55">
          {incomplete
            ? "Forge didn’t gather enough to write your initial communication baseline. No Living Profile was created from this pass."
            : "Forge gathered enough to establish your initial communication baseline. Training recommendations below come from your diagnosis — not a generic catalog."}
        </p>

        {snapshot?.diagnosis && !incomplete ? (
          <ul className="mt-10 space-y-5">
            <li>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
                Focus Area
              </p>
              <p className="mt-1 text-sm leading-6 text-white/80">
                {snapshot.diagnosis.focusArea ||
                  snapshot.diagnosis.primaryBottleneck}
              </p>
            </li>
            <li>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
                Key Environments
              </p>
              <p className="mt-1 text-sm leading-6 text-white/80">
                {snapshot.diagnosis.keyEnvironments ||
                  snapshot.diagnosis.contexts}
              </p>
            </li>
            <li>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
                Root Bottleneck / Pattern
              </p>
              <p className="mt-1 text-sm leading-6 text-white/80">
                {snapshot.diagnosis.rootPattern ||
                  snapshot.diagnosis.supportingPatterns[0]}
              </p>
            </li>
            {snapshot.diagnosis.uncertainty ? (
              <li>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
                  Still clarifying
                </p>
                <p className="mt-1 text-sm leading-6 text-white/80">
                  {snapshot.diagnosis.uncertainty}
                </p>
              </li>
            ) : null}
            {(snapshot.diagnosis.dailyCommitment ||
              snapshot.diagnosis.practiceCommitment) ? (
              <li>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
                  Daily Commitment
                </p>
                <p className="mt-1 text-sm leading-6 text-white/80">
                  {snapshot.diagnosis.dailyCommitment ||
                    snapshot.diagnosis.practiceCommitment}
                </p>
              </li>
            ) : null}
          </ul>
        ) : snapshot && filledSlotIds.length > 0 ? (
          <ul className="mt-10 space-y-5">
            {filledSlotIds.map((id) => (
              <li key={id}>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
                  {ASSESSMENT_SLOT_LABELS[id]}
                </p>
                <p className="mt-1 text-sm leading-6 text-white/80">
                  {snapshot.answers[id]}
                </p>
              </li>
            ))}
          </ul>
        ) : !incomplete && snapshot ? (
          <ul className="mt-10 space-y-5">
            <li className="text-sm text-white/45">
              Assessment finished. Detailed fields will appear once the Living
              Profile view ships.
            </li>
          </ul>
        ) : null}

        {scenarios.length > 0 && !incomplete ? (
          <div className="mt-10 space-y-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
              Recommended training
            </p>
            {scenarios.map((s) => (
              <div key={s.title + (s.trainingImplicationId ?? "")}>
                <p className="text-sm font-medium text-white/90">{s.title}</p>
                <p className="mt-1 text-sm leading-6 text-white/55">{s.mission}</p>
              </div>
            ))}
          </div>
        ) : null}

        <div className="mt-auto flex flex-col gap-3 pt-12 sm:flex-row sm:flex-wrap">
          <Link
            href="/app"
            className="inline-flex items-center justify-center rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black transition hover:bg-white/90"
          >
            Back to home
          </Link>
          {incomplete ? (
            <Link
              href="/app/practice?start=1&mode=assessment"
              className="inline-flex items-center justify-center rounded-full border border-white/15 px-8 py-3.5 text-sm font-semibold text-white/80 transition hover:border-white/30 hover:text-white"
            >
              Try assessment again
            </Link>
          ) : null}
          <Link
            href={practiceHref}
            className="inline-flex items-center justify-center rounded-full border border-white/15 px-8 py-3.5 text-sm font-semibold text-white/80 transition hover:border-white/30 hover:text-white"
          >
            {scenarios.length > 0 ? "Start recommended training" : "Talk to Coach Forge"}
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function AssessmentResultsPlaceholderPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-[100dvh] bg-[#070708] text-white/50">
          <div className="mx-auto max-w-xl px-6 pt-20">Loading…</div>
        </main>
      }
    >
      <AssessmentResultsBody />
    </Suspense>
  );
}
