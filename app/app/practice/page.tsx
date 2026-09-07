import VoiceArena from "@/app/components/VoiceArena";
import EndOfFreePractice from "@/app/components/billing/EndOfFreePractice";
import type { CeSessionMode, CeTrack } from "@/lib/ce/session-config";
import { evaluatePracticeEntitlement } from "@/lib/billing/entitlements";
import { evaluatePracticeRouteAccess } from "@/lib/system2/server-readiness";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ensurePersistedLivingProfile } from "@/lib/system1/ensure-living-profile";
import {
  COACH_WIZARD_HANDOFF_SOURCE,
  isCoachWizardHandoffSource,
  resolveCoachWizardPracticeContext,
} from "@/lib/assistant-coach/forge-handoff";
import { redirect } from "next/navigation";
import { connection } from "next/server";

export default async function VoicePage({
  searchParams,
}: {
  searchParams: Promise<{
    track?: string | string[];
    title?: string | string[];
    success?: string | string[];
    start?: string | string[];
    mode?: string | string[];
    source?: string | string[];
  }>;
}) {
  await connection();
  const params = await searchParams;
  const source = first(params.source);
  const modeRaw = first(params.mode);
  const mode: CeSessionMode =
    modeRaw === "assessment" ? "assessment" : "practice";
  const wizardHandoff =
    mode === "practice" && isCoachWizardHandoffSource(source);

  const access = await evaluatePracticeRouteAccess();
  if (!access.allowed) {
    redirect(`/app?gate=${access.reason}`);
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/app/practice");
  const ensured = await ensurePersistedLivingProfile(supabase, user);
  const practiceContext = resolveCoachWizardPracticeContext({
    source,
    mode,
    memberPracticeProfile: ensured.profile?.memberPracticeProfile,
  });
  if (wizardHandoff && !practiceContext) {
    redirect("/coach?activation=retry");
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

  const trackRaw = first(params.track);
  const track: CeTrack =
    trackRaw === "system_design" ||
    trackRaw === "behavioral_tech" ||
    trackRaw === "coding_interview" ||
    trackRaw === "hello"
      ? trackRaw
      : "hello";
  return (
    <VoiceArena
      track={track}
      eventTitle={practiceContext ? undefined : first(params.title)}
      successCriteria={practiceContext ? undefined : first(params.success)}
      autoStart={wizardHandoff || first(params.start) === "1"}
      mode={mode}
      handoffSource={
        wizardHandoff ? COACH_WIZARD_HANDOFF_SOURCE : undefined
      }
      practiceContext={practiceContext}
    />
  );
}

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}
