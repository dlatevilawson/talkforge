/**
 * Member-authorized Living Profile writes with provenance (Law #014 / #015).
 * Only authority: "member". Experiences must not call this with inferred claims.
 */
import type {
  LifeSeason,
  LivingProfile,
  PersonalPrinciple,
  ProvenanceRecord,
} from "@/lib/system1/types";

export type MemberLivingProfileInput = {
  displayName?: string;
  preferredNickname?: string;
  purposeStatement?: string;
  /** Plain principle lines — converted to PersonalPrinciple */
  principleLines?: string[];
  /** Challenge / season labels — converted to LifeSeason */
  seasonLabels?: string[];
  preferredCoachingStyle?: string;
  coachingIntensity?: LivingProfile["coachingIntensity"];
};

function newId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function memberProvenance(
  fieldPath: string,
  claim: string,
  now: string
): ProvenanceRecord {
  return {
    id: newId("prov"),
    fieldPath,
    claim,
    sourceKind: "member_declared",
    evidenceRefs: ["member_settings"],
    confidence: "high",
    createdAt: now,
    updatedAt: now,
    memberConfirmed: true,
  };
}

/**
 * Apply member-declared identity updates. Preserves prior provenance and
 * appends member_declared records for changed fields.
 */
export function applyMemberLivingProfileUpdate(
  current: LivingProfile,
  input: MemberLivingProfileInput
): LivingProfile {
  const now = new Date().toISOString();
  const provenance: ProvenanceRecord[] = [...current.provenance];
  const next: LivingProfile = { ...current, updatedAt: now };

  if (typeof input.displayName === "string") {
    const v = input.displayName.trim();
    if (v !== current.displayName) {
      next.displayName = v;
      provenance.unshift(memberProvenance("displayName", v || "(cleared)", now));
    }
  }

  if (typeof input.preferredNickname === "string") {
    const v = input.preferredNickname.trim();
    if (v !== current.preferredNickname) {
      next.preferredNickname = v;
      provenance.unshift(
        memberProvenance("preferredNickname", v || "(cleared)", now)
      );
    }
  }

  if (typeof input.purposeStatement === "string") {
    const v = input.purposeStatement.trim();
    if (v !== current.purposeStatement) {
      next.purposeStatement = v;
      provenance.unshift(
        memberProvenance("purposeStatement", v || "(cleared)", now)
      );
    }
  }

  if (typeof input.preferredCoachingStyle === "string") {
    const v = input.preferredCoachingStyle.trim();
    if (v !== current.preferredCoachingStyle) {
      next.preferredCoachingStyle = v;
      provenance.unshift(
        memberProvenance("preferredCoachingStyle", v || "(cleared)", now)
      );
    }
  }

  if (input.coachingIntensity && input.coachingIntensity !== current.coachingIntensity) {
    next.coachingIntensity = input.coachingIntensity;
    provenance.unshift(
      memberProvenance("coachingIntensity", input.coachingIntensity, now)
    );
  }

  if (input.principleLines) {
    const lines = input.principleLines.map((l) => l.trim()).filter(Boolean);
    const principles: PersonalPrinciple[] = lines.map((text) => ({
      id: newId("prin"),
      text,
      declaredBy: "member" as const,
      provenanceId: null,
      createdAt: now,
    }));
    next.personalPrinciples = principles;
    provenance.unshift(
      memberProvenance(
        "personalPrinciples",
        lines.length ? lines.join("; ") : "(cleared)",
        now
      )
    );
  }

  if (input.seasonLabels) {
    const labels = input.seasonLabels.map((l) => l.trim()).filter(Boolean);
    const seasons: LifeSeason[] = labels.map((label, i) => ({
      id: newId("season"),
      kind: "other",
      label,
      rank: i === 0 ? "primary" : "secondary",
      notes: "",
      startedAt: null,
    }));
    next.seasons = seasons;
    provenance.unshift(
      memberProvenance(
        "seasons",
        labels.length ? labels.join("; ") : "(cleared)",
        now
      )
    );
  }

  next.provenance = provenance.slice(0, 200);
  return next;
}
