/**
 * Thin Living Profile helpers — SSOT substrate (AUDIT-001 C4).
 * Persistence soft-fails when the table is not yet migrated.
 */
import {
  canWriteLivingProfileField,
  type LivingProfile,
  type ProvenanceRecord,
} from "@/lib/system1/types";
import type { IdentityEvidenceProposal } from "@/lib/system1/proposals";

export function emptyLivingProfile(
  userId: string,
  displayName = ""
): LivingProfile {
  return {
    userId,
    version: 0,
    displayName,
    preferredNickname: "",
    purposeStatement: "",
    personalPrinciples: [],
    seasons: [],
    coachingIntensity: "steady",
    preferredCoachingStyle: "",
    matteringConversationIds: [],
    provenance: [],
    presenceScores: null,
    goals: [],
    strengths: [],
    challenges: [],
    profileSource: null,
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
    .map(toPendingProvenance);
  if (additions.length === 0) return profile;
  return {
    ...profile,
    provenance: [...additions, ...profile.provenance].slice(0, 200),
    updatedAt: new Date().toISOString(),
  };
}

function toPendingProvenance(
  proposal: IdentityEvidenceProposal
): ProvenanceRecord {
  if (proposal.status !== "pending") {
    throw new Error("Session evidence must enter Living Profile as pending.");
  }

  const provenance: ProvenanceRecord = {
    id: proposal.id,
    fieldPath: proposal.fieldPath,
    claim: proposal.claim,
    sourceKind: proposal.sourceKind,
    evidenceRefs: proposal.evidenceRefs,
    confidence: proposal.confidence,
    createdAt: proposal.createdAt,
    updatedAt: proposal.createdAt,
    memberConfirmed: false,
  };

  if (
    canWriteLivingProfileField("intelligence_with_evidence", provenance)
  ) {
    throw new Error(
      "Identity-authorized evidence cannot enter through a session experience."
    );
  }

  return provenance;
}
