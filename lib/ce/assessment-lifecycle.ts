/**
 * App-owned Assessment Mode lifecycle (STEP 2).
 *
 * Structural — not prompt-enforced. The UI/session owner decides when the
 * assessment is complete and locks further model turns.
 *
 * Slot answers (acceptAnswer → slots/currentSlot) are the authoritative structured
 * diagnostic values. Live completion is slot completeness. Answer/question caps
 * are hard-abort only — they must sit above ASSESSMENT_REQUIRED_SLOTS length.
 * AssessmentSnapshot is the client/LP payload from accepted slots.
 *
 * Steps 1–7 FROZEN (ASSESS-MIGRATE-001). Step 8 removes transcript extractors
 * and keyword AssessmentResult client persist. Do not change completion / lock /
 * Forge / currentSlot.
 */

import { isGenericAssessmentSlotAnswer } from "./assessment-generic-answers.ts";
import {
  applyCompatibilityProjection,
  assessGenuineEvidenceCoverage,
  canCompleteWithDiagnosticEvidence,
  collectUserEvidence,
  formatDiagnosisForProfile,
  synthesizeDiagnosis,
  type AssessmentAnswerSource,
  type AssessmentDiagnosis,
} from "./assessment-synthesis.ts";

export type { AssessmentAnswerSource, AssessmentDiagnosis };
export {
  applyCompatibilityProjection,
  canCompleteWithDiagnosticEvidence,
  collectUserEvidence,
  formatDiagnosisForProfile,
  synthesizeDiagnosis,
};

export type AssessmentStatus = "idle" | "active" | "complete" | "cancelled";

export type AssessmentResult = {
  primaryGoal: string | null;
  difficultSituations: string | null;
  communicationPatterns: string | null;
  realWorldContext: string | null;
  practiceCapacity: string | null;
  desiredCommunicationIdentity: string | null;
};

export type AssessmentCategory = keyof AssessmentResult;

export const ASSESSMENT_CATEGORIES: AssessmentCategory[] = [
  "primaryGoal",
  "difficultSituations",
  "communicationPatterns",
  "realWorldContext",
  "practiceCapacity",
  "desiredCommunicationIdentity",
];

/**
 * Legacy soft thresholds — retained on isAssessmentStructurallyComplete only.
 * Live completion no longer uses them (Step 5).
 */
export const ASSESSMENT_MIN_SUBSTANTIVE_ANSWERS = 3;
export const ASSESSMENT_MIN_COVERED_CATEGORIES = 2;
/**
 * Hard-abort safety ceilings (Step 5). Must exceed required slot count (7) so
 * normal slot-complete success can happen before abort.
 */
export const ASSESSMENT_MAX_SUBSTANTIVE_ANSWERS = 12;
export const ASSESSMENT_MAX_FORGE_CONTENT_QUESTIONS = 14;

/** App-owned interview slots — single catalog/order (migration Step 1). */
export type AssessmentSlotId =
  | "skill_to_improve"
  | "where_it_shows_up"
  | "what_goes_wrong"
  | "behavior_to_change"
  | "recent_missed_conversation"
  | "six_week_success"
  | "practice_time";

export type AssessmentSlotStatus =
  | "pending"
  | "asking"
  | "filled"
  | "skipped";

export type AssessmentSlotRecord = {
  id: AssessmentSlotId;
  status: AssessmentSlotStatus;
  /** Accepted answer only — never consent/filler. */
  answer: string | null;
  /**
   * user = real accepted evidence.
   * synthesized = compatibility projection only — never use as evidence.
   */
  source?: AssessmentAnswerSource;
};

export type AssessmentSlotsState = Record<AssessmentSlotId, AssessmentSlotRecord>;

export const ASSESSMENT_SLOT_ORDER: readonly AssessmentSlotId[] = [
  "skill_to_improve",
  "where_it_shows_up",
  "what_goes_wrong",
  "behavior_to_change",
  "recent_missed_conversation",
  "six_week_success",
  "practice_time",
] as const;

/** Required for isAssessmentSlotsComplete — same catalog during Step 1. */
export const ASSESSMENT_REQUIRED_SLOTS: readonly AssessmentSlotId[] =
  ASSESSMENT_SLOT_ORDER;

export type AssessmentLifecycleState = {
  assessmentMode: boolean;
  assessmentStatus: AssessmentStatus;
  consented: boolean;
  substantiveUserAnswers: number;
  forgeContentQuestionsAsked: number;
  covered: Record<AssessmentCategory, boolean>;
  result: AssessmentResult;
  /** Accepted slot answers — authoritative for AssessmentSnapshot (Step 6). */
  slots: AssessmentSlotsState;
  /** Slot currently being asked; null until interview wiring (Step 3). */
  currentSlot: AssessmentSlotId | null;
  /** True once the app has decided to close and requested the final line. */
  finalResponseRequested: boolean;
  /** True after the final closing response has finished. */
  finalResponseDelivered: boolean;
  /** After complete/cancel — no further mid-assessment response.create. */
  responsesLocked: boolean;
};

export type AcceptAnswerReason =
  | "not_active"
  | "not_consented"
  | "no_current_slot"
  | "consent_only"
  | "not_substantive"
  | "not_sufficient"
  | "confusion"
  | "empty";

export type AcceptAnswerResult =
  | {
      ok: true;
      state: AssessmentLifecycleState;
      slotId: AssessmentSlotId;
      answer: string;
    }
  | {
      ok: false;
      state: AssessmentLifecycleState;
      slotId: AssessmentSlotId | null;
      reason: AcceptAnswerReason;
    };

/** Client results payload from accepted slots (Step 6). */
export const ASSESSMENT_SNAPSHOT_STORAGE_KEY =
  "talkforge.assessmentSnapshot.v1";

