import { loadFounderOpsSnapshot } from "@/atlas/engine/ops";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const snapshot = await loadFounderOpsSnapshot();
  const m = snapshot.founderMetrics;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">Analytics</p>
        <h1 className="mt-3 text-3xl font-semibold">Founder metrics</h1>
        <p className="mt-3 max-w-2xl text-zinc-400">
          Product metrics from ops. Site analytics continue via GA4 (
          <code className="text-zinc-300">G-6Y0CCE4X1Q</code>) across landing,
          auth, app, and founder routes.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Metric label="Practice sessions" value={m.practiceSessions} />
        <Metric label="Avg coaching score" value={m.averageCoachingScore} />
        <Metric label="Users" value={m.users} />
        <Metric label="Growth" value={m.growth.label} />
        <Metric label="Retention" value={m.retention.label} />
        <Metric label="Revenue" value="Future dashboard" />
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-medium">{value}</p>
    </div>
  );
}
