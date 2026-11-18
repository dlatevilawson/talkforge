import type { LivingProfile } from "@/lib/system1/types";
import { assessmentBaseline } from "@/lib/ce/assessment-baseline";

export default function AssessmentBaselineCard({ profile }: { profile: LivingProfile | null }) {
  const baseline = assessmentBaseline(profile);
  if (baseline.state === "unavailable") return null;
  return (
    <section aria-label="Assessment starting point" className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#c9a95f]">What we heard · {profile?.profileSource === "assessment" ? "assessment" : "starting point"}</p>
      <p className="mt-2 text-xs text-zinc-500">{baseline.sourceDate ? `Captured ${new Date(baseline.sourceDate).toLocaleDateString()}` : "Source date unavailable"}</p>
      {baseline.state === "learning" ? <p className="mt-4 text-sm leading-6 text-zinc-300">{baseline.message}</p> : (
        <>
          <dl className="mt-5 grid gap-3 sm:grid-cols-2">
            {baseline.signals.map((signal) => <div key={signal.name} className="rounded-xl border border-white/10 p-3"><dt className="text-sm font-medium text-white">{signal.name}</dt><dd className="mt-1 text-sm text-zinc-400">{signal.evidence}</dd></div>)}
          </dl>
          {baseline.bottleneck ? <div className="mt-5 border-t border-white/10 pt-4"><p className="text-xs uppercase tracking-wider text-zinc-500">The bottleneck you named</p><p className="mt-2 text-sm leading-6 text-zinc-200">{baseline.bottleneck}</p><p className="mt-2 text-sm text-zinc-400">{baseline.whyFirst}</p></div> : null}
        </>
      )}
    </section>
  );
}
