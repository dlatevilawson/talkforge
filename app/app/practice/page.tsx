import VoiceArena from "@/app/components/VoiceArena";
import type { CeTrack } from "@/lib/ce/session-config";
import { evaluatePracticeRouteAccess } from "@/lib/system2/server-readiness";
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
  }>;
}) {
  await connection();
  const access = await evaluatePracticeRouteAccess();
  if (!access.allowed) {
    redirect("/app");
  }

  const params = await searchParams;
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
      eventTitle={first(params.title)}
      successCriteria={first(params.success)}
      autoStart={first(params.start) === "1"}
    />
  );
}

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}
