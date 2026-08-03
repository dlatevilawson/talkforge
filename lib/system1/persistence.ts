import type { LivingProfile } from "./types";

export type LivingProfileRow = {
  user_id: string;
  display_name?: string | null;
  preferred_nickname?: string | null;
  purpose_statement?: string | null;
  personal_principles?: LivingProfile["personalPrinciples"] | null;
  seasons?: LivingProfile["seasons"] | null;
  coaching_intensity?: LivingProfile["coachingIntensity"] | null;
  preferred_coaching_style?: string | null;
  mattering_conversation_ids?: string[] | null;
  provenance?: LivingProfile["provenance"] | null;
  updated_at?: string | null;
};

/** Map the canonical database row without creating a second profile shape. */
export function mapLivingProfileRow(row: LivingProfileRow): LivingProfile {
  return {
    userId: row.user_id,
    displayName: row.display_name ?? "",
    preferredNickname: row.preferred_nickname ?? "",
    purposeStatement: row.purpose_statement ?? "",
    personalPrinciples: row.personal_principles ?? [],
    seasons: row.seasons ?? [],
    coachingIntensity: row.coaching_intensity ?? "steady",
    preferredCoachingStyle: row.preferred_coaching_style ?? "",
    matteringConversationIds: row.mattering_conversation_ids ?? [],
    provenance: row.provenance ?? [],
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
}