/** Member-facing labels for results — keyed by slot id, not legacy categories. */
export const ASSESSMENT_SLOT_LABELS: Record<AssessmentSlotId, string> = {
  skill_to_improve: "What to improve",
  where_it_shows_up: "Where it shows up",
  what_goes_wrong: "What goes wrong",
  behavior_to_change: "Behavior to change",
  recent_missed_conversation: "Recent missed conversation",
  six_week_success: "Six-week success",
  practice_time: "Practice time",
};

export type AssessmentSnapshot = {
  version: 1;
  /** Filled slots — user answers and/or compatibility projections. */
  answers: Partial<Record<AssessmentSlotId, string>>;
  filledSlotIds: AssessmentSlotId[];
  /**
   * Marks which answers are real user evidence vs synthesized compatibility.
   * Missing keys default to "user" for backward compatibility.
   */
  answerSources?: Partial<Record<AssessmentSlotId, AssessmentAnswerSource>>;
  /** Diagnostic synthesis for results / LP (from user evidence only). */
  diagnosis?: AssessmentDiagnosis;
  consented: boolean;
  /** True when required slots were filled at persist time (successful close). */
  sufficient: boolean;
  practiceSessionId: string | null;
  completedAt: string;
};

export type AssessmentLifecycleEvent =
  | { type: "START" }
  | { type: "CONSENT_GIVEN" }
  | { type: "CONSENT_DECLINED" }
  | { type: "USER_UTTERANCE"; text: string }
  | { type: "FORGE_CONTENT_QUESTION_ASKED" }
  /** Forge improvised an end-of-assessment line — app must terminalize. */
  | { type: "FORGE_SOFT_CLOSE"; text: string }
  | { type: "BEGIN_CLOSING" }
  | { type: "FINAL_RESPONSE_DONE" }
  | { type: "CANCEL"; reason?: string };

export type AssessmentLifecycleEffect =
  | { type: "NONE" }
  | { type: "REQUEST_FINAL_RESPONSE" }
  /** Forge already spoke a closing — do not create another; finalize on done. */
  | { type: "ADOPT_IN_FLIGHT_CLOSING" }
  | { type: "NAVIGATE_RESULTS" }
  | { type: "EXIT_TO_COACH" };

function emptyResult(): AssessmentResult {
  return {
    primaryGoal: null,
    difficultSituations: null,
    communicationPatterns: null,
    realWorldContext: null,
    practiceCapacity: null,
    desiredCommunicationIdentity: null,
  };
}

function emptyCovered(): Record<AssessmentCategory, boolean> {
  return {
    primaryGoal: false,
    difficultSituations: false,
    communicationPatterns: false,
    realWorldContext: false,
    practiceCapacity: false,
    desiredCommunicationIdentity: false,
  };
}

function emptySlots(): AssessmentSlotsState {
  const slots = {} as AssessmentSlotsState;
  for (const id of ASSESSMENT_SLOT_ORDER) {
    slots[id] = { id, status: "pending", answer: null };
  }
  return slots;
}

function cloneSlots(slots: AssessmentSlotsState): AssessmentSlotsState {
  const next = {} as AssessmentSlotsState;
  for (const id of ASSESSMENT_SLOT_ORDER) {
    next[id] = { ...slots[id] };
  }
  return next;
}

export function createIdleAssessmentState(): AssessmentLifecycleState {
  return {
    assessmentMode: false,
    assessmentStatus: "idle",
    consented: false,
    substantiveUserAnswers: 0,
    forgeContentQuestionsAsked: 0,
    covered: emptyCovered(),
    result: emptyResult(),
    slots: emptySlots(),
    currentSlot: null,
    finalResponseRequested: false,
    finalResponseDelivered: false,
    responsesLocked: false,
  };
}

export function startAssessmentLifecycle(): AssessmentLifecycleState {
  return {
    ...createIdleAssessmentState(),
    assessmentMode: true,
    assessmentStatus: "active",
  };
}

/** Explicit user exit — not ordinary uncertainty. */
export function isExplicitAssessmentExit(text: string): boolean {
  const t = text
    .trim()
    .toLowerCase()
    .replace(/[\u2018\u2019\u201b\u2032]/g, "'");
  if (!t) return false;
  const signals = [
    "i don't want to do this",
    "i dont want to do this",
    "stop the assessment",
    "cancel the assessment",
    "cancel assessment",
    "skip the assessment",
    "skip assessment",
    "i'd rather just practice",
    "id rather just practice",
    "just let me practice",
    "i want to talk to forge instead",
    "get me out of this",
    "end the assessment",
    "i don't want to continue",
    "i dont want to continue",
  ];
  return signals.some((s) => t.includes(s));
}

export function isConsentAffirmative(text: string): boolean {
  const t = text
    .trim()
    .toLowerCase()
    .replace(/[\u2018\u2019\u201b\u2032]/g, "'");
  if (!t) return false;
  if (
    /^(yes|yeah|yep|yup|sure|ok|okay|go ahead|let'?s go|absolutely|of course)\b/.test(
      t
    )
  ) {
    return true;
  }
  // Longer confirmations that are still only consent, not diagnostic content.
  return /^(yeah|yes|yep|sure|ok|okay)[,.]?\s+(sure|okay|ok)?[,.]?\s*(let'?s\s+(do|go|start)|i'?m\s+ready|go\s+ahead)\b/.test(
    t
  );
}

