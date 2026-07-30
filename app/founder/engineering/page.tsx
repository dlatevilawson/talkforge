export default function FounderEngineeringPage() {
  const items = [
    {
      label: "Build status",
      detail: "Track CI and production builds from the repository pipeline.",
    },
    {
      label: "Deployments",
      detail: "Vercel production: talkforge.io — promote only from main.",
    },
    {
      label: "Repository health",
      detail: "github.com/dlatevilawson/talkforge — open PRs, branch hygiene.",
    },
    {
      label: "Active branches",
      detail: "Feature work uses cursor/*-98b4; keep main shippable.",
    },
    {
      label: "Environment status",
      detail:
        "Supabase Auth, GA4, OpenAI — verify env vars in Vercel before cutover.",
    },
  ];

  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-amber-200/80">
        Engineering
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Build & deploy
      </h1>
      <p className="mt-3 max-w-2xl text-sm text-zinc-400">
        Operational view of TalkForge engineering health. Isolated from the
        public Gym experience.
      </p>
      <ul className="mt-10 space-y-4">
        {items.map((item) => (
          <li
            key={item.label}
            className="border-b border-white/10 pb-4 last:border-0"
          >
            <h2 className="text-sm font-medium text-zinc-100">{item.label}</h2>
            <p className="mt-1 text-sm text-zinc-400">{item.detail}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
