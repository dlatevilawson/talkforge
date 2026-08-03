/** Explicit legacy migration: CoachMemory values become pending evidence only. */
import type { CoachMemory } from "@/lib/coach/types";
import {
  canWriteLivingProfileField,
  type LivingProfile,
  type ProvenanceRecord,
} from "@/lib/system1/types";

export type LegacyEvidenceMigrationResult = {
  profile: LivingProfile;
  importedCount: number;
};

export function attachLegacyCoachMemoryEvidence(
  profile: LivingProfile,
  memory: CoachMemory | null
): LegacyEvidenceMigrationResult {
  if (!memory) return { profile, importedCount: 0 };

  const goals = memory.communicationGoals.filter(Boolean);
  const challenges = memory.longTermChallenges.filter(Boolean);
  const candidates = [
    ["preferredNickname", memory.preferredNickname.trim()],
    ["purposeStatement", goals.join("; ")],
    ["seasons", challenges.join("; ")],
    ["preferredCoachingStyle", memory.preferredCoachingStyle.trim()],
  ] as const;
  const existingIds = new Set(profile.provenance.map((record) => record.id));
  const timestamp = memory.updatedAt || new Date().toISOString();
  const additions: ProvenanceRecord[] = [];

  for (const [fieldPath, claim] of candidates) {
    if (!claim) continue;
    const id = `prov_legacy_${fieldPath}_${profile.userId}`;
    if (existingIds.has(id)) continue;

    const provenance: ProvenanceRecord = {
      id,
      fieldPath,
      claim,
      sourceKind: "imported",
      evidenceRefs: ["coach_memory"],
      confidence: "low",
      createdAt: timestamp,
      updatedAt: timestamp,
      memberConfirmed: false,
    };
    if (
      canWriteLivingProfileField("intelligence_with_evidence", provenance)
    ) {
      throw new Error("Unconfirmed legacy evidence cannot write identity.");
    }
    additions.push(provenance);
  }

  if (additions.length === 0) return { profile, importedCount: 0 };
  return {
    profile: {
      ...profile,
      provenance: [...additions, ...profile.provenance].slice(0, 200),
      updatedAt: new Date().toISOString(),
    },
    importedCount: additions.length,
  };
}
