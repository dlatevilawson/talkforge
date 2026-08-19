/**
 * Structured Coach intervention — conversion signal for hasExperiencedValue.
 *
 * Interventions are Coach deliverables, not Living Profile evidence.
 * They must not enter evidence_ledger. Validated server-side from model JSON;
 * free-form reply prose alone never decides conversion.
 */
import {
  isFactCategory,
  type ProfileEvidenceCategory,
  type ProfileEvidenceRecord,
} from "../system1/profile-evidence.ts";

export const COACH_INTERVENTION_KINDS = [
  "exercise",
  "rehearsal",
  "technique",
  "strategy",
  "wording",
  "pacing",
  "other",
] as const;

export type CoachInterventionKind = (typeof COACH_INTERVENTION_KINDS)[number];

export const COACH_INTERVENTION_SUMMARY_MIN_LENGTH = 24;

export type RawCoachIntervention = {
  kind?: unknown;
  summary?: unknown;
  groundedInCategories?: unknown;
};

export type ValidatedCoachIntervention = {
  kind: CoachInterventionKind;
  summary: string;
  groundedInCategories: ProfileEvidenceCategory[];
  accepted: true;
};

export type RejectedCoachIntervention = {
  accepted: false;
  reason: string;
};

export type CoachInterventionDecision =
  | ValidatedCoachIntervention
  | RejectedCoachIntervention;

const KIND_SET: ReadonlySet<string> = new Set(COACH_INTERVENTION_KINDS);

function isGroundedFact(e: ProfileEvidenceRecord): boolean {
  if (!isFactCategory(e.category)) return false;
  if (e.confidence === "uncertain") return false;
  if (e.text.trim().length < 8) return false;
  return true;
}

/**
 * Accept only structured, evidence-grounded actionable interventions.
 * Reflection / questions / summaries omit this field or fail validation.
 */
export function validateCoachIntervention(
  raw: unknown,
  evidenceLedger: ProfileEvidenceRecord[]
): CoachInterventionDecision {
  if (raw == null) {
    return { accepted: false, reason: "intervention_absent" };
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { accepted: false, reason: "intervention_not_object" };
  }
  const obj = raw as RawCoachIntervention;
  const kind = typeof obj.kind === "string" ? obj.kind.trim() : "";
  const summary = typeof obj.summary === "string" ? obj.summary.trim() : "";

  if (!KIND_SET.has(kind)) {
    return { accepted: false, reason: "invalid_kind" };
  }
  if (summary.length < COACH_INTERVENTION_SUMMARY_MIN_LENGTH) {
    return { accepted: false, reason: "summary_too_short" };
  }
  if (!Array.isArray(obj.groundedInCategories)) {
    return { accepted: false, reason: "grounding_missing" };
  }

  const groundedInCategories: ProfileEvidenceCategory[] = [];
  for (const item of obj.groundedInCategories) {
    if (typeof item !== "string") continue;
    const cat = item.trim();
    if (!isFactCategory(cat as ProfileEvidenceCategory)) continue;
    if (!groundedInCategories.includes(cat as ProfileEvidenceCategory)) {
      groundedInCategories.push(cat as ProfileEvidenceCategory);
    }
  }
  if (groundedInCategories.length < 1) {
    return { accepted: false, reason: "grounding_empty" };
  }

  const ledgerCats = new Set(
    evidenceLedger.filter(isGroundedFact).map((e) => e.category)
  );
  const grounded =
    groundedInCategories.some((c) => ledgerCats.has(c)) || false;
  if (!grounded) {
    return { accepted: false, reason: "grounding_not_in_ledger" };
  }

  return {
    kind: kind as CoachInterventionKind,
    summary,
    groundedInCategories,
    accepted: true,
  };
}

/** Prior turns store acceptance on assistant message modelMeta. */
export function messageHasAcceptedIntervention(
  modelMeta: Record<string, unknown> | null | undefined
): boolean {
  if (!modelMeta || typeof modelMeta !== "object") return false;
  return modelMeta.interventionAccepted === true;
}
