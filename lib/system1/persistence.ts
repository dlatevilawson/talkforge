/**
 * Living Profile row mapping — single persistence shape (no second profile model).
 *
 * Phase 4B.1 (Decision 059 / OD-9): `evidence_ledger` + `profile_insights` are
 * persisted JSONB columns. System 1 remains the sole writer/authority for those
 * fields. Member / Assessment write paths must not accept client-supplied
 * evidence or insights. Validation and derivation stay in profile-evidence /
 * profile-intelligence — persistence only stores what System 1 already produced.
 */
import {
  normalizePresenceScores,
  normalizeStringList,
  type ProfileSource,
} from "./assessment.ts";
import type { ProfileEvidenceRecord } from "./profile-evidence.ts";
import type { ProfileInsight } from "./profile-intelligence.ts";
import type { LivingProfile } from "./types.ts";

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
  evidence_ledger?: ProfileEvidenceRecord[] | null;
  profile_insights?: ProfileInsight[] | null;
  presence_scores?: LivingProfile["presenceScores"] | null;
  goals?: string[] | null;
  strengths?: string[] | null;
  challenges?: string[] | null;
  profile_source?: string | null;
  updated_at?: string | null;
};

/** Canonical select list including Phase 4B.1 intelligence columns. */
export const LIVING_PROFILE_SELECT =
  "user_id, version, display_name, preferred_nickname, purpose_statement, personal_principles, seasons, coaching_intensity, preferred_coaching_style, mattering_conversation_ids, provenance, evidence_ledger, profile_insights, presence_scores, goals, strengths, challenges, profile_source, updated_at";

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

function asEvidenceLedger(value: unknown): ProfileEvidenceRecord[] {
  return Array.isArray(value) ? (value as ProfileEvidenceRecord[]) : [];
}

function asProfileInsights(value: unknown): ProfileInsight[] {
  return Array.isArray(value) ? (value as ProfileInsight[]) : [];
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
    evidenceLedger: asEvidenceLedger(row.evidence_ledger),
    profileInsights: asProfileInsights(row.profile_insights),
    presenceScores: normalizePresenceScores(row.presence_scores),
    goals: normalizeStringList(row.goals, 8),
    strengths: normalizeStringList(row.strengths, 8),
    challenges: normalizeStringList(row.challenges, 8),
    profileSource: mapProfileSource(row.profile_source),
    updatedAt: row.updated_at ?? new Date().toISOString(),
  };
}

/**
 * Member-authorized DB payload. Intentionally omits evidence_ledger and
 * profile_insights so member PUT cannot overwrite System 1 intelligence
 * (columns left unchanged on UPDATE; DB defaults apply on INSERT).
 */
export function memberLivingProfileDbPayload(profile: LivingProfile): {
  display_name: string;
  preferred_nickname: string;
  purpose_statement: string;
  personal_principles: LivingProfile["personalPrinciples"];
  seasons: LivingProfile["seasons"];
  coaching_intensity: LivingProfile["coachingIntensity"];
  preferred_coaching_style: string;
  mattering_conversation_ids: string[];
  provenance: LivingProfile["provenance"];
  updated_at: string;
} {
  return {
    display_name: profile.displayName,
    preferred_nickname: profile.preferredNickname,
    purpose_statement: profile.purposeStatement,
    personal_principles: profile.personalPrinciples,
    seasons: profile.seasons,
    coaching_intensity: profile.coachingIntensity,
    preferred_coaching_style: profile.preferredCoachingStyle,
    mattering_conversation_ids: profile.matteringConversationIds,
    provenance: profile.provenance,
    updated_at: profile.updatedAt,
  };
}

/**
 * System 1–only intelligence columns. Callers must produce these via
 * profile-evidence / profile-intelligence helpers — never raw model JSON.
 */
export function system1IntelligenceDbPayload(
  profile: Pick<LivingProfile, "evidenceLedger" | "profileInsights">
): {
  evidence_ledger: ProfileEvidenceRecord[];
  profile_insights: ProfileInsight[];
} {
  return {
    evidence_ledger: profile.evidenceLedger ?? [],
    profile_insights: profile.profileInsights ?? [],
  };
}

/** Full row shape for round-trip tests and System 1 persistence helpers. */
export function livingProfileToRow(profile: LivingProfile): LivingProfileRow {
  return {
    user_id: profile.userId,
    version: profile.version,
    display_name: profile.displayName,
    preferred_nickname: profile.preferredNickname,
    purpose_statement: profile.purposeStatement,
    personal_principles: profile.personalPrinciples,
    seasons: profile.seasons,
    coaching_intensity: profile.coachingIntensity,
    preferred_coaching_style: profile.preferredCoachingStyle,
    mattering_conversation_ids: profile.matteringConversationIds,
    provenance: profile.provenance,
    evidence_ledger: profile.evidenceLedger ?? [],
    profile_insights: profile.profileInsights ?? [],
    presence_scores: profile.presenceScores,
    goals: profile.goals,
    strengths: profile.strengths,
    challenges: profile.challenges,
    profile_source: profile.profileSource,
    updated_at: profile.updatedAt,
  };
}

/** Serialize then map — must preserve evidence/insights without re-deriving. */
export function roundTripLivingProfile(profile: LivingProfile): LivingProfile {
  return mapLivingProfileRow(livingProfileToRow(profile));
}
