import VoiceArena from "@/app/components/VoiceArena";
import EndOfFreePractice from "@/app/components/billing/EndOfFreePractice";
import type { CeSessionMode, CeTrack } from "@/lib/ce/session-config";
import { evaluatePracticeEntitlement } from "@/lib/billing/entitlements";
import {
  AC_HANDOFF_SOURCE,
  isAssistantCoachPracticeHandoff,
} from "@/lib/assistant-coach/confirmation";
import { evaluatePracticeRouteAccess } from "@/lib/system2/server-readiness";
import { createServerSupabaseClient } from "@/lib/supabase/server";
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
  const title = first(params.title);
  const source = first(params.source);
  const acHandoff = isAssistantCoachPracticeHandoff({ source, title });

  const access = await evaluatePracticeRouteAccess();
  if (!access.allowed) {
    if (acHandoff && access.reason !== "unauthenticated") {
      // Confirmed AC moment is the starting context for this entry path.
      // Do not send the member through ContinuityHome / focus picker.
    } else {
      redirect(`/app?gate=${access.reason}`);
    }
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

  return (
    <VoiceArena
      track={track}
      eventTitle={title}
      successCriteria={first(params.success)}
      autoStart={first(params.start) === "1"}
      mode={mode}
      handoffSource={acHandoff ? AC_HANDOFF_SOURCE : undefined}
    />
  );
}

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}
