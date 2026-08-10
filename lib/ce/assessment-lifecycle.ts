/**
 * App-owned Assessment Mode lifecycle (STEP 2).
 *
 * Structural — not prompt-enforced. The UI/session owner decides when the
 * assessment is complete and locks further model turns.
 */

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

/** Soft target ~5 minutes; structural caps keep the interview finite. */
export const ASSESSMENT_MIN_SUBSTANTIVE_ANSWERS = 3;
export const ASSESSMENT_MAX_SUBSTANTIVE_ANSWERS = 5;
export const ASSESSMENT_MIN_COVERED_CATEGORIES = 2;
export const ASSESSMENT_MAX_FORGE_CONTENT_QUESTIONS = 4;

export type AssessmentLifecycleState = {
  assessmentMode: boolean;
  assessmentStatus: AssessmentStatus;
  consented: boolean;
  substantiveUserAnswers: number;
  forgeContentQuestionsAsked: number;
  covered: Record<AssessmentCategory, boolean>;
  result: AssessmentResult;
  /** True once the app has decided to close and requested the final line. */
  finalResponseRequested: boolean;
  /** True after the final closing response has finished. */
  finalResponseDelivered: boolean;
  /** After complete/cancel — no further mid-assessment response.create. */
  responsesLocked: boolean;
};

export const ASSESSMENT_RESULT_STORAGE_KEY =
  "talkforge.assessmentResult.v1";

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

export function createIdleAssessmentState(): AssessmentLifecycleState {
  return {
    assessmentMode: false,
    assessmentStatus: "idle",
    consented: false,
    substantiveUserAnswers: 0,
    forgeContentQuestionsAsked: 0,
    covered: emptyCovered(),
    result: emptyResult(),
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

/** Lightweight category tagging for the structural data contract. */
export function inferAssessmentCategories(text: string): AssessmentCategory[] {
  if (isConsentOnlyUtterance(text)) return [];
  const t = text.toLowerCase();
  const hits: AssessmentCategory[] = [];

  // Skill / goal first (prefer over identity for "want to get better…").
  if (
    /\b(want to get better|get better at|better at|improve|work on|trying to|need to|goal|small talk|small talks|present|speak)\b/.test(
      t
    )
  ) {
    hits.push("primaryGoal");
  }
  if (
    /\b(hard|difficult|freeze|struggle|nervous|anxious|avoid|stuck|choke|lose my (words|point))\b/.test(
      t
    )
  ) {
    hits.push("difficultSituations");
  }
  if (
    /\b(always|tend to|pattern|usually|habit|whenever|rush|ramble|apologiz|trail off|interrupt)\b/.test(
      t
    )
  ) {
    hits.push("communicationPatterns");
  }
  if (
    /\b(work|meeting|meetings|boss|partner|family|school|interview|presentation|presentations|team|exec|leadership)\b/.test(
      t
    )
  ) {
    hits.push("realWorldContext");
  }
  // Word-boundary capacity — do NOT match "everyday" via bare "day".
  if (
    /\b(\d+\s*)?(minutes?|hours?|weeks?)\b/.test(t) ||
    /\b(each day|per day|a day|daily|every day|schedule|practice time|busy mornings?|evenings?)\b/.test(
      t
    ) ||
    /\bpractice\b/.test(t)
  ) {
    hits.push("practiceCapacity");
  }
  if (
    /\b(six weeks|comfortably|able to do|success would|sound like|more direct|hold the floor|finish my point)\b/.test(
      t
    )
  ) {
    hits.push("desiredCommunicationIdentity");
  }
  return hits;
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

function applyCategories(
  state: AssessmentLifecycleState,
  text: string
): AssessmentLifecycleState {
  if (isConsentOnlyUtterance(text)) return state;

  const categories = inferAssessmentCategories(text);
  // Never dump unmatched filler into the first empty slot (that caused
  // "Yeah, sure, let's do it" → primaryGoal).
  if (categories.length === 0) return state;

  const covered = { ...state.covered };
  const result = { ...state.result };
  const trimmed = text.trim().slice(0, 240);

  for (const cat of categories) {
    if (!result[cat]) {
      result[cat] = trimmed;
      covered[cat] = true;
    } else if (!covered[cat]) {
      covered[cat] = true;
    }
  }

  return { ...state, covered, result };
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
        state: { ...state, consented: true },
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
          return {
            state: { ...state, consented: true },
            effect: { type: "NONE" },
          };
        }
        if (looksSubstantive(text)) {
          // Substantive first answer also implies consent to continue.
          const next = applyCategories(
            {
              ...state,
              consented: true,
              substantiveUserAnswers: state.substantiveUserAnswers + 1,
            },
            text
          );
          if (isAssessmentStructurallyComplete(next)) {
            return reduceAssessmentLifecycle(next, { type: "BEGIN_CLOSING" });
          }
          return { state: next, effect: { type: "NONE" } };
        }
        return { state, effect: { type: "NONE" } };
      }

      if (!looksSubstantive(text)) {
        return { state, effect: { type: "NONE" } };
      }

      const next = applyCategories(
        {
          ...state,
          substantiveUserAnswers: state.substantiveUserAnswers + 1,
        },
        text
      );

      if (isAssessmentStructurallyComplete(next)) {
        return reduceAssessmentLifecycle(next, { type: "BEGIN_CLOSING" });
      }
      return { state: next, effect: { type: "NONE" } };
    }
    case "FORGE_CONTENT_QUESTION_ASKED": {
      if (
        !state.assessmentMode ||
        state.assessmentStatus !== "active" ||
        state.responsesLocked
      ) {
        return { state, effect: { type: "NONE" } };
      }
      const next = {
        ...state,
        forgeContentQuestionsAsked: state.forgeContentQuestionsAsked + 1,
      };
      if (isAssessmentStructurallyComplete(next)) {
        return reduceAssessmentLifecycle(next, { type: "BEGIN_CLOSING" });
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

export type StoredAssessmentResult = AssessmentResult & {
  practiceSessionId?: string | null;
  completedAt?: string;
  /** false when member ended early / extraction insufficient */
  sufficient?: boolean;
};

export function persistAssessmentResultClient(
  result: AssessmentResult,
  meta?: { practiceSessionId?: string | null; sufficient?: boolean }
): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      ASSESSMENT_RESULT_STORAGE_KEY,
      JSON.stringify({
        ...result,
        practiceSessionId: meta?.practiceSessionId ?? null,
        sufficient: meta?.sufficient !== false,
        completedAt: new Date().toISOString(),
      } satisfies StoredAssessmentResult)
    );
  } catch {
    /* ignore quota / private mode */
  }
}

export function readAssessmentResultClient(): StoredAssessmentResult | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(ASSESSMENT_RESULT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredAssessmentResult;
  } catch {
    return null;
  }
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
