/**
 * System 2 contracts — BUILD-SYS2 / Conditional GO remediation.
 *
 * Readiness may recommend, rank, and narrow.
 * Readiness must NOT invent identity or become a second profile store.
 *
 * Binding chain: Living Profile → Readiness → Adaptive Homepage → Coaching
 */
import type { LivingProfile, ProvenanceRecord } from "@/lib/system1/types";

export type ReadinessState =
  | "profile_incomplete"
  | "awaiting_readiness"
  | "ready_for_recommendation"
  | "in_coaching";

export type ReadinessEvidenceHint = {
  /** Unconfirmed / derived observation — never treated as identity */
  claim: string;
  fieldPath: string;
  memberConfirmed: boolean;
  sourceKind: ProvenanceRecord["sourceKind"];
};

export type RankedCandidate = {
  id: string;
  label: string;
  score: number;
  /** Where the candidate came from — identity vs evidence labeled */
  source: "purpose" | "season" | "principle" | "pending_evidence";
  /** True only for Living Profile identity sources */
  isIdentity: boolean;
};

export type ReadinessResult = {
  state: ReadinessState;
  /** Stable coaching objective — not a menu of missions */
  objective: string | null;
  rationale: string;
  /** False until Living Profile has minimum declared context */
  profileGatePassed: boolean;
  /** Ranked candidates after narrow — recommendation uses top only */
  ranked: RankedCandidate[];
  updatedAt: string;
};

export type MissionRecommendation = {
  /** Single recommended next step — never a six-way equal choice */
  title: string;
  href: string;
  continuityLine: string;
  source: "readiness" | "continuity_stub";
  rankedFrom?: RankedCandidate[];
};

export type AdaptiveHomeModel = {
  readiness: ReadinessResult;
  recommendation: MissionRecommendation | null;
  /** Analytics surfaces must not replace this as home */
  isPrimaryHome: true;
};

function pendingEvidenceFromProfile(
  profile: LivingProfile
): ReadinessEvidenceHint[] {
  return profile.provenance
    .filter((p) => !p.memberConfirmed && p.sourceKind !== "member_declared")
    .slice(0, 8)
    .map((p) => ({
      claim: p.claim,
      fieldPath: p.fieldPath,
      memberConfirmed: p.memberConfirmed,
      sourceKind: p.sourceKind,
    }));
}

/**
 * Rank candidates from Living Profile (+ labeled evidence hints).
 * Evidence may influence ranking but never becomes identity.
 */
export function rankReadinessCandidates(
  profile: LivingProfile,
  evidenceHints: ReadinessEvidenceHint[] = []
): RankedCandidate[] {
  const ranked: RankedCandidate[] = [];

  const purpose = profile.purposeStatement.trim();
  if (purpose) {
    ranked.push({
      id: "purpose",
      label: purpose,
      score: 100,
      source: "purpose",
      isIdentity: true,
    });
  }

  const primary = profile.seasons.find((s) => s.rank === "primary");
  if (primary?.label.trim()) {
    ranked.push({
      id: `season_${primary.id}`,
      label: primary.label.trim(),
      score: 85,
      source: "season",
      isIdentity: true,
    });
  }

  for (const season of profile.seasons.filter((s) => s.rank !== "primary")) {
    if (!season.label.trim()) continue;
    ranked.push({
      id: `season_${season.id}`,
      label: season.label.trim(),
      score: 70,
      source: "season",
      isIdentity: true,
    });
  }

  for (const principle of profile.personalPrinciples) {
    if (!principle.text.trim()) continue;
    ranked.push({
      id: `principle_${principle.id}`,
      label: principle.text.trim(),
      score: 60,
      source: "principle",
      isIdentity: true,
    });
  }

  // Pending evidence: lower score, explicitly not identity
  for (const hint of evidenceHints) {
    const claim = hint.claim.trim();
    if (!claim) continue;
    ranked.push({
      id: `evidence_${hint.fieldPath}_${claim.slice(0, 24)}`,
      label: claim,
      score: hint.memberConfirmed ? 50 : 35,
      source: "pending_evidence",
      isIdentity: false,
    });
  }

  return ranked.sort((a, b) => b.score - a.score);
}

