import VoiceArena from "@/app/components/VoiceArena";
import type { CeTrack } from "@/lib/ce/session-config";

export default async function VoicePage({
  searchParams,
}: {
  searchParams: Promise<{
    track?: string | string[];
    title?: string | string[];
    success?: string | string[];
  }>;
}) {
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
    />
  );
}

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}
