import Link from "next/link";
import { loadFounderOpsSnapshot } from "@/atlas/engine/ops";

export const dynamic = "force-dynamic";

export default async function FounderDashboardPage() {
  const snapshot = await loadFounderOpsSnapshot();
  const mc = snapshot.missionControl;
  const health = snapshot.companyHealth;

  return (
    <div className="space-y-10">
      <section>
        <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">
          Founder Dashboard
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Company headquarters
        </h1>
        <p className="mt-3 max-w-2xl text-zinc-400">
          Nobody should ever feel voiceless because they don&apos;t know how to
          express themselves.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card title="Current sprint" body={mc.sprint.name} detail={mc.sprint.goal} />
        <Card
          title="Deployment"
          body={health.deployment.status}
          detail={health.deployment.message}
        />
        <Card
          title="Milestone"
          body={mc.milestone.title}
          detail={`${mc.milestone.progress}% · ${mc.milestone.status}`}
        />
        <Card
          title="Today"
          body={mc.todayMission.title}
          detail={mc.todayMission.detail}
        />
        <Card
          title="Open bugs"
          body={String(health.openBugCount)}
          detail="From ops state"
        />
        <Card
          title="Next action"
          body={snapshot.nextAction.title}
          detail={snapshot.nextAction.reason}
        />
      </section>

      <section>
        <h2 className="text-lg font-medium">Priorities</h2>
        <ul className="mt-4 space-y-3">
          {snapshot.priorities.map((p) => (
            <li
              key={p.rank}
              className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3"
            >
              <p className="text-sm font-medium">
                {p.rank}. {p.title}
              </p>
              <p className="mt-1 text-sm text-zinc-400">{p.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-wrap gap-3">
        <Link
          href="/founder/atlas"
          className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black"
        >
          Open Atlas Command Center
        </Link>
        <Link
          href="/founder/notes"
          className="rounded-full border border-white/20 px-5 py-2.5 text-sm"
        >
          Founder Notes
        </Link>
      </section>
    </div>
  );
}

function Card({
  title,
  body,
  detail,
}: {
  title: string;
  body: string;
  detail?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{title}</p>
      <p className="mt-2 text-lg font-medium">{body}</p>
      {detail ? <p className="mt-2 text-sm text-zinc-400">{detail}</p> : null}
    </div>
  );
}