export function isConsentDecline(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (!t) return false;
  return /^(no|nope|not now|maybe later|i'?d rather not)\b/.test(t);
}

/** Consent / filler — must never become primaryGoal or other result fields. */
export function isConsentOnlyUtterance(text: string): boolean {
  const t = text
    .trim()
    .toLowerCase()
    .replace(/[\u2018\u2019\u201b\u2032]/g, "'")
    .replace(/[^\w\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!t) return true;
  if (isConsentAffirmative(text) && t.split(/\s+/).length <= 8) {
    // "yeah sure let's do it/this" has no diagnostic signal.
    if (
      !/(speak|meeting|work|freeze|rush|practice|minute|presentation|talk|conversation|small talk)/.test(
        t
      )
    ) {
      return true;
    }
  }
  return /^(yeah|yes|yep|sure|ok|okay|alright|all right)(,| )? ?(sure|okay|ok)? ?(let'?s do (it|this|that))?\.?$/.test(
    t
  );
}

function looksSubstantive(text: string): boolean {
  const t = text.trim();
  if (t.length < 12) return false;
  if (isConsentOnlyUtterance(t)) return false;
  // One-word / tiny answers don't advance coverage.
  return t.split(/\s+/).length >= 3;
}

/**
 * Process-confusion gate for acceptAnswer (shadow path).
 * Kept local so Node unit tests can load this module without path aliases.
 * Signal set mirrors lib/system1/assessment.looksLikeProcessConfusion.
 */
function looksLikeAssessmentConfusion(text: string): boolean {
  const t = text
    .trim()
    .toLowerCase()
    .replace(/[\u2018\u2019\u201b\u2032]/g, "'");
  if (!t) return false;
  const signals = [
    "why are you asking",
    "why are we",
    "what is this for",
    "what's this for",
    "whats this for",
    "don't understand why",
    "do not understand why",
    "dont understand why",
    "not sure what this",
    "not sure why",
    "what are we doing",
    "why these questions",
    "what is the point",
    "what's the point",
    "i don't get why",
    "i dont get why",
    "confused about this",
    "don't see the point",
    "dont see the point",
    "skip this",
    "can we just practice",
    "rather just practice",
  ];
  return signals.some((s) => t.includes(s));
}

/** Values safe to show on the assessment results placeholder. */
export function isUsableAssessmentResultValue(text: string | null): boolean {
  if (!text || !text.trim()) return false;
  if (isConsentOnlyUtterance(text)) return false;
  if (text.trim().split(/\s+/).length < 3) return false;
  return true;
}

function coveredCount(state: AssessmentLifecycleState): number {
  return ASSESSMENT_CATEGORIES.filter((c) => state.covered[c]).length;
}

/**
 * Legacy completion predicate — kept temporarily (Step 5).
 * Live reducer no longer calls this.
 */
export function isAssessmentStructurallyComplete(
  state: AssessmentLifecycleState
): boolean {
  if (state.assessmentStatus !== "active" || !state.consented) return false;
  if (state.substantiveUserAnswers >= ASSESSMENT_MAX_SUBSTANTIVE_ANSWERS) {
    return true;
  }
  if (
    state.forgeContentQuestionsAsked >= ASSESSMENT_MAX_FORGE_CONTENT_QUESTIONS
  ) {
    return true;
  }
  return (
    state.substantiveUserAnswers >= ASSESSMENT_MIN_SUBSTANTIVE_ANSWERS &&
    coveredCount(state) >= ASSESSMENT_MIN_COVERED_CATEGORIES
  );
}

/** Live completion authority (Step 5): consented + every required slot filled. */
export function isAssessmentSlotsComplete(
  state: AssessmentLifecycleState
): boolean {
  if (!state.consented) return false;
  for (const id of ASSESSMENT_REQUIRED_SLOTS) {
    const slot = state.slots[id];
    if (!slot || slot.status !== "filled") return false;
  }
  return true;
}

/**
 * Hard-abort safety only — not successful completion.
 * Caps fire only when required slots are still incomplete.
 */
export function isAssessmentHardAbort(state: AssessmentLifecycleState): boolean {
  if (state.assessmentStatus !== "active" || !state.consented) return false;
  if (isAssessmentSlotsComplete(state)) return false;
  return (
    state.substantiveUserAnswers >= ASSESSMENT_MAX_SUBSTANTIVE_ANSWERS ||
    state.forgeContentQuestionsAsked >= ASSESSMENT_MAX_FORGE_CONTENT_QUESTIONS
  );
}

/**
 * When mechanism evidence is clear enough, steer currentSlot toward remaining
 * completion gaps (outcome → practice) so the app can close.
 * Prevents endless micro-probing on earlier slots while practice_time stays empty.
 * App owns slot selection; Forge owns wording for the observation target.
 */
export function maybeAdvanceTowardClosingGaps(
  state: AssessmentLifecycleState
): AssessmentLifecycleState {
  if (
    !state.assessmentMode ||
    state.assessmentStatus !== "active" ||
    !state.consented ||
    state.responsesLocked
  ) {
    return state;
  }

  const practiceStatus = state.slots.practice_time?.status;
  const outcomeStatus = state.slots.six_week_success?.status;
  if (practiceStatus === "filled" && outcomeStatus === "filled") {
    return state;
  }

  const evidence = collectUserEvidence(state.slots);
  const coverage = assessGenuineEvidenceCoverage(evidence);

  const mechanismClearEnough =
    coverage.diagnosticConfidence === "supported" ||
    (coverage.bottleneck &&
      coverage.pattern &&
      (coverage.discriminatingEvidenceCount >= 1 ||
        coverage.path2ObservationCount >= 1 ||
        state.substantiveUserAnswers >= 4));

  if (!mechanismClearEnough) return state;

  let target: AssessmentSlotId | null = null;
  if (practiceStatus !== "filled") {
    if (outcomeStatus !== "filled" && !coverage.outcome) {
      target = "six_week_success";
    } else {
      target = "practice_time";
    }
  } else if (outcomeStatus !== "filled" && !coverage.outcome) {
    target = "six_week_success";
  }

  if (!target) return state;
  if (
    state.currentSlot === target &&
    state.slots[target]?.status === "asking"
  ) {
    return state;
  }
  return markSlotAsAsking(state, target);
}

function resolveAfterAssessmentProgress(
  state: AssessmentLifecycleState
): { state: AssessmentLifecycleState; effect: AssessmentLifecycleEffect } {
  // Option A: when genuine user evidence is sufficient, project missing
  // compatibility fields (synthesized), then use existing 7-slot completion.
  let next = maybeAdvanceTowardClosingGaps(state);
  if (canCompleteWithDiagnosticEvidence(next)) {
    next = applyCompatibilityProjection(next);
  }
  if (isAssessmentSlotsComplete(next)) {
    return reduceAssessmentLifecycle(next, { type: "BEGIN_CLOSING" });
  }
  if (isAssessmentHardAbort(next)) {
    return reduceAssessmentLifecycle(next, {
      type: "CANCEL",
      reason: "safety_cap",
    });
  }
  return { state: next, effect: { type: "NONE" } };
}

/**
 * Slot Forge should ask on the next mid-turn.
 * Returns ONLY lifecycle currentSlot — never selects via nextSlot fallback.
 */
export function resolveAssessmentTurnSlot(
  state: AssessmentLifecycleState
): AssessmentSlotId | null {
  return state.currentSlot;
}

/**
 * After consent, explicitly establish currentSlot (no implicit Forge fallback).
 * Uses nextSlot only here — not in resolveAssessmentTurnSlot / turn construction.
 */
function establishCurrentSlotAfterConsent(
  state: AssessmentLifecycleState
): AssessmentLifecycleState {
  if (!state.consented || state.assessmentStatus !== "active") return state;

  if (state.currentSlot) {
    const current = state.slots[state.currentSlot];
    if (
      current &&
      (current.status === "pending" || current.status === "asking")
    ) {
      return markSlotAsAsking(state, state.currentSlot);
    }
  }

  const slot = nextSlot({ ...state, currentSlot: null });
  if (!slot) return state;
  return markSlotAsAsking(state, slot);
}

/** Next eligible interview slot — pure; does not mutate state. */
export function nextSlot(
  state: AssessmentLifecycleState
): AssessmentSlotId | null {
  if (!state.assessmentMode) return null;
  if (state.assessmentStatus !== "active") return null;
  if (!state.consented) return null;

  if (state.currentSlot) {
    const current = state.slots[state.currentSlot];
    if (
      current &&
      (current.status === "pending" || current.status === "asking")
    ) {
      return state.currentSlot;
    }
  }

  for (const id of ASSESSMENT_SLOT_ORDER) {
    const slot = state.slots[id];
    if (slot && (slot.status === "pending" || slot.status === "asking")) {
      return id;
    }
  }
  return null;
}

/**
 * Pure slot answer intake (shadow path).
 * Does not write result/covered and does not establish consent.
 */
export function acceptAnswer(
  state: AssessmentLifecycleState,
  text: string,
  opts?: { slotId?: AssessmentSlotId }
): AcceptAnswerResult {
  const reject = (
    reason: AcceptAnswerReason,
    slotId: AssessmentSlotId | null = null
  ): AcceptAnswerResult => ({
    ok: false,
    state,
    slotId,
    reason,
  });

  if (!text.trim()) {
    return reject("empty", opts?.slotId ?? state.currentSlot);
  }

  if (
    !state.assessmentMode ||
    state.assessmentStatus !== "active" ||
    state.responsesLocked
  ) {
    return reject("not_active", opts?.slotId ?? state.currentSlot);
  }

  if (!state.consented) {
    return reject("not_consented", opts?.slotId ?? state.currentSlot);
  }

  const targetSlotId =
    opts?.slotId ?? state.currentSlot ?? nextSlot(state);
  if (!targetSlotId || !state.slots[targetSlotId]) {
    return reject("no_current_slot", null);
  }

  if (isConsentOnlyUtterance(text)) {
    return reject("consent_only", targetSlotId);
  }

  if (looksLikeAssessmentConfusion(text)) {
    return reject("confusion", targetSlotId);
  }

  if (!looksSubstantive(text)) {
    return reject("not_substantive", targetSlotId);
  }

  // Generic-but-long answers must not fill/advance — keep currentSlot for one
  // concrete follow-up (first-user assessment quality).
  if (isGenericAssessmentSlotAnswer(targetSlotId, text)) {
    return reject("not_sufficient", targetSlotId);
  }

  const answer = text.trim();
  const slots = cloneSlots(state.slots);
  slots[targetSlotId] = {
    id: targetSlotId,
    status: "filled",
    answer,
    source: "user",
  };

  const filledState: AssessmentLifecycleState = {
    ...state,
    slots,
    currentSlot: targetSlotId,
  };
  // Prefer next pending/asking after fill; current filled slot is skipped.
  const advanced: AssessmentLifecycleState = {
    ...filledState,
    currentSlot: nextSlot({ ...filledState, currentSlot: null }),
  };

  return {
    ok: true,
    state: advanced,
    slotId: targetSlotId,
    answer,
  };
}

/** Mark a slot as currently being asked — pure; unused by reducer in Step 1. */
export function markSlotAsAsking(
  state: AssessmentLifecycleState,
  slotId: AssessmentSlotId
): AssessmentLifecycleState {
  if (!state.slots[slotId]) return state;
  const slots = cloneSlots(state.slots);
  slots[slotId] = {
    ...slots[slotId],
    status: "asking",
  };
  return {
    ...state,
    slots,
    currentSlot: slotId,
  };
}

/**
 * Accept slot answers on USER_UTTERANCE. Merges only slots/currentSlot.
 * Never writes legacy result/covered and never invents LP fields.
 */
function observeSlots(
  authoritative: AssessmentLifecycleState,
  text: string
): AssessmentLifecycleState {
  const slotId = nextSlot(authoritative);
  if (!slotId) return authoritative;

  const accepted = acceptAnswer(authoritative, text, { slotId });
  if (!accepted.ok) return authoritative;

  return {
    ...authoritative,
    slots: accepted.state.slots,
    currentSlot: accepted.state.currentSlot,
  };
}

export function reduceAssessmentLifecycle(
  state: AssessmentLifecycleState,
  event: AssessmentLifecycleEvent
): { state: AssessmentLifecycleState; effect: AssessmentLifecycleEffect } {
  switch (event.type) {
    case "START": {
      return { state: startAssessmentLifecycle(), effect: { type: "NONE" } };
    }
    case "CONSENT_GIVEN": {
      if (state.assessmentStatus !== "active") {
        return { state, effect: { type: "NONE" } };
      }
      return {
        state: establishCurrentSlotAfterConsent({
          ...state,
          consented: true,
        }),
        effect: { type: "NONE" },
      };
    }
    case "CONSENT_DECLINED":
    case "CANCEL": {
      if (!state.assessmentMode) return { state, effect: { type: "NONE" } };
      return {
        state: {
          ...state,
          assessmentStatus: "cancelled",
          responsesLocked: true,
          finalResponseRequested: false,
        },
        effect: { type: "EXIT_TO_COACH" },
      };
    }
    case "USER_UTTERANCE": {
      if (
        !state.assessmentMode ||
        state.assessmentStatus !== "active" ||
        state.responsesLocked
      ) {
        return { state, effect: { type: "NONE" } };
      }

      const text = event.text.trim();
      if (!text) return { state, effect: { type: "NONE" } };

      if (isExplicitAssessmentExit(text)) {
        return reduceAssessmentLifecycle(state, { type: "CANCEL" });
      }

      if (!state.consented) {
        if (isConsentDecline(text)) {
          return reduceAssessmentLifecycle(state, { type: "CONSENT_DECLINED" });
        }
        if (isConsentOnlyUtterance(text) || isConsentAffirmative(text)) {
          // Consent only — never write into assessmentResult fields.
          // Explicitly establish currentSlot for Forge (no resolve fallback).
          return {
            state: establishCurrentSlotAfterConsent({
              ...state,
              consented: true,
            }),
            effect: { type: "NONE" },
          };
        }
        if (looksSubstantive(text)) {
          // Substantive first answer also implies consent to continue.
          const consented = establishCurrentSlotAfterConsent({
            ...state,
            consented: true,
            substantiveUserAnswers: state.substantiveUserAnswers + 1,
          });
          const next = observeSlots(consented, text);
          return resolveAfterAssessmentProgress(next);
        }
        return { state, effect: { type: "NONE" } };
      }

      if (!looksSubstantive(text)) {
        return { state, effect: { type: "NONE" } };
      }

      const progressed = {
        ...state,
        substantiveUserAnswers: state.substantiveUserAnswers + 1,
      };
      const next = observeSlots(progressed, text);
      return resolveAfterAssessmentProgress(next);
    }
    case "FORGE_CONTENT_QUESTION_ASKED": {
      if (
        !state.assessmentMode ||
        state.assessmentStatus !== "active" ||
        state.responsesLocked
      ) {
        return { state, effect: { type: "NONE" } };
      }
      // Telemetry / hard-abort input only — does not trigger successful close.
      const next = {
        ...state,
        forgeContentQuestionsAsked: state.forgeContentQuestionsAsked + 1,
      };
      if (isAssessmentHardAbort(next)) {
        return reduceAssessmentLifecycle(next, {
          type: "CANCEL",
          reason: "safety_cap",
        });
      }
      return { state: next, effect: { type: "NONE" } };
    }
    case "FORGE_SOFT_CLOSE": {
      if (
        !state.assessmentMode ||
        state.assessmentStatus === "cancelled" ||
        state.finalResponseDelivered
      ) {
        return { state, effect: { type: "NONE" } };
      }
      if (
        state.assessmentStatus === "complete" &&
        state.finalResponseRequested
      ) {
        // Already closing — treat this as the in-flight final line.
        return { state, effect: { type: "ADOPT_IN_FLIGHT_CLOSING" } };
      }
      return {
        state: {
          ...state,
          assessmentStatus: "complete",
          finalResponseRequested: true,
          responsesLocked: true,
        },
        effect: { type: "ADOPT_IN_FLIGHT_CLOSING" },
      };
    }
    case "BEGIN_CLOSING": {
      if (!state.assessmentMode) return { state, effect: { type: "NONE" } };
      if (state.finalResponseRequested || state.assessmentStatus === "complete") {
        return { state, effect: { type: "NONE" } };
      }
      return {
        state: {
          ...state,
          assessmentStatus: "complete",
          finalResponseRequested: true,
          responsesLocked: true,
        },
        effect: { type: "REQUEST_FINAL_RESPONSE" },
      };
    }
    case "FINAL_RESPONSE_DONE": {
      if (state.assessmentStatus !== "complete") {
        return { state, effect: { type: "NONE" } };
      }
      if (state.finalResponseDelivered) {
        return { state, effect: { type: "NONE" } };
      }
      return {
        state: {
          ...state,
          responsesLocked: true,
          finalResponseDelivered: true,
        },
        effect: { type: "NAVIGATE_RESULTS" },
      };
    }
    default:
      return { state, effect: { type: "NONE" } };
  }
}

/** Guard used by mid-assessment response creators — structural lock. */
export function canRequestAssessmentModelResponse(
  state: AssessmentLifecycleState
): boolean {
  if (!state.assessmentMode) return true;
  if (state.assessmentStatus === "cancelled") return false;
  if (state.responsesLocked) return false;
  if (state.assessmentStatus === "complete") return false;
  return state.assessmentStatus === "active";
}

/** Closing speech is the one privileged create after structural completion. */
export function canRequestAssessmentClosingResponse(
  state: AssessmentLifecycleState
): boolean {
  return (
    state.assessmentMode &&
    state.assessmentStatus === "complete" &&
    state.finalResponseRequested &&
    !state.finalResponseDelivered
  );
}

export function forgeTextLooksLikeContentQuestion(text: string): boolean {
  const t = text.trim();
  if (!t || !t.includes("?")) return false;
  // Closing / acknowledgments must never count.
  if (looksLikeForgeAssessmentSoftClose(t)) return false;
  if (/^(got it|makes sense|okay|alright|ok)\b/i.test(t) && !/\?/.test(t.slice(8))) {
    return false;
  }
  return true;
}

/**
 * Forge ended the interview in prose without the app requesting closing.
 * The app must treat this as terminal — never leave the UI on "Your turn".
 */
export function looksLikeForgeAssessmentSoftClose(text: string): boolean {
  const t = text
    .trim()
    .toLowerCase()
    .replace(/[\u2018\u2019\u201b\u2032]/g, "'")
    .replace(/[\u2013\u2014]/g, "-");
  if (!t) return false;
  const signals = [
    "that's all i need",
    "thats all i need",
    "i've got a good picture",
    "ive got a good picture",
    "i have what i need",
    "i've got what i need",
    "ive got what i need",
    "that's enough for now",
    "thats enough for now",
    "we can pick this up later",
    "let me put this together",
    "thanks-that's all",
    "thanks - that's all",
    "thanks that's all",
    "that's all for now",
    "thats all for now",
  ];
  return signals.some((s) => t.includes(s));
}

/**
 * Build the Step 6 client snapshot from accepted slots only.
 * Does not read result/covered or invent answers for unfilled slots.
 */
export function buildAssessmentSnapshot(
  state: AssessmentLifecycleState,
  meta?: {
    sufficient?: boolean;
    practiceSessionId?: string | null;
    completedAt?: string;
  }
): AssessmentSnapshot {
  const answers: Partial<Record<AssessmentSlotId, string>> = {};
  const answerSources: Partial<Record<AssessmentSlotId, AssessmentAnswerSource>> =
    {};
  const filledSlotIds: AssessmentSlotId[] = [];

  for (const id of ASSESSMENT_SLOT_ORDER) {
    const slot = state.slots[id];
    if (slot?.status !== "filled") continue;
    const answer = slot.answer?.trim() ?? "";
    if (!answer) continue;
    answers[id] = answer;
    answerSources[id] = slot.source === "synthesized" ? "synthesized" : "user";
    filledSlotIds.push(id);
  }

  const userEvidence = collectUserEvidence(state.slots);
  const diagnosis =
    Object.keys(userEvidence).length > 0
      ? synthesizeDiagnosis(userEvidence)
      : undefined;

  return {
    version: 1,
    answers,
    filledSlotIds,
    answerSources,
    diagnosis,
    consented: state.consented,
    sufficient: meta?.sufficient ?? isAssessmentSlotsComplete(state),
    practiceSessionId: meta?.practiceSessionId ?? null,
    completedAt: meta?.completedAt ?? new Date().toISOString(),
  };
}

export function persistAssessmentSnapshotClient(
  snapshot: AssessmentSnapshot
): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      ASSESSMENT_SNAPSHOT_STORAGE_KEY,
      JSON.stringify(snapshot)
    );
  } catch {
    /* ignore quota / private mode */
  }
}

