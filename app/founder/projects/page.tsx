import { loadFounderOpsSnapshot } from "@/atlas/engine/ops";

export const dynamic = "force-dynamic";

export default async function ProjectsPage() {
  const snapshot = await loadFounderOpsSnapshot();
  const projects = [
    {
      name: snapshot.sprint.name,
      status: snapshot.sprint.status,
      priority: "P0",
      progress: snapshot.missionControl.milestone.progress,
      blockers: snapshot.bugs
        .filter((b) => b.status === "open")
        .map((b) => b.title),
      agent: "Atlas",
      risks: ["Guest auth interim", "Coaching quality"],
    },
    {
      name: "Unified Platform",
      status: "in_progress",
      priority: "P0",
      progress: 85,
      blockers: [] as string[],
      agent: "Atlas",
      risks: ["Production Founder auth still interim"],
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">Projects</p>
        <h1 className="mt-3 text-3xl font-semibold">Active work</h1>
      </div>
      <ul className="space-y-4">
        {projects.map((p) => (
          <li
            key={p.name}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-medium">{p.name}</h2>
              <span className="text-xs uppercase tracking-wider text-zinc-500">
                {p.priority} · {p.status}
              </span>
            </div>
            <p className="mt-2 text-sm text-zinc-400">
              Progress {p.progress}% · Agent {p.agent}
            </p>
            {p.blockers.length ? (
              <p className="mt-2 text-sm text-amber-200/90">
                Blockers: {p.blockers.join("; ")}
              </p>
            ) : null}
            <p className="mt-2 text-sm text-zinc-500">
              Risks: {p.risks.join("; ")}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
