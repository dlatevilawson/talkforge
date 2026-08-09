/**
 * System 1 — Truth engine types (BUILD-SYS1-001 / EXEC Step 13)
 *
 * Binding doctrine: POM-001 · LP-LAW-001 · CONST Articles X–XII
 * Laws: Evidence before Intelligence · Purpose Autonomy · One-way flow
 *
 * Experiences NEVER write Living Profile identity fields.
 * Only member declaration + Intelligence Engine (with evidence) may write.
 */

import type { PresenceScores, ProfileSource } from "./assessment";

/** Provenance for any Living Profile claim (Law #014). */
export type EvidenceSourceKind =
  | "member_declared"
  | "session_observation"
  | "coach_insight"
  | "confirmed_by_member"
  | "imported";

export type ProvenanceRecord = {
  id: string;
  /** Field path on Living Profile, e.g. "personalPrinciples[0]" */
  fieldPath: string;
  claim: string;
  sourceKind: EvidenceSourceKind;
  /** Observation / session / note ids that support the claim */
  evidenceRefs: string[];
  confidence: "high" | "medium" | "low";
  createdAt: string;
  updatedAt: string;
  /** True only after member confirmation when source is not member_declared */
  memberConfirmed: boolean;
};

export type CoachingIntensity = "gentle" | "steady" | "direct" | "challenging";

export type SeasonKind =
  | "career"
  | "relationship"
  | "leadership"
  | "confidence"
  | "negotiation"
  | "family"
  | "health"
  | "other";

export type LifeSeason = {
  id: string;
  kind: SeasonKind;
  label: string;
  /** Primary or secondary */
  rank: "primary" | "secondary";
  notes: string;
  startedAt: string | null;
};

/**
 * Conversation lifecycle for conversations that matter (SYS1).
 * Avoided conversations are first-class — not invisible notes.
 */
export type ConversationLifecycleStatus =
  | "avoided"
  | "named"
  | "preparing"
  | "practiced"
  | "attempted_in_reality"
  | "integrated"
  | "archived";

export type MatteringConversation = {
  id: string;
  userId: string;
  title: string;
  counterpart: string;
  whyItMatters: string;
  status: ConversationLifecycleStatus;
  /** Links to practice_sessions / reality captures when present */
  sessionIds: string[];
  realityCaptureIds: string[];
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

export type PersonalPrinciple = {
  id: string;
  text: string;
  /** Must be member-declared (Purpose Autonomy) */
  declaredBy: "member";
  provenanceId: string | null;
  createdAt: string;
};

/**
 * Living Profile — single source of truth for who the member is becoming.
 * Member-facing synthesis of the Personal Operating Model.
 */
export type LivingProfile = {
  userId: string;
  /** Optimistic-concurrency token. Zero means the row is not persisted yet. */
  version: number;
  displayName: string;
  preferredNickname: string;
  /** Member-owned purpose / north star — never AI-decided */
  purposeStatement: string;
  personalPrinciples: PersonalPrinciple[];
  seasons: LifeSeason[];
  coachingIntensity: CoachingIntensity;
  preferredCoachingStyle: string;
  /** Conversations that matter — lifecycle objects */
  matteringConversationIds: string[];
  /** Provenance ledger for profile claims */
  provenance: ProvenanceRecord[];
  /** Assessment test slice — inferred 1–10 scores (null if incomplete/unscored). */
  presenceScores: PresenceScores | null;
  /** Assessment test slice — goals surfaced in conversation. */
  goals: string[];
  /** Assessment test slice — strengths surfaced in conversation. */
  strengths: string[];
  /** Assessment test slice — challenges surfaced in conversation. */
  challenges: string[];
  /** How the current snapshot was captured. */
  profileSource: ProfileSource | null;
  updatedAt: string;
};

/** One-way flow guard: experiences may propose, never commit identity. */
export type IdentityWriteAuthority = "member" | "intelligence_with_evidence";

export function canWriteLivingProfileField(
  authority: IdentityWriteAuthority,
  provenance: Pick<ProvenanceRecord, "sourceKind" | "memberConfirmed">
): boolean {
  if (authority === "member") return true;
  if (provenance.sourceKind === "member_declared") return true;
  if (provenance.sourceKind === "confirmed_by_member") return true;
  return provenance.memberConfirmed;
}

export const CONVERSATION_LIFECYCLE_ORDER: ConversationLifecycleStatus[] = [
  "avoided",
  "named",
  "preparing",
  "practiced",
  "attempted_in_reality",
  "integrated",
  "archived",
];