export function readAssessmentSnapshotClient(): AssessmentSnapshot | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(ASSESSMENT_SNAPSHOT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AssessmentSnapshot;
    if (parsed?.version !== 1 || !parsed.answers || !Array.isArray(parsed.filledSlotIds)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Step 7 — AssessmentSnapshot → Living Profile mapping (ASSESS-MIGRATE-001 §D)
// Founder pins: F1=B, F2=A, F3=A. Transcript extract is not authority.
// ---------------------------------------------------------------------------

/** Challenge slots written as separate challenges[] entries (F2=A). */
const ASSESSMENT_LP_CHALLENGE_SLOTS: readonly AssessmentSlotId[] = [
  "where_it_shows_up",
  "what_goes_wrong",
  "behavior_to_change",
  "recent_missed_conversation",
] as const;

export type AssessmentSnapshotLpMapping = {
  ready: boolean;
  profileSource: "assessment" | "incomplete";
  goals: string[] | null;
  challenges: string[] | null;
  /**
   * F1=B: purpose when current purpose empty + six_week_success filled.
   * null → omit purpose_statement from the update payload.
   */
  purposeStatement: string | null;
  /** Incomplete → true (clear). Sufficient F3=A → false (leave untouched). */
  clearPresenceScores: boolean;
  provenanceClaim: string;
};

function snapshotSlotAnswer(
  snapshot: AssessmentSnapshot,
  id: AssessmentSlotId
): string | null {
  const raw = snapshot.answers[id];
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim().replace(/\s+/g, " ");
  return trimmed.length > 0 ? trimmed : null;
}

/** Validate client snapshot shape — reject rather than invent. */
export function parseAssessmentSnapshot(
  raw: unknown
): AssessmentSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.version !== 1) return null;
  if (!o.answers || typeof o.answers !== "object" || Array.isArray(o.answers)) {
    return null;
  }
  if (!Array.isArray(o.filledSlotIds)) return null;
  if (typeof o.sufficient !== "boolean") return null;
  if (typeof o.consented !== "boolean") return null;

  const answers: Partial<Record<AssessmentSlotId, string>> = {};
  const src = o.answers as Record<string, unknown>;
  for (const id of ASSESSMENT_SLOT_ORDER) {
    const v = src[id];
    if (typeof v === "string" && v.trim()) {
      answers[id] = v.trim();
    }
  }

  const filledSlotIds = (o.filledSlotIds as unknown[]).filter(
    (id): id is AssessmentSlotId =>
      typeof id === "string" &&
      (ASSESSMENT_SLOT_ORDER as readonly string[]).includes(id)
  );

  const answerSources: Partial<Record<AssessmentSlotId, AssessmentAnswerSource>> =
    {};
  if (o.answerSources && typeof o.answerSources === "object") {
    const src = o.answerSources as Record<string, unknown>;
    for (const id of ASSESSMENT_SLOT_ORDER) {
      const v = src[id];
      if (v === "user" || v === "synthesized") answerSources[id] = v;
    }
  }

  let diagnosis: AssessmentDiagnosis | undefined;
  if (o.diagnosis && typeof o.diagnosis === "object") {
    diagnosis = o.diagnosis as AssessmentDiagnosis;
  }

  return {
    version: 1,
    answers,
    filledSlotIds,
    answerSources:
      Object.keys(answerSources).length > 0 ? answerSources : undefined,
    diagnosis,
    consented: o.consented,
    sufficient: o.sufficient,
    practiceSessionId:
      typeof o.practiceSessionId === "string" || o.practiceSessionId === null
        ? (o.practiceSessionId as string | null)
        : null,
    completedAt:
      typeof o.completedAt === "string"
        ? o.completedAt
        : new Date().toISOString(),
  };
}

