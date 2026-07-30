export default function FounderOperationsPage() {
  const items = [
    {
      label: "System health",
      detail: "Auth, Supabase, and edge functions should remain green in production.",
    },
    {
      label: "Platform status",
      detail: "Landing, Gym (/app), and Founder Portal are one Next.js product.",
    },
    {
      label: "Notifications",
      detail: "Wire operational alerts as the auth and billing layers mature.",
    },
    {
      label: "Outstanding tasks",
      detail: "See Atlas recommendations and the Company dashboard for priorities.",
    },
  ];

  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-amber-200/80">
        Operations
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Platform operations
      </h1>
      <p className="mt-3 max-w-2xl text-sm text-zinc-400">
        Day-to-day readiness for TalkForge — separate from member-facing product
        surfaces.
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
