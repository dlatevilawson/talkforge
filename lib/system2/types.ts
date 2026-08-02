/**
 * System 2 contracts — BUILD-SYS2 / AUDIT-001 H2 remediation.
 *
 * Thin interfaces only. Engines may be heuristic stubs; callers must go
 * through this surface so MissionPicker / CE cannot own readiness.
 *
 * Binding chain: Living Profile → Readiness → Adaptive Homepage → Coaching
 */
import type { LivingProfile } from "@/lib/system1/types";

export type ReadinessState =
  | "profile_incomplete"
  | "awaiting_readiness"
  | "ready_for_recommendation"
  | "in_coaching";

export type ReadinessResult = {
  state: ReadinessState;
  /** Stable coaching objective — not a menu of missions */
  objective: string | null;
  rationale: string;
  /** False until Living Profile has minimum declared context */
  profileGatePassed: boolean;
  updatedAt: string;
};

export type MissionRecommendation = {
  /** Single recommended next step — never a six-way equal choice */
  title: string;
  href: string;
  continuityLine: string;
  source: "readiness" | "continuity_stub";
};

export type AdaptiveHomeModel = {
  readiness: ReadinessResult;
  recommendation: MissionRecommendation | null;
  /** Analytics surfaces must not replace this as home */
  isPrimaryHome: true;
};

/**
 * Heuristic v0 readiness — enforces Profile gate before mission choice.
 * Not a full Readiness Engine; blocks blank-menu bypass.
 */
export function evaluateReadiness(profile: LivingProfile | null): ReadinessResult {
  const updatedAt = new Date().toISOString();
  if (!profile) {
    return {
      state: "profile_incomplete",
      objective: null,
      rationale:
        "Living Profile is not loaded. Continuity home must not offer a mission menu.",
      profileGatePassed: false,
      updatedAt,
    };
  }

  const hasName =
    Boolean(profile.displayName.trim()) ||
    Boolean(profile.preferredNickname.trim());
  const hasPurpose = Boolean(profile.purposeStatement.trim());
  const hasPrinciple = profile.personalPrinciples.length > 0;
  const hasSeason = profile.seasons.length > 0;

  if (!hasName && !hasPurpose && !hasPrinciple && !hasSeason) {
    return {
      state: "profile_incomplete",
      objective: null,
      rationale:
        "Member has not declared enough Living Profile context for readiness.",
      profileGatePassed: false,
      updatedAt,
    };
  }

  const objective =
    profile.purposeStatement.trim() ||
    profile.seasons.find((s) => s.rank === "primary")?.label ||
    profile.personalPrinciples[0]?.text ||
    null;

  return {
    state: objective ? "ready_for_recommendation" : "awaiting_readiness",
    objective,
    rationale: objective
      ? "Profile context present — recommend one continuity next step."
      : "Profile started; readiness still forming — one gentle entry, no menu.",
    profileGatePassed: true,
    updatedAt,
  };
}

export function buildAdaptiveHome(
  profile: LivingProfile | null
): AdaptiveHomeModel {
  const readiness = evaluateReadiness(profile);
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
          ? `${name}, tell Forge what conversation matters — no topic menu.`
          : "Tell Forge what conversation matters — no topic menu.",
        source: "continuity_stub",
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
    },
    isPrimaryHome: true,
  };
}
