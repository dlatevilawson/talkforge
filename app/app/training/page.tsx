import Link from "next/link";
import MissionPicker from "@/app/components/MissionPicker";

/**
 * Training is not a second homepage and must not present a mission menu.
 * PPS wedge kept; MissionPicker is quarantined (shows continuity redirect).
 */
export default function TrainingPage() {
  return (
    <>
      <section className="mb-10 rounded-3xl border border-blue-500/20 bg-blue-500/10 p-6 sm:p-8">
        <p className="text-sm uppercase tracking-[0.24em] text-blue-200/80">
          Continuity
        </p>
        <h2 className="mt-3 text-2xl font-semibold text-white sm:text-3xl">
          One next conversation — not a menu of missions
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100/80 sm:text-base">
          Readiness decides the objective. Home offers one continuity step.
          Training no longer bypasses Living Profile → Readiness.
        </p>
        <Link
          href="/app"
          className="mt-6 inline-flex rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
        >
          Return to Home
        </Link>
      </section>

      <MissionPicker />
    </>
  );
}
