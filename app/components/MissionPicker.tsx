import Link from "next/link";

/**
 * QUARANTINED — AUDIT-001 C3 / DES-001 / Forge Law #012.
 *
 * Former multi-mission menu ("What would you like to forge today?") bypassed
 * Living Profile → Readiness → Adaptive Homepage. Mission tiles are disabled.
 * Use ContinuityHome / buildAdaptiveHome for entry.
 *
 * Do not restore equal mission grids without Founder decision reversing
 * IV-REJ-005 and AUDIT-001 remediation.
 */
export default function MissionPicker({
  title = "Mission menu retired",
  subtitle = "TalkForge no longer asks you to choose a practice path before readiness. Continue from Home — one next step, not a blank menu.",
}: {
  title?: string;
  subtitle?: string;
}) {
  return (
    <section className="rounded-3xl border border-dashed border-white/15 bg-black/20 p-6 sm:p-8">
      <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
        Architecture
      </p>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">
        {title}
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-400">
        {subtitle}
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/app"
          className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
        >
          Go to Home
        </Link>
      </div>
      <p className="mt-6 text-xs text-zinc-600">
        Multi-mission picker quarantined (AUDIT-001 C3). Do not add tiles here.
      </p>
    </section>
  );
}
