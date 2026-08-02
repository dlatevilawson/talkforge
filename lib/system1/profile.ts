/**
 * Thin Living Profile helpers — SSOT substrate (AUDIT-001 C4).
 * Persistence soft-fails when the table is not yet migrated.
 */
import type { LivingProfile } from "@/lib/system1/types";
import type { IdentityEvidenceProposal } from "@/lib/system1/proposals";

export function emptyLivingProfile(
  userId: string,
  displayName = ""
): LivingProfile {
  return {
    userId,
    displayName,
    preferredNickname: "",
    purposeStatement: "",
    personalPrinciples: [],
    seasons: [],
    coachingIntensity: "steady",
    preferredCoachingStyle: "",
    matteringConversationIds: [],
    provenance: [],
    updatedAt: new Date().toISOString(),
  };
}

/** Append pending proposals into provenance ledger shape without committing identity claims. */
export function attachPendingProposals(
  profile: LivingProfile,
  proposals: IdentityEvidenceProposal[]
): LivingProfile {
  if (proposals.length === 0) return profile;
  const existingIds = new Set(profile.provenance.map((p) => p.id));
  const additions = proposals
    .filter((p) => !existingIds.has(p.id))
    .map((p) => ({
      id: p.id,
      fieldPath: p.fieldPath,
      claim: p.claim,
      sourceKind: p.sourceKind,
      evidenceRefs: p.evidenceRefs,
      confidence: p.confidence,
      createdAt: p.createdAt,
      updatedAt: p.createdAt,
      memberConfirmed: false,
    }));
  if (additions.length === 0) return profile;
  return {
    ...profile,
    provenance: [...additions, ...profile.provenance].slice(0, 200),
    updatedAt: new Date().toISOString(),
  };
}
