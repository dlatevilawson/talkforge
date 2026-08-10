"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ASSESSMENT_CATEGORIES,
  readAssessmentResultClient,
  type AssessmentCategory,
  type AssessmentResult,
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
 * Placeholder Assessment Results route (STEP 2).
 * Full Living Profile UI ships in a later step — this only confirms
 * structural completion and surfaces the assessment data contract.
 */
export default function AssessmentResultsPlaceholderPage() {
  const [result, setResult] = useState<
    (AssessmentResult & {
      practiceSessionId?: string | null;
      completedAt?: string;
    }) | null
  >(null);

  useEffect(() => {
    setResult(readAssessmentResultClient());
  }, []);

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
          Assessment complete
        </p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">
          Your Living Profile is next
        </h1>
        <p className="mt-4 max-w-md text-base leading-7 text-white/55">
          Forge gathered enough to establish your initial communication
          baseline. The full Living Profile view arrives in a later step —
          this page confirms the assessment ended cleanly.
        </p>

        {result ? (
          <ul className="mt-10 space-y-5">
            {filled.length === 0 ? (
              <li className="text-sm text-white/45">
                Assessment finished. Detailed fields will appear once the
                Living Profile view ships.
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
        ) : (
          <p className="mt-10 text-sm text-white/45">
            No assessment result in this browser session. Start from Explorer →
            Build My Living Training Plan.
          </p>
        )}

        <div className="mt-auto flex flex-col gap-3 pt-12 sm:flex-row">
          <Link
            href="/app"
            className="inline-flex items-center justify-center rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black transition hover:bg-white/90"
          >
            Back to home
          </Link>
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
