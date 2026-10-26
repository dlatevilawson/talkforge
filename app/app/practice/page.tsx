import VoiceArena from "@/app/components/VoiceArena";
import EndOfFreePractice from "@/app/components/billing/EndOfFreePractice";
import type { CeSessionMode, CeTrack } from "@/lib/ce/session-config";
import { evaluatePracticeEntitlement } from "@/lib/billing/entitlements";
import { evaluatePracticeRouteAccess } from "@/lib/system2/server-readiness";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { coachTopicById } from "@/lib/assistant-coach/coach-topics";
import { findStarterDrill } from "@/lib/drills/catalog";
import Link from "next/link";
import { getTodayJourney } from "@/lib/journey/server";
import TextDrillCompletion from "@/app/components/journey/TextDrillCompletion";

export default async function VoicePage({
  searchParams,
}: {
  searchParams: Promise<{
    track?: string | string[];
    title?: string | string[];
    success?: string | string[];
    start?: string | string[];
    mode?: string | string[];
    topic?: string | string[];
    drill?: string | string[];
    programId?: string | string[];
  }>;
}) {
  await connection();
  const params = await searchParams;
  const title = first(params.title);
  const coachTopic = coachTopicById(first(params.topic));
  const drill = findStarterDrill(first(params.drill));
  const drillStarted = first(params.start) === "1";
  const programId = first(params.programId);
  const journey = programId ? await getTodayJourney().catch(() => null) : null;
  const activeDrill = drill ?? journey?.day.drill ?? null;

  const access = await evaluatePracticeRouteAccess();
  if (!access.allowed) {
    const topicQuery = coachTopic
      ? `&topic=${encodeURIComponent(coachTopic.id)}`
      : "";
    redirect(`/app?gate=${access.reason}${topicQuery}`);
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    const entitlement = await evaluatePracticeEntitlement(
      user.id,
      typeof profile?.role === "string" ? profile.role : null
    );
    if (!entitlement.canStartPractice) {
      if (entitlement.reason === "billing_unavailable") {
        redirect("/app?gate=readiness_unavailable");
      }
      return <EndOfFreePractice />;
    }
  }

  const trackRaw = first(params.track);
  const track: CeTrack =
    trackRaw === "system_design" ||
    trackRaw === "behavioral_tech" ||
    trackRaw === "coding_interview" ||
    trackRaw === "hello"
      ? trackRaw
      : "hello";
  const modeRaw = first(params.mode);
  const mode: CeSessionMode =
    modeRaw === "assessment" ? "assessment" : "practice";

  if (activeDrill && activeDrill.modality !== "voice" && programId && journey) {
    return <TextDrillCompletion drill={activeDrill} programId={programId} />;
  }

  if (activeDrill && !drillStarted) {
    return (
      <main className="min-h-screen bg-[#07070a] px-6 py-16 text-zinc-100">
        <div className="mx-auto max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#c9a95f]">
            Today’s practice
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">
            {activeDrill.name}
          </h1>
          <p className="mt-3 text-zinc-400">
            {activeDrill.durationMinutes} minutes · {activeDrill.signal} · difficulty {activeDrill.difficulty}
          </p>
          <section className="mt-10 rounded-2xl border border-white/10 bg-white/[0.04] p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#d7b56a]">
              How it works
            </h2>
            <p className="mt-4 text-lg leading-8 text-zinc-200">{activeDrill.instructions}</p>
            <p className="mt-6 border-t border-white/10 pt-5 text-sm leading-6 text-zinc-400">
              Look for: {activeDrill.goodLooksLike}
            </p>
          </section>
          <div className="mt-8 flex items-center gap-4">
            <Link
              href={"/app/practice?drill=" + encodeURIComponent(activeDrill.id) + "&programId=" + encodeURIComponent(programId ?? "") + "&start=1"}
              className="rounded-full bg-[#f4f0e8] px-6 py-3 font-semibold text-black"
            >
              Start drill
            </Link>
            <Link href="/app" className="text-sm text-zinc-400 underline-offset-4 hover:underline">
              Back home
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <VoiceArena
      track={track}
      eventTitle={activeDrill?.name ?? coachTopic?.label ?? title}
      successCriteria={
        activeDrill
          ? activeDrill.instructions + " Look for: " + activeDrill.goodLooksLike
          : coachTopic?.context ?? first(params.success)
      }
      drillId={activeDrill?.id}
    programId={programId}
      autoStart={drillStarted}
      mode={mode}
    />
  );
}

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}
