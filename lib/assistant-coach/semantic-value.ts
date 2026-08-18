/**
 * Phase 4B.5 — semantic hasExperiencedValue (AC-JOURNEY-001 §E.2).
 * Deterministic. LLM does not decide conversion.
 *
 * Semantic boundary (Decision 059 / AC-JOURNEY):
 * - hasExperiencedValue = enough understanding that the visitor felt real value
 *   (conversion / hard-gate eligibility for anon).
 * - It does NOT mean Living Profile is complete.
 * - It does NOT mean a training plan is ready.
 * - Living Profile remains evidence-driven across future interactions.
 * - Forge readiness is a later, stronger bar after claim.
 */
import {
  isFactCategory,
  type ProfileEvidenceRecord,
} from "../system1/profile-evidence.ts";
import type { ProfileInsight } from "../system1/profile-intelligence.ts";

const GOAL_OUTCOME = new Set([
  "communication_goal",
  "desired_outcome",
]);

const CONTEXT_FRICTION = new Set([
  "communication_context",
  "communication_friction",
  "lived_example",
  "observed_pattern",
]);

const INSIGHT_KINDS = new Set([
  "root_pattern",
  "focus_area",
  "key_environment",
]);

const INSIGHT_STATUSES = new Set(["supported", "tentative"]);

/** Vague aspiration — short/generic goal-like text without concrete stakes. */
export function isVagueAspirationOnly(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (t.length < 8) return true;
  const vague = [
    "be better",
    "improve",
    "get better",
    "communicate better",
    "be more confident",
    "speak better",
    "do better",
  ];
  return vague.some((v) => t === v || t.startsWith(`${v} `) || t === `${v}.`);
}

function isGroundedFact(e: ProfileEvidenceRecord): boolean {
  if (!isFactCategory(e.category)) return false;
  if (e.confidence === "uncertain") return false;
  if (e.text.trim().length < 8) return false;
  return true;
}

function substantiveUserTurnCount(
  messages: Array<{ role: string; content: string }>
): number {
  return messages.filter(
    (m) =>
      m.role === "user" &&
      typeof m.content === "string" &&
      m.content.trim().length >= 8
  ).length;
}

export type SemanticValueInput = {
  evidenceLedger: ProfileEvidenceRecord[];
  profileInsights: ProfileInsight[];
  /** Prior user+assistant messages including the just-completed user turn. */
  messages: Array<{ role: string; content: string }>;
};

/**
 * Sticky conversion eligibility — semantic only (not turn count).
 */
export function computeHasExperiencedValue(
  input: SemanticValueInput
): boolean {
  const substantiveUserTurns = substantiveUserTurnCount(input.messages);
  if (substantiveUserTurns < 2) return false;

  const facts = input.evidenceLedger.filter(isGroundedFact);
  const goalOrOutcome = facts.filter((e) => GOAL_OUTCOME.has(e.category));
  const contextOrFriction = facts.filter((e) =>
    CONTEXT_FRICTION.has(e.category)
  );

  const onlyVague =
    facts.length > 0 &&
    facts.every(
      (e) =>
        GOAL_OUTCOME.has(e.category) && isVagueAspirationOnly(e.text)
    ) &&
    contextOrFriction.length === 0;

  if (onlyVague) return false;

  const pathV1 =
    goalOrOutcome.some((e) => !isVagueAspirationOnly(e.text)) &&
    contextOrFriction.length >= 1;

  const usefulInsights = input.profileInsights.filter(
    (i) =>
      INSIGHT_KINDS.has(i.kind) && INSIGHT_STATUSES.has(i.status)
  );
  const factCategories = new Set(facts.map((e) => e.category));
  const pathV2 = usefulInsights.length >= 1 && factCategories.size >= 2;

  return pathV1 || pathV2;
}
