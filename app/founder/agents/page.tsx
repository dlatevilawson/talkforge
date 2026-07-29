const AGENTS = [
  { name: "Atlas", role: "Chief of Staff", status: "active", task: "Unify platform architecture" },
  { name: "Sentinel", role: "Engineering integrity", status: "standby", task: "Awaiting charter work" },
  { name: "Marketing", role: "Demand & brand", status: "planned", task: "—" },
  { name: "Product", role: "Experience", status: "planned", task: "—" },
  { name: "Research", role: "Evidence", status: "planned", task: "—" },
  { name: "QA", role: "Quality", status: "planned", task: "—" },
  { name: "Growth", role: "Acquisition", status: "planned", task: "—" },
] as const;

export default function AgentsPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">AI Agents</p>
        <h1 className="mt-3 text-3xl font-semibold">Scalable agent roster</h1>
        <p className="mt-3 max-w-2xl text-zinc-400">
          Architecture placeholder for future agents. Only Atlas is live in this
          surface today.
        </p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2">
        {AGENTS.map((a) => (
          <li
            key={a.name}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
          >
            <h2 className="text-lg font-medium">{a.name}</h2>
            <p className="mt-1 text-sm text-zinc-400">{a.role}</p>
            <p className="mt-3 text-xs uppercase tracking-wider text-zinc-500">
              {a.status}
            </p>
            <p className="mt-2 text-sm text-zinc-300">Current: {a.task}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
