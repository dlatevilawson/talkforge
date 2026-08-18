/**
 * User-facing Coach copy for /coach.
 * Keep implementation/decision language out of the product surface.
 */
export const COACH_PRODUCT_NAME = "Coach";

export const COACH_META_TITLE = "Coach";

export const COACH_META_DESCRIPTION =
  "Speak or type with TalkForge Coach — be understood before you create an account.";

export const COACH_OPENING =
  "What’s on your mind today?";

export const COACH_EMPTY_HINT =
  "Speak or type — start wherever you are.";

export const COACH_COMPOSER_PLACEHOLDER =
  "Share what’s on your mind…";

export const COACH_STATE_LISTENING = "Listening…";

export const COACH_STATE_TRANSCRIBING = "Transcribing…";

export const COACH_STATE_THINKING = "Coach is thinking…";

export const COACH_GATE_TITLE = "Keep going with TalkForge";

export const COACH_GATE_COPY =
  "You’ve shared something real. Create an account or sign in to continue.";

export const COACH_BOOT_ERROR =
  "Unable to start Coach right now. Please try again.";

/** Strings / patterns that must never appear in the public /coach UI surface. */
export const COACH_FORBIDDEN_UI_SUBSTRINGS = [
  "Decision 059",
  "4B.",
  "Claim continuity",
  "later slice",
  "ASSISTANT_COACH",
  "hard stop",
  "Assistant Coach",
  "Session active",
  "Session gated",
] as const;
