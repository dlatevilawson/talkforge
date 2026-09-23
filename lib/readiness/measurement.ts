export const READINESS_SIGNALS = [
  "purpose",
  "perspective",
  "composure",
  "message",
  "adaptability",
] as const;

export type ReadinessSignal = (typeof READINESS_SIGNALS)[number];

export const READINESS_NULL_REASONS = [
  "insufficient_member_turns",
  "no_defined_counterpart",
  "no_friction_event",
  "no_scenario_shift",
  "capture_quality_insufficient",
  "signal_not_applicable",
] as const;

export type ReadinessNullReason = (typeof READINESS_NULL_REASONS)[number];

export const EVIDENCE_STRENGTHS = [
  "sufficient",
  "limited",
  "insufficient",
] as const;

export type EvidenceStrength = (typeof EVIDENCE_STRENGTHS)[number];

export type ReadinessLevel = 0 | 1 | 2 | 3 | 4;

export const MEMBER_READINESS_LEVEL_LABELS: Record<ReadinessLevel, string> = {
  0: "Needs rebuilding",
  1: "Early practice",
  2: "Developing",
  3: "Demonstrated",
  4: "Sustained in practice",
};

export const READINESS_BANDS = [
  "building_baseline",
  "one_focus_area",
  "early_reps",
  "solid_ground",
  "sustained_in_practice",
] as const;

export type ReadinessBand = (typeof READINESS_BANDS)[number];

export const MEMBER_READINESS_BAND_LABELS: Record<ReadinessBand, string> = {
  building_baseline: "Building Baseline",
  one_focus_area: "One Focus Area",
  early_reps: "Early Reps",
  solid_ground: "Solid Ground",
  sustained_in_practice: "Sustained in Practice",
};

export const BAND_ELIGIBLE_PURPOSES = [
  "diagnostic",
  "check_in",
  "emergency",
  "free_practice",
] as const;

export type BandEligiblePurpose = (typeof BAND_ELIGIBLE_PURPOSES)[number];

export type SessionPurpose =
  | BandEligiblePurpose
  | "drill"
  | "text_exercise"
  | "priming"
  | "field_log_back";

export type ReadinessSignalObservation = {
  signal: ReadinessSignal;
  level: ReadinessLevel | null;
  nullReason: ReadinessNullReason | null;
  evidenceStrength: EvidenceStrength;
};

export type ReadinessBandResult =
  | {
      status: "derived";
      band: ReadinessBand;
      focusSignal: ReadinessSignal | null;
      observedSignals: number;
    }
  | {
      status: "not_derived";
      reason: "session_not_band_eligible" | "insufficient_evidence";
      observedSignals: number;
    };

function isBandEligiblePurpose(
  purpose: SessionPurpose
): purpose is BandEligiblePurpose {
  return (BAND_ELIGIBLE_PURPOSES as readonly string[]).includes(purpose);
}

function weakestSignal(
  observations: ReadinessSignalObservation[]
): ReadinessSignal | null {
  if (observations.length === 0) return null;
  return [...observations].sort(
    (left, right) => (left.level ?? 5) - (right.level ?? 5)
  )[0]?.signal ?? null;
}

export function deriveReadinessBand(input: {
  purpose: SessionPurpose;
  observations: ReadinessSignalObservation[];
}): ReadinessBandResult {
  const sufficient = input.observations.filter(
    (observation) =>
      observation.level !== null &&
      observation.evidenceStrength === "sufficient"
  );

  if (!isBandEligiblePurpose(input.purpose)) {
    return {
      status: "not_derived",
      reason: "session_not_band_eligible",
      observedSignals: sufficient.length,
    };
  }

  if (sufficient.length < 4) {
    return {
      status: "not_derived",
      reason: "insufficient_evidence",
      observedSignals: sufficient.length,
    };
  }

  const levels = sufficient.map(
    (observation) => observation.level as ReadinessLevel
  );
  const breakdowns = levels.filter((level) => level === 0).length;
  const fragile = levels.filter((level) => level === 1).length;

  if (breakdowns > 0 || fragile >= 2) {
    return {
      status: "derived",
      band: "building_baseline",
      focusSignal: weakestSignal(sufficient),
      observedSignals: sufficient.length,
    };
  }

  if (fragile === 1) {
    return {
      status: "derived",
      band: "one_focus_area",
      focusSignal: weakestSignal(sufficient),
      observedSignals: sufficient.length,
    };
  }

  const minimum = Math.min(...levels);
  const sustained = levels.filter((level) => level === 4).length;
  const demonstratedOrHigher = levels.filter((level) => level >= 3).length;

  if (minimum >= 3 && sustained >= 2) {
    return {
      status: "derived",
      band: "sustained_in_practice",
      focusSignal: null,
      observedSignals: sufficient.length,
    };
  }

  if (minimum >= 2 && demonstratedOrHigher >= 2) {
    return {
      status: "derived",
      band: "solid_ground",
      focusSignal: weakestSignal(sufficient),
      observedSignals: sufficient.length,
    };
  }

  return {
    status: "derived",
    band: "early_reps",
    focusSignal: weakestSignal(sufficient),
    observedSignals: sufficient.length,
  };
}

export type ComparableAssessment = {
  rubricVersion: string;
  scenarioFamily: string;
  modality: "voice" | "text";
  purpose: SessionPurpose;
  pressureLevel: "low" | "moderate" | "high";
};

function rubricMajor(version: string): number | null {
  const match = version.match(/^v?(\d+)(?:\.|$)/i);
  return match ? Number(match[1]) : null;
}

export function assessmentsAreComparable(
  left: ComparableAssessment,
  right: ComparableAssessment
): boolean {
  const leftMajor = rubricMajor(left.rubricVersion);
  const rightMajor = rubricMajor(right.rubricVersion);

  return (
    leftMajor !== null &&
    leftMajor === rightMajor &&
    left.scenarioFamily === right.scenarioFamily &&
    left.modality === right.modality &&
    left.purpose === right.purpose &&
    left.pressureLevel === right.pressureLevel
  );
}

export function comparisonLabel(comparableSessionCount: number):
  | "none"
  | "comparison"
  | "trend" {
  if (comparableSessionCount >= 3) return "trend";
  if (comparableSessionCount >= 2) return "comparison";
  return "none";
}
