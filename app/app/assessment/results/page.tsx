"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import {
  ASSESSMENT_CATEGORIES,
  readAssessmentResultClient,
  type AssessmentCategory,
  type StoredAssessmentResult,
} from "@/lib/ce/assessment-lifecycle";

const LABELS: Record<AssessmentCategory, string> = {
  primaryGoal: "Primary goal",
  difficultSituations: "Difficult situations",
  communicationPatterns: "Communication patterns",
  realWorldContext: "Real-world context",
  practiceCapacity: "Practice capacity",
  desiredCommunicationIdentity: "Desired identity",
};

/**
 * Placeholder Assessment Results route.
 * Full Living Profile UI ships later — this only confirms terminal assessment
 * state. Incomplete endings must NOT offer a completed Living Profile CTA.
 */
function AssessmentResultsBody() {
  const searchParams = useSearchParams();
  const statusParam = searchParams.get("status");
  const [result, setResult] = useState<StoredAssessmentResult | null>(null);

  useEffect(() => {
    setResult(readAssessmentResultClient());
  }, []);

  const incomplete =
    statusParam === "incomplete" || result?.sufficient === false;
  const filled = ASSESSMENT_CATEGORIES.filter((key) => result?.[key]);

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
            : "Forge gathered enough to establish your initial communication baseline. The full Living Profile view arrives in a later step — this page confirms the assessment ended cleanly."}
        </p>

        {!incomplete && result ? (
          <ul className="mt-10 space-y-5">
            {filled.length === 0 ? (
              <li className="text-sm text-white/45">
                Assessment finished. Detailed fields will appear once the Living
                Profile view ships.
              </li>
            ) : (
              filled.map((key) => (
                <li key={key}>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
                    {LABELS[key]}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-white/80">
                    {result[key]}
                  </p>
                </li>
              ))
            )}
          </ul>
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
            href="/app/practice?start=1"
            className="inline-flex items-center justify-center rounded-full border border-white/15 px-8 py-3.5 text-sm font-semibold text-white/80 transition hover:border-white/30 hover:text-white"
          >
            Talk to Coach Forge
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