function snapshotRequiredSlotsFilled(snapshot: AssessmentSnapshot): boolean {
  for (const id of ASSESSMENT_REQUIRED_SLOTS) {
    if (!snapshotSlotAnswer(snapshot, id)) return false;
  }
  return true;
}

/** Pure mapper — ASSESS-MIGRATE-001 §D with F1=B, F2=A, F3=A. */
export function mapAssessmentSnapshotToLivingProfile(
  snapshot: AssessmentSnapshot | null,
  current: { purposeStatement: string }
): AssessmentSnapshotLpMapping {
  const incomplete = (): AssessmentSnapshotLpMapping => ({
    ready: false,
    profileSource: "incomplete",
    goals: null,
    challenges: null,
    purposeStatement: null,
    clearPresenceScores: true,
    provenanceClaim:
      "Assessment ended without a sufficient accepted-slot snapshot.",
  });

  if (!snapshot) return incomplete();
  if (!snapshot.sufficient || !snapshotRequiredSlotsFilled(snapshot)) {
    return incomplete();
  }

  // Rebuild user-only evidence — never treat synthesized compatibility as evidence.
  const userEvidence: Partial<Record<AssessmentSlotId, string>> = {};
  for (const id of ASSESSMENT_SLOT_ORDER) {
    const answer = snapshotSlotAnswer(snapshot, id);
    if (!answer) continue;
    const source = snapshot.answerSources?.[id] ?? "user";
    if (source === "synthesized") continue;
    userEvidence[id] = answer;
  }

  const diagnosis =
    snapshot.diagnosis ??
    (Object.keys(userEvidence).length > 0
      ? synthesizeDiagnosis(userEvidence)
      : null);
  if (!diagnosis?.primaryBottleneck) return incomplete();

  const formatted = formatDiagnosisForProfile(diagnosis);
  if (formatted.challenges.length === 0) {
    // Fallback: legacy challenge slots from user evidence only.
    for (const id of ASSESSMENT_LP_CHALLENGE_SLOTS) {
      const answer = userEvidence[id];
      if (answer) formatted.challenges.push(answer);
    }
  }
  if (formatted.challenges.length === 0) return incomplete();

  // F1=B: purpose only when empty; prefer synthesized desired outcome from user evidence.
  const purposeEmpty = !current.purposeStatement.trim();
  const purposeStatement =
    purposeEmpty && formatted.purposeStatement
      ? formatted.purposeStatement
      : null;

  return {
    ready: true,
    profileSource: "assessment",
    goals: formatted.goals,
    challenges: formatted.challenges,
    purposeStatement,
    clearPresenceScores: false,
    provenanceClaim: formatted.provenanceClaim,
  };
}

