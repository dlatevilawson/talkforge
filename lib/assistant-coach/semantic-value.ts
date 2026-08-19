/**
 * Phase 4B.5 — semantic hasExperiencedValue (AC-JOURNEY-001 §E.2, refined).
 * Deterministic. LLM prose does not decide conversion.
 *
 * Semantic boundary (Decision 059 / AC-JOURNEY):
 * - Discovery (goal + friction / insights) may accumulate immediately in the
 *   evidence ledger and draft profile. Discovery alone is NOT experienced value.
 * - hasExperiencedValue = discovery readiness AND at least one validated
 *   actionable Coach intervention grounded in that evidence.
 * - It does NOT mean Living Profile is complete.
 * - It does NOT mean a training plan is ready.
 * - Living Profile remains evidence-driven across future interactions.
 * - Forge readiness is a later, stronger bar after claim.
 * - Anon turn cap remains an independent safety/economic limit (not conversion).
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
  /** Prior user+assistant messages including the just-completed turns. */
  messages: Array<{ role: string; content: string }>;
  /**
   * True when this session has at least one server-validated actionable
   * intervention (structured model field — not reply prose).
   */
  hasActionableIntervention: boolean;
};

/**
 * Discovery readiness — enough grounded understanding of the struggle.
 * Does NOT by itself authorize conversion / hard gate.
 */
export function computeDiscoveryReady(
  input: Pick<
    SemanticValueInput,
    "evidenceLedger" | "profileInsights" | "messages"
  >
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

/**
 * Sticky conversion eligibility — discovery + delivered coaching intervention.
 */
export function computeHasExperiencedValue(
  input: SemanticValueInput
): boolean {
  if (!input.hasActionableIntervention) return false;
  return computeDiscoveryReady(input);
}
