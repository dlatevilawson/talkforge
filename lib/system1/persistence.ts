import {
  normalizePresenceScores,
  normalizeStringList,
  type ProfileSource,
} from "./assessment";
import type { LivingProfile } from "./types";

export type LivingProfileRow = {
  user_id: string;
  version?: number | null;
  display_name?: string | null;
  preferred_nickname?: string | null;
  purpose_statement?: string | null;
  personal_principles?: LivingProfile["personalPrinciples"] | null;
  seasons?: LivingProfile["seasons"] | null;
  coaching_intensity?: LivingProfile["coachingIntensity"] | null;
  preferred_coaching_style?: string | null;
  mattering_conversation_ids?: string[] | null;
  provenance?: LivingProfile["provenance"] | null;
  presence_scores?: LivingProfile["presenceScores"] | null;
  goals?: string[] | null;
  strengths?: string[] | null;
  challenges?: string[] | null;
  profile_source?: string | null;
  updated_at?: string | null;
};

function mapProfileSource(value: unknown): ProfileSource | null {
  if (
    value === "quick_pick" ||
    value === "assessment" ||
    value === "incomplete"
  ) {
    return value;
  }
  return null;
}

/** Map the canonical database row without creating a second profile shape. */
export function mapLivingProfileRow(row: LivingProfileRow): LivingProfile {
  return {
    userId: row.user_id,
    version: row.version ?? 0,
    displayName: row.display_name ?? "",
    preferredNickname: row.preferred_nickname ?? "",
    purposeStatement: row.purpose_statement ?? "",
    personalPrinciples: row.personal_principles ?? [],
    seasons: row.seasons ?? [],
    coachingIntensity: row.coaching_intensity ?? "steady",
    preferredCoachingStyle: row.preferred_coaching_style ?? "",
    matteringConversationIds: row.mattering_conversation_ids ?? [],
    provenance: row.provenance ?? [],
    presenceScores: normalizePresenceScores(row.presence_scores),
    goals: normalizeStringList(row.goals, 8),
    strengths: normalizeStringList(row.strengths, 8),
    challenges: normalizeStringList(row.challenges, 8),
    profileSource: mapProfileSource(row.profile_source),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
}