// ---------------------------------------------------------------------------
// Response gate — owns create/cancel/ignore around the completion boundary
// (especially hands-free races). Reducer above owns when assessment completes.
// ---------------------------------------------------------------------------

export type AssessmentGateFlags = {
  /** Mid-turn create deferred until founder transcript is reduced. */
  awaitingTranscriptForTurn: boolean;
  /** Privileged closing response.create already sent. */
  closingSent: boolean;
  /** Waiting for in-flight response.done before sending closing. */
  pendingClosingAfterDone: boolean;
  /** Results navigation already performed. */
  navigated: boolean;
};

export type AssessmentUserTurnEndDecision =
  | { action: "ignore_terminal" }
  | { action: "request_closing" }
  | { action: "await_transcript" };

export type AssessmentAfterUtteranceDecision =
  | { action: "none" }
  | { action: "request_mid_turn" }
  | { action: "request_closing" };

export type AssessmentVadDecision = "ignore" | "allow";

export type AssessmentResponseDoneDecision =
  | { action: "none" }
  | { action: "send_closing" }
  | { action: "finalize" };

export type AssessmentResponseCreatedDecision =
  | { action: "allow" }
  | { action: "cancel_stray" };

export function isAssessmentTerminal(
  state: AssessmentLifecycleState
): boolean {
  return (
    state.assessmentMode &&
    (state.responsesLocked ||
      state.assessmentStatus === "complete" ||
      state.assessmentStatus === "cancelled")
  );
}

