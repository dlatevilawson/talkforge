/**
 * System 1 — Profile evidence ledger (Phase 1 foundation).
 *
 * Evidence is observational substrate for profile intelligence.
 * It is NOT identity. Synthesized claims must never enter this ledger.
 *
 * Conceptual reuse from assessment-synthesis (patterns only — no CE import):
 * - interaction signals ("I don't know" / "I can't remember") are never facts
 * - user-sourced statements only; synthesized outputs stay out
 */

/** How the observation was captured — never "synthesized". */
export type ProfileEvidenceSourceType =
  | "member_statement"
  | "session_observation"
  | "assistant_coach"
  | "assessment_user"
  | "imported";

export type ProfileEvidenceCategory =
  | "communication_goal"
  | "communication_context"
  | "observed_pattern"
  | "communication_friction"
  | "communication_strength"
  | "preference"
  | "practice_capacity"
  | "desired_outcome"
  | "lived_example"
  | "interaction_signal";

/** Uncertainty is first-class — "uncertain" is valid, not a failure. */
export type ProfileEvidenceConfidence =
  | "high"
  | "medium"
  | "low"
  | "uncertain";

export type ProfileEvidenceRecord = {
  id: string;
  userId: string;
  sourceType: ProfileEvidenceSourceType;
  sourceId: string;
  observedAt: string;
  text: string;
  category: ProfileEvidenceCategory;
  confidence: ProfileEvidenceConfidence;
  metadata: Record<string, unknown>;
};

export type AddProfileEvidenceInput = {
  id?: string;
  userId: string;
  sourceType: ProfileEvidenceSourceType;
  sourceId: string;
  observedAt?: string;
  text: string;
  category: ProfileEvidenceCategory;
  confidence?: ProfileEvidenceConfidence;
  metadata?: Record<string, unknown>;
};

const FACT_CATEGORIES: ReadonlySet<ProfileEvidenceCategory> = new Set([
  "communication_goal",
  "communication_context",
  "observed_pattern",
  "communication_friction",
  "communication_strength",
  "preference",
  "practice_capacity",
  "desired_outcome",
  "lived_example",
]);

function newEvidenceId(prefix = "pev"): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function normSignalText(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[\u2018\u2019\u201b\u2032]/g, "'")
    .replace(/[^\w\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Interaction signal — failed recall / don't-know.
 * May be stored as evidence category interaction_signal.
 * Must NEVER become an inferred profile fact or insight claim.
 */
export function looksLikeInteractionSignal(text: string): boolean {
  const t = normSignalText(text);
  if (!t) return true;
  if (
    /^(i )?don'?t know\b/.test(t) ||
    /^(i )?do not know\b/.test(t) ||
    /^(i'?m )?not sure\b/.test(t) ||
    /^no idea\b/.test(t) ||
    /\bi can'?t remember\b/.test(t) ||
    /\bi cannot remember\b/.test(t) ||
    /\bi don'?t remember\b/.test(t) ||
    /\bcan'?t remember\b/.test(t) ||
    /\bnothing comes to mind\b/.test(t) ||
    /\bi'?m blanking\b/.test(t) ||
    /\bi draw a blank\b/.test(t)
  ) {
    return true;
  }
  return false;
}

export function isFactCategory(category: ProfileEvidenceCategory): boolean {
  return FACT_CATEGORIES.has(category);
}

/**
 * Guard: synthesized / derived claims must never enter the evidence ledger.
 */
export function assertEvidenceNotSynthesized(
  input: Pick<AddProfileEvidenceInput, "metadata" | "sourceType">
): void {
  const meta = input.metadata ?? {};
  if (meta.synthesized === true || meta.source === "synthesized") {
    throw new Error(
      "Synthesized claims must never enter the profile evidence ledger."
    );
  }
  if (meta.derivedInsight === true || meta.insightId) {
    throw new Error(
      "Profile insights must not re-enter the evidence ledger as source evidence."
    );
  }
  const st = String(input.sourceType);
  if (st === "synthesized" || st === "derived") {
    throw new Error(
      "Synthesized sourceType is not allowed on profile evidence."
    );
  }
}

/**
 * Build a single evidence record. Interaction-signal text coerced away from fact categories.
 */
export function createProfileEvidence(
  input: AddProfileEvidenceInput
): ProfileEvidenceRecord {
  assertEvidenceNotSynthesized(input);
  const text = input.text.trim();
  if (!text) {
    throw new Error("Profile evidence text must be non-empty.");
  }

  const signal = looksLikeInteractionSignal(text);
  const category =
    signal && isFactCategory(input.category)
      ? "interaction_signal"
      : input.category;
  const confidence: ProfileEvidenceConfidence = signal
    ? "uncertain"
    : (input.confidence ?? "medium");

  return {
    id: input.id ?? newEvidenceId(),
    userId: input.userId,
    sourceType: input.sourceType,
    sourceId: input.sourceId,
    observedAt: input.observedAt ?? new Date().toISOString(),
    text,
    category,
    confidence,
    metadata: { ...(input.metadata ?? {}) },
  };
}

/**
 * Append evidence to a ledger (pure). Dedupes by id. Does not mutate identity fields.
 */
export function addProfileEvidence(
  ledger: readonly ProfileEvidenceRecord[],
  input: AddProfileEvidenceInput
): ProfileEvidenceRecord[] {
  const record = createProfileEvidence(input);
  if (ledger.some((e) => e.id === record.id)) {
    return ledger.map((e) => (e.id === record.id ? record : e));
  }
  return [...ledger, record];
}

/** Evidence usable for deriving insights — excludes interaction signals. */
export function evidenceForInsightDerivation(
  ledger: readonly ProfileEvidenceRecord[]
): ProfileEvidenceRecord[] {
  return ledger.filter((e) => e.category !== "interaction_signal");
}