/** Narrow ranked list to a single objective (identity preferred over evidence). */
export function narrowToObjective(
  ranked: RankedCandidate[]
): RankedCandidate | null {
  const identity = ranked.find((c) => c.isIdentity);
  return identity ?? ranked[0] ?? null;
}

/**
 * Readiness evaluation — consumes Living Profile + labeled evidence only.
 * Does not write identity. Does not store a second profile.
 */
export function evaluateReadiness(
  profile: LivingProfile | null,
  evidenceHints?: ReadinessEvidenceHint[]
): ReadinessResult {
  const updatedAt = new Date().toISOString();
  if (!profile) {
    return {
      state: "profile_incomplete",
      objective: null,
      rationale:
        "Living Profile is not loaded. Continuity home must not offer a mission menu.",
      profileGatePassed: false,
      ranked: [],
      updatedAt,
    };
  }

  const hints = evidenceHints ?? pendingEvidenceFromProfile(profile);
  const hasPurpose = Boolean(profile.purposeStatement.trim());
  const hasPrinciple = profile.personalPrinciples.length > 0;
  const hasSeason = profile.seasons.length > 0;

  // Account displayName alone (signup bootstrap) is not readiness.
  // Members must declare purpose, a principle, or a season first (BS-011).
  if (!hasPurpose && !hasPrinciple && !hasSeason) {
    return {
      state: "profile_incomplete",
      objective: null,
      rationale:
        "Member has not declared enough Living Profile context for readiness.",
      profileGatePassed: false,
      ranked: [],
      updatedAt,
    };
  }

  const ranked = rankReadinessCandidates(profile, hints);
  const top = narrowToObjective(ranked);
  const objective = top?.label ?? null;

  return {
    state: objective ? "ready_for_recommendation" : "awaiting_readiness",
    objective,
    rationale: objective
      ? top?.isIdentity
        ? "Ranked from Living Profile identity — one continuity next step."
        : "Narrowed using labeled evidence only — not committed as identity."
      : "Profile started; readiness still forming — one gentle entry, no menu.",
    profileGatePassed: true,
    ranked: ranked.slice(0, 5),
    updatedAt,
  };
}

/**
 * Adaptive Homepage — recommendation-only. Does not invent a second brain.
 */
export function buildAdaptiveHome(
  profile: LivingProfile | null,
  evidenceHints?: ReadinessEvidenceHint[]
): AdaptiveHomeModel {
  const readiness = evaluateReadiness(profile, evidenceHints);
  const name =
    profile?.preferredNickname.trim() ||
    profile?.displayName.trim().split(/\s+/)[0] ||
    "";

  if (!readiness.profileGatePassed) {
    return {
      readiness,
      recommendation: {
        title: "Begin with Forge",
        href: "/app/practice",
        continuityLine: name
          ? `${name}, start by naming what matters on your Living Profile — then practice.`
          : "Start by naming what matters on your Living Profile — then practice.",
        source: "continuity_stub",
        rankedFrom: [],
      },
      isPrimaryHome: true,
    };
  }

  const objective = readiness.objective;
  return {
    readiness,
    recommendation: {
      title: objective ? "Continue where you are becoming" : "Practice with Forge",
      href: "/app/practice",
      continuityLine: objective
        ? `Keep working on: ${objective}. Or tell Forge if something new is on your mind.`
        : "Continue recent work, or tell Forge if something new is on your mind.",
      source: "readiness",
      rankedFrom: readiness.ranked,
    },
    isPrimaryHome: true,
  };
}

/** Recommend = evaluate + single MissionRecommendation (no menu). */
export function recommendNextStep(
  profile: LivingProfile | null,
  evidenceHints?: ReadinessEvidenceHint[]
): MissionRecommendation | null {
  return buildAdaptiveHome(profile, evidenceHints).recommendation;
}
