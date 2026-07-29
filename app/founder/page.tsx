import Link from "next/link";
import { loadFounderOpsSnapshot } from "@/atlas/engine/ops";
import { getSupabaseConfigStatus } from "@/lib/supabase/config";

export const dynamic = "force-dynamic";

/**
 * Founder operational command center (TIP Phase 6).
 * Access is enforced by RBAC in layout + proxy — not a separate login.
 */
export default async function FounderDashboardPage() {
  const snapshot = await loadFounderOpsSnapshot();
  const mc = snapshot.missionControl;
  const health = snapshot.companyHealth;
  const supabase = getSupabaseConfigStatus();
  const gaId =
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || "G-6Y0CCE4X1Q";

  return (
    <div className="space-y-10">
      <section>
        <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">
          Founder Dashboard
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Operational command center
        </h1>
        <p className="mt-3 max-w-2xl text-zinc-400">
          Atlas mission status, platform health, identity, and strategic
          priorities — isolated from the public Gym.
        </p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card title="Atlas mission" body={mc.sprint.name} detail={mc.sprint.goal} />
        <Card
          title="System health"
          body={health.deployment.status}
          detail={health.deployment.message}
        />
        <Card
          title="Deployment"
          body="talkforge.io"
          detail={`Milestone ${mc.milestone.progress}% · ${mc.milestone.status}`}
        />
        <Card
          title="Active projects"
          body={String(snapshot.priorities.length)}
          detail="Strategic priorities tracked below"
        />
        <Card
          title="Authentication"
          body={supabase.configured ? "Supabase Auth" : "Not configured"}
          detail="TIP Phase I · email/password · RBAC"
        />
        <Card
          title="User growth"
          body="GA4 live"
          detail={`Property ${gaId} · wire cohort queries next`}
        />
        <Card
          title="Google Analytics"
          body={gaId}
          detail="Pageviews live · auth custom events shipping"
        />
        <Card
          title="Supabase"
          body={supabase.configured ? "Connected" : "Missing env"}
          detail={supabase.message}
        />
        <Card
          title="Database"
          body="profiles + RLS"
          detail="Auth-scoped policies · apply TIP migrations"
        />
        <Card
          title="Error monitoring"
          body="Runtime logs"
          detail="TIP auth events logged as [TIP] JSON"
        />
        <Card
          title="Security alerts"
          body="Proxy + RBAC"
          detail="Founder routes require founder/admin/system"
        />
        <Card
          title="AI agents"
          body="Atlas live"
          detail="See Agents roster for planned agents"
        />
        <Card
          title="Engineering backlog"
          body={String(health.openBugCount)}
          detail="Open bugs from ops state"
        />
        <Card
          title="Today"
          body={mc.todayMission.title}
          detail={mc.todayMission.detail}
        />
        <Card
          title="Next action"
          body={snapshot.nextAction.title}
          detail={snapshot.nextAction.reason}
        />
      </section>

      <section>
        <h2 className="text-lg font-medium">Strategic priorities</h2>
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
          Atlas communication
        </Link>
        <Link
          href="/founder/notes"
          className="rounded-full border border-white/20 px-5 py-2.5 text-sm"
        >
          Founder notes
        </Link>
        <Link
          href="/founder/engineering"
          className="rounded-full border border-white/20 px-5 py-2.5 text-sm"
        >
          Engineering
        </Link>
        <Link
          href="/founder/operations"
          className="rounded-full border border-white/20 px-5 py-2.5 text-sm"
        >
          Operations
        </Link>
        <Link
          href="/founder/docs"
          className="rounded-full border border-white/20 px-5 py-2.5 text-sm"
        >
          Documentation
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