/** Hold-release / hands-free speech_stopped while assessment owns the mic. */
export function decideAssessmentUserTurnEnd(
  state: AssessmentLifecycleState,
  flags: Pick<AssessmentGateFlags, "closingSent">
): AssessmentUserTurnEndDecision {
  if (!state.assessmentMode) {
    return { action: "await_transcript" };
  }
  if (state.assessmentStatus === "cancelled") {
    return { action: "ignore_terminal" };
  }
  if (
    state.assessmentStatus === "complete" ||
    state.responsesLocked ||
    !canRequestAssessmentModelResponse(state)
  ) {
    if (
      canRequestAssessmentClosingResponse(state) &&
      !flags.closingSent
    ) {
      return { action: "request_closing" };
    }
    return { action: "ignore_terminal" };
  }
  // Defer create until USER_UTTERANCE is reduced — prevents half mid-turn
  // then cancel/closing when this utterance structurally completes.
  return { action: "await_transcript" };
}

/**
 * After founder transcript is applied to the lifecycle reducer.
 * `awaitingTranscriptForTurn` means the client deferred create on turn-end.
 */
export function decideAssessmentAfterUserUtterance(
  state: AssessmentLifecycleState,
  effect: AssessmentLifecycleEffect,
  flags: Pick<AssessmentGateFlags, "awaitingTranscriptForTurn" | "closingSent">
): AssessmentAfterUtteranceDecision {
  // Lifecycle effects are executed by the session owner; do not double-fire.
  if (
    effect.type === "EXIT_TO_COACH" ||
    effect.type === "REQUEST_FINAL_RESPONSE" ||
    effect.type === "ADOPT_IN_FLIGHT_CLOSING" ||
    effect.type === "NAVIGATE_RESULTS"
  ) {
    return { action: "none" };
  }

  if (!flags.awaitingTranscriptForTurn) return { action: "none" };

  if (canRequestAssessmentModelResponse(state)) {
    return { action: "request_mid_turn" };
  }
  if (canRequestAssessmentClosingResponse(state) && !flags.closingSent) {
    return { action: "request_closing" };
  }
  return { action: "none" };
}

