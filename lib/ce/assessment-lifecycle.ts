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
export const ASSESSMENT_MIN_SUBSTANTIVE_ANSWERS = 4;
export const ASSESSMENT_MAX_SUBSTANTIVE_ANSWERS = 7;
export const ASSESSMENT_MIN_COVERED_CATEGORIES = 3;
export const ASSESSMENT_MAX_FORGE_CONTENT_QUESTIONS = 6;

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
  | { type: "BEGIN_CLOSING" }
  | { type: "FINAL_RESPONSE_DONE" }
  | { type: "CANCEL"; reason?: string };

export type AssessmentLifecycleEffect =
  | { type: "NONE" }
  | { type: "REQUEST_FINAL_RESPONSE" }
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
  const t = text.trim().toLowerCase();
  if (!t) return false;
  return /^(yes|yeah|yep|sure|ok|okay|go ahead|let'?s go|absolutely|of course)\b/.test(
    t
  );
}

export function isConsentDecline(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (!t) return false;
  return /^(no|nope|not now|maybe later|i'?d rather not)\b/.test(t);
}

function looksSubstantive(text: string): boolean {
  const t = text.trim();
  if (t.length < 12) return false;
  // One-word / tiny answers don't advance coverage.
  return t.split(/\s+/).length >= 3;
}

/** Lightweight category tagging for the structural data contract. */
export function inferAssessmentCategories(text: string): AssessmentCategory[] {
  const t = text.toLowerCase();
  const hits: AssessmentCategory[] = [];
  if (
    /(want|goal|hope|trying to|need to|better at|improve|work on)/.test(t)
  ) {
    hits.push("primaryGoal");
  }
  if (
    /(hard|difficult|freeze|struggle|nervous|anxious|avoid|stuck|choke)/.test(
      t
    )
  ) {
    hits.push("difficultSituations");
  }
  if (
    /(always|tend to|pattern|keep|usually|habit|whenever)/.test(t)
  ) {
    hits.push("communicationPatterns");
  }
  if (
    /(work|meeting|boss|partner|family|school|interview|presentation|team)/.test(
      t
    )
  ) {
    hits.push("realWorldContext");
  }
  if (
    /(minute|hour|day|week|time|practice|schedule|busy|morning|evening)/.test(
      t
    )
  ) {
    hits.push("practiceCapacity");
  }
  if (
    /(want to be|become|sound like|identity|confident|calm|clear|leader)/.test(
      t
    )
  ) {
    hits.push("desiredCommunicationIdentity");
  }
  return hits;
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
  const categories = inferAssessmentCategories(text);
  const covered = { ...state.covered };
  const result = { ...state.result };
  const trimmed = text.trim().slice(0, 240);

  // Always fill the first empty required-ish slots so short-but-useful answers count.
  const order: AssessmentCategory[] =
    categories.length > 0
      ? categories
      : ASSESSMENT_CATEGORIES.filter((c) => !covered[c]).slice(0, 1);

  for (const cat of order) {
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
        if (isConsentAffirmative(text) || looksSubstantive(text)) {
          // Substantive first answer also implies consent to continue.
          const next = {
            ...state,
            consented: true,
            substantiveUserAnswers: looksSubstantive(text)
              ? state.substantiveUserAnswers + 1
              : state.substantiveUserAnswers,
          };
          const withCats = looksSubstantive(text)
            ? applyCategories(next, text)
            : next;
          if (isAssessmentStructurallyComplete(withCats)) {
            return reduceAssessmentLifecycle(withCats, { type: "BEGIN_CLOSING" });
          }
          return { state: withCats, effect: { type: "NONE" } };
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
  if (/i'?ve got a good picture/i.test(t)) return false;
  if (/^(got it|makes sense|okay|alright|ok)\b/i.test(t) && !/\?/.test(t.slice(8))) {
    return false;
  }
  return true;
}

export function persistAssessmentResultClient(
  result: AssessmentResult,
  meta?: { practiceSessionId?: string | null }
): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      ASSESSMENT_RESULT_STORAGE_KEY,
      JSON.stringify({
        ...result,
        practiceSessionId: meta?.practiceSessionId ?? null,
        completedAt: new Date().toISOString(),
      })
    );
  } catch {
    /* ignore quota / private mode */
  }
}

export function readAssessmentResultClient():
  | (AssessmentResult & {
      practiceSessionId?: string | null;
      completedAt?: string;
    })
  | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(ASSESSMENT_RESULT_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AssessmentResult & {
      practiceSessionId?: string | null;
      completedAt?: string;
    };
  } catch {
    return null;
  }
}
