import VoiceArena from "@/app/components/VoiceArena";
import EndOfFreePractice from "@/app/components/billing/EndOfFreePractice";
import type { CeSessionMode, CeTrack } from "@/lib/ce/session-config";
import { evaluatePracticeEntitlement } from "@/lib/billing/entitlements";
import { evaluatePracticeRouteAccess } from "@/lib/system2/server-readiness";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { coachTopicById } from "@/lib/assistant-coach/coach-topics";
import Link from "next/link";
import { getActiveDrill, getLatestDrillTarget, getTodayJourney } from "@/lib/journey/server";
import { drillPhaseLabel } from "@/lib/drills/catalog";
import TextDrillCompletion from "@/app/components/journey/TextDrillCompletion";
import { parseAssessmentSnapshot, type AssessmentSnapshot } from "@/lib/ce/assessment-lifecycle";

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
    target?: string | string[];
    repeat?: string | string[];
    repeatDayId?: string | string[];
    briefed?: string | string[];
  }>;
}) {
  await connection();
  const params = await searchParams;
  const title = first(params.title);
  const coachTopic = coachTopicById(first(params.topic));
  const drill = await getActiveDrill(first(params.drill));
  const drillStarted = first(params.start) === "1";
  const programId = first(params.programId);
  const repeat = first(params.repeat) === "1";
  const repeatDayId = first(params.repeatDayId);
  const carriedTarget = first(params.target)?.trim() || "";
  const briefed = first(params.briefed) === "1";
  const modeRaw = first(params.mode);
  const mode: CeSessionMode = modeRaw === "assessment" ? "assessment" : "practice";
  const journey = programId ? await getTodayJourney().catch(() => null) : null;
  const activeDrill = drill ?? (journey?.status === "today" ? journey.day.drill : null);
  const targetForRep = activeDrill
    ? carriedTarget || await getLatestDrillTarget({ drillId: activeDrill.id, signal: activeDrill.signal }).catch(() => null)
    : null;

  if (repeat && programId && !repeatDayId) {
    return <main className="min-h-screen bg-[#07070a] px-6 py-16 text-zinc-100"><div className="mx-auto max-w-xl rounded-2xl border border-white/10 bg-white/[0.04] p-6"><h1 className="text-xl font-semibold">This repeat is not linked to its program day</h1><p className="mt-3 text-sm leading-6 text-zinc-400">Return to the debrief and try again. Your plan day has not changed.</p><Link href="/app" className="mt-5 inline-flex text-sm underline">Back home</Link></div></main>;
  }

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
  let recentPracticeLine = "No prior practice session.";
  let assessmentResumeSnapshot: AssessmentSnapshot | null = null;
  let assessmentDailyMinutes: 5 | 10 | 15 | null = null;
  if (user) {
    if (mode === "assessment") {
      const [planResult, profileResult] = await Promise.all([
        supabase.from("training_plans").select("daily_minutes").eq("member_id", user.id).eq("status", "active").maybeSingle(),
        supabase.from("living_profiles").select("provenance").eq("user_id", user.id).maybeSingle(),
      ]);
      const planMinutes = planResult.data?.daily_minutes;
      if (planMinutes === 5 || planMinutes === 10 || planMinutes === 15) assessmentDailyMinutes = planMinutes;
      const provenance = Array.isArray(profileResult.data?.provenance) ? profileResult.data.provenance as Array<{ fieldPath?: string; claim?: string }> : [];
      const resumeRecord = provenance.find((entry) => entry.fieldPath === "assessment_resume_snapshot");
      if (resumeRecord?.claim) {
        try { assessmentResumeSnapshot = parseAssessmentSnapshot(JSON.parse(resumeRecord.claim)); } catch { assessmentResumeSnapshot = null; }
      }
    }
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { data: recent } = await supabase
      .from("practice_sessions")
      .select("scenario_title, drill_id, started_at")
      .eq("user_id", user.id)
      .eq("purpose", "drill")
      .not("completed_at", "is", null)
      .lt("started_at", todayStart.toISOString())
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (recent) {
      const date = new Date(recent.started_at).toISOString().slice(0, 10);
      recentPracticeLine = `Your last practice was ${recent.scenario_title || "a drill"} on ${date}.`;
    }
  }
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
  const openingContext = journey?.status === "today"
    ? `Today is day ${journey.day.dayIndex} of your ${journey.plan.kind === "6_week" ? "6-week" : "6-month"} plan. Today's drill is ${journey.day.drill.name}. ${journey.plan.occasionText ? `Your occasion is ${journey.plan.occasionText}${journey.plan.occasionDate ? ` on ${journey.plan.occasionDate}` : ""}.` : "There is no occasion countdown."} ${recentPracticeLine}`
    : recentPracticeLine;

  const trackRaw = first(params.track);
  const track: CeTrack =
    trackRaw === "system_design" ||
    trackRaw === "behavioral_tech" ||
    trackRaw === "coding_interview" ||
    trackRaw === "hello"
      ? trackRaw
      : "hello";
  if (activeDrill && activeDrill.modality !== "voice" && ((programId && journey) || repeat)) {
    return <TextDrillCompletion drill={activeDrill} programId={programId} repeat={repeat} repeatDayId={repeatDayId} target={targetForRep} />;
  }

  if (activeDrill && (!drillStarted || (repeat && !briefed))) {
    const startHref = repeat
      ? `/app/practice?drill=${encodeURIComponent(activeDrill.id)}&start=1&repeat=1&briefed=1&target=${encodeURIComponent(targetForRep ?? "")}${programId ? `&programId=${encodeURIComponent(programId)}` : ""}${repeatDayId ? `&repeatDayId=${encodeURIComponent(repeatDayId)}` : ""}`
      : "/app/practice?drill=" + encodeURIComponent(activeDrill.id) + "&programId=" + encodeURIComponent(programId ?? "") + "&start=1";
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
          {drillPhaseLabel(activeDrill.phase) ? <p className="mt-2 text-sm text-zinc-500">{drillPhaseLabel(activeDrill.phase)}</p> : null}
          {targetForRep ? <p className="mt-4 rounded-xl border border-[#c9a95f]/25 bg-[#c9a95f]/10 p-4 text-sm leading-6 text-[#f1d99b]">{repeat ? "Same drill, one change: " : "Your target this rep: "}{targetForRep}</p> : null}
          <section className="mt-10 rounded-2xl border border-white/10 bg-white/[0.04] p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#d7b56a]">
              How it works
            </h2>
            <p className="mt-4 text-lg leading-8 text-zinc-200">{activeDrill.instructions}</p>
            {activeDrill.question ? <p className="mt-6 border-t border-white/10 pt-5 text-sm leading-6 text-zinc-200"><span className="font-semibold text-[#e7d6b1]">Question to answer:</span> {activeDrill.question}</p> : null}
            {activeDrill.workedExample ? <p className="mt-4 whitespace-pre-line rounded-xl border border-[#c9a95f]/20 bg-[#c9a95f]/5 p-4 text-sm leading-6 text-zinc-300"><span className="font-semibold text-[#e7d6b1]">Worked example:</span>{"\n"}{activeDrill.workedExample}</p> : null}
            <p className="mt-6 border-t border-white/10 pt-5 text-sm leading-6 text-zinc-400">
              Look for: {activeDrill.goodLooksLike}
            </p>
          </section>
          <div className="mt-8 flex items-center gap-4">
            <Link
              href={startHref}
              className="rounded-full bg-[#f4f0e8] px-6 py-3 font-semibold text-black"
            >
              {repeat ? "Start repeat" : "Start drill"}
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
      repeatDayId={repeat ? repeatDayId : undefined}
      openingContext={openingContext}
      autoStart={drillStarted}
      mode={mode}
      assessmentResumeSnapshot={assessmentResumeSnapshot}
      assessmentDailyMinutes={assessmentDailyMinutes}
    />
  );
}

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

