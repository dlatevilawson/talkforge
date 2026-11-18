import type { LivingProfile } from "@/lib/system1/types";

export const READINESS_SIGNAL_NAMES = [
  "Purpose",
  "Perspective",
  "Composure",
  "Message",
  "Adaptability",
] as const;

export function assessmentBaseline(profile: LivingProfile | null) {
  if (!profile || profile.profileSource === "incomplete") {
    return { state: "learning" as const, message: "We're still learning your starting point.", sourceDate: profile?.updatedAt ?? null };
  }
  if (profile.profileSource !== "assessment") return { state: "unavailable" as const, sourceDate: profile.updatedAt };
  const bottleneck = profile.challenges.find((item) => item.trim()) ?? null;
  return {
    state: "captured" as const,
    sourceDate: profile.updatedAt,
    bottleneck,
    whyFirst: bottleneck ? "This is first because it is the clearest challenge you named in your assessment." : null,
    signals: READINESS_SIGNAL_NAMES.map((name) => ({ name, evidence: "Not measured yet" as const })),
  };
}