/** speech_started / speech_stopped after structural completion must not reopen. */
export function decideAssessmentVadEvent(
  state: AssessmentLifecycleState
): AssessmentVadDecision {
  return isAssessmentTerminal(state) ? "ignore" : "allow";
}

/**
 * In-flight handling when REQUEST_FINAL_RESPONSE fires.
 * Prefer waiting for natural done over cancel — avoids half-audio + hitch.
 */
export function decideAssessmentClosingStrategy(input: {
  closingSent: boolean;
  forgeBusy: boolean;
}): "noop" | "send_now" | "queue_after_done" {
  if (input.closingSent) return "noop";
  if (input.forgeBusy) return "queue_after_done";
  return "send_now";
}

export function decideAssessmentResponseDone(
  state: AssessmentLifecycleState,
  flags: Pick<
    AssessmentGateFlags,
    "closingSent" | "pendingClosingAfterDone" | "navigated"
  >
): AssessmentResponseDoneDecision {
  if (!state.assessmentMode || flags.navigated) return { action: "none" };

  if (flags.pendingClosingAfterDone && !flags.closingSent) {
    if (canRequestAssessmentClosingResponse(state)) {
      return { action: "send_closing" };
    }
    return { action: "none" };
  }

  if (
    flags.closingSent &&
    state.assessmentStatus === "complete" &&
    !state.finalResponseDelivered
  ) {
    return { action: "finalize" };
  }

  return { action: "none" };
}

/**
 * Stray response.created while locked (hands-free auto-create race before
 * session.update lands) must be cancelled — except our privileged closing.
 */
export function decideAssessmentResponseCreated(
  state: AssessmentLifecycleState,
  flags: Pick<AssessmentGateFlags, "closingSent" | "pendingClosingAfterDone">
): AssessmentResponseCreatedDecision {
  if (!state.assessmentMode) return { action: "allow" };
  if (!state.responsesLocked && state.assessmentStatus !== "complete") {
    return { action: "allow" };
  }
  // Our closing create sets closingSent synchronously before response.created.
  if (flags.closingSent) return { action: "allow" };
  // Queued closing: absorb/cancel anything else until we send closing.
  if (flags.pendingClosingAfterDone) return { action: "cancel_stray" };
  return { action: "cancel_stray" };
}

/** FINAL_RESPONSE_DONE / navigate must fire once. */
export function decideAssessmentNavigate(
  flags: Pick<AssessmentGateFlags, "navigated">,
  effect: AssessmentLifecycleEffect
): "navigate" | "none" {
  if (flags.navigated) return "none";
  if (effect.type === "NAVIGATE_RESULTS") return "navigate";
  return "none";
}

/**
 * Expected cancel / active-response errors during assessment completion must
 * never be treated as a reason to show hitch UI.
 */
export function assessmentCompletionCancelIsBenign(): true {
  return true;
}

/**
 * Realtime turn_detection for mint / session.update.
 * Assessment always disables auto create_response so the app owns completion.
 */
export function resolveRealtimeTurnDetection(input: {
  mode?: "practice" | "assessment";
  handsFree?: boolean;
}): {
  type: "semantic_vad" | "server_vad";
  create_response: boolean;
  interrupt_response: boolean;
  eagerness?: "low";
  threshold?: number;
  prefix_padding_ms?: number;
  silence_duration_ms?: number;
} {
  if (input.mode === "assessment") {
    if (input.handsFree) {
      return {
        type: "semantic_vad",
        create_response: false,
        interrupt_response: false,
        eagerness: "low",
      };
    }
    return {
      type: "server_vad",
      create_response: false,
      interrupt_response: false,
      threshold: 0.65,
      prefix_padding_ms: 300,
      silence_duration_ms: 1200,
    };
  }
  if (input.handsFree) {
    return {
      type: "semantic_vad",
      create_response: true,
      interrupt_response: false,
      eagerness: "low",
    };
  }
  return {
    type: "server_vad",
    create_response: false,
    interrupt_response: false,
    threshold: 0.65,
    prefix_padding_ms: 300,
    silence_duration_ms: 1200,
  };
}
