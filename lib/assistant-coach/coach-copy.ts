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

export const COACH_CONFIRM_TITLE = "Here’s what I’ve understood about you so far";

export const COACH_CONFIRM_WORKING_ON = "What you’re working on";

export const COACH_CONFIRM_DIFFICULTY = "Where it gets difficult";

export const COACH_CONFIRM_MOMENT = "The conversation you named";

export const COACH_CONFIRM_FIRST_WORK = "What you’ll practice first";

export const COACH_CONFIRM_EMPTY = "Not captured yet — tap Edit.";

export const COACH_CONFIRM_CONTINUE = "Looks right — Continue";

export const COACH_CONFIRM_EDIT = "Edit";

export const COACH_CONFIRM_LOST =
  "This Coach session couldn’t be found. Start again from Coach.";

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
