/**
 * Claim merge: anonymous draft → member Living Profile (AC-JOURNEY-001 §F.2).
 * System 1 remains the sole writer of evidence/insights.
 * Never overwrite member purpose / principles / seasons.
 */
import { emptyLivingProfile } from "../system1/profile.ts";
import { deriveProfileInsights } from "../system1/profile-intelligence.ts";
import type { ProfileEvidenceRecord } from "../system1/profile-evidence.ts";
import type { LivingProfile, ProvenanceRecord } from "../system1/types.ts";

const LIST_CAP = 8;

export class AssistantCoachClaimError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "AssistantCoachClaimError";
    this.code = code;
    this.status = status;
  }
}

export function draftJsonToLivingProfile(
  sessionId: string,
  profileJson: Record<string, unknown> | null | undefined
): LivingProfile {
  const base = emptyLivingProfile(`anon:${sessionId}`, "");
  if (!profileJson || typeof profileJson !== "object") return base;
  return {
    ...base,
    ...profileJson,
    userId: base.userId,
    purposeStatement:
      typeof profileJson.purposeStatement === "string"
        ? profileJson.purposeStatement
        : base.purposeStatement,
    evidenceLedger: Array.isArray(profileJson.evidenceLedger)
      ? (profileJson.evidenceLedger as LivingProfile["evidenceLedger"])
      : [],
    profileInsights: Array.isArray(profileJson.profileInsights)
      ? (profileJson.profileInsights as LivingProfile["profileInsights"])
      : [],
    goals: Array.isArray(profileJson.goals)
      ? (profileJson.goals as string[])
      : [],
    strengths: Array.isArray(profileJson.strengths)
      ? (profileJson.strengths as string[])
      : [],
    challenges: Array.isArray(profileJson.challenges)
      ? (profileJson.challenges as string[])
      : [],
    provenance: Array.isArray(profileJson.provenance)
      ? (profileJson.provenance as ProvenanceRecord[])
      : [],
  };
}

function normalizeText(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function unionPreferLonger(member: string[], draft: string[]): string[] {
  const out: string[] = [];
  const seen = new Map<string, string>();
  for (const raw of [...member, ...draft]) {
    const t = typeof raw === "string" ? raw.trim() : "";
    if (!t) continue;
    const key = normalizeText(t);
    const existing = seen.get(key);
    if (!existing || t.length > existing.length) {
      seen.set(key, t);
    }
  }
  for (const value of seen.values()) {
    out.push(value);
    if (out.length >= LIST_CAP) break;
  }
  return out;
}

function mergeEvidence(
  member: ProfileEvidenceRecord[],
  draft: ProfileEvidenceRecord[],
  memberUserId: string
): ProfileEvidenceRecord[] {
  const out: ProfileEvidenceRecord[] = [];
  const seen = new Set<string>();
  for (const row of [...member, ...draft]) {
    if (!row || typeof row.text !== "string") continue;
    const key = `${row.category}:${normalizeText(row.text)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      ...row,
      userId: memberUserId,
    });
  }
  return out;
}

/**
 * Merge draft into member LP. Draft purpose is always ignored.
 */
export function mergeDraftIntoMemberLivingProfile(input: {
  member: LivingProfile;
  draft: LivingProfile;
  sessionId: string;
  now?: Date;
}): LivingProfile {
  const now = (input.now ?? new Date()).toISOString();
  const member = input.member;
  const draft = input.draft;
  const purposeStatement = member.purposeStatement?.trim()
    ? member.purposeStatement
    : "";

  const evidenceLedger = mergeEvidence(
    member.evidenceLedger ?? [],
    draft.evidenceLedger ?? [],
    member.userId
  );
  const profileInsights = deriveProfileInsights(evidenceLedger, { now });

  const claimProvenance: ProvenanceRecord = {
    id: `prov_anon_session_claimed_${input.sessionId}`,
    fieldPath: "evidenceLedger",
    claim: "Anonymous Coach session claimed onto member Living Profile",
    sourceKind: "imported",
    evidenceRefs: [`assistant_coach:${input.sessionId}`],
    confidence: "high",
    createdAt: now,
    updatedAt: now,
    memberConfirmed: false,
  };

  return {
    ...member,
    purposeStatement,
    personalPrinciples: member.personalPrinciples,
    seasons: member.seasons,
    preferredCoachingStyle:
      member.preferredCoachingStyle?.trim() ||
      draft.preferredCoachingStyle ||
      "",
    coachingIntensity: member.coachingIntensity || draft.coachingIntensity,
    goals: unionPreferLonger(member.goals ?? [], draft.goals ?? []),
    strengths: unionPreferLonger(member.strengths ?? [], draft.strengths ?? []),
    challenges: unionPreferLonger(
      member.challenges ?? [],
      draft.challenges ?? []
    ),
    evidenceLedger,
    profileInsights,
    provenance: [claimProvenance, ...(member.provenance ?? [])].slice(0, 200),
    profileSource:
      member.profileSource === "assessment"
        ? "assessment"
        : member.profileSource ?? draft.profileSource,
    updatedAt: now,
  };
}
