/**
 * User-facing Coach copy for /coach.
 * Keep implementation/decision language out of the product surface.
 */
export const COACH_PRODUCT_NAME = "Coach";

export const COACH_META_TITLE = "Coach";

export const COACH_META_DESCRIPTION =
  "Speak or type with TalkForge Coach — be understood before you create an account.";

export const COACH_OPENING =
  "What conversation are you preparing for?";

type CoachStarterDefinition = {
  id: string;
  label: string;
  message: string | null;
  placeholder: string;
};

export const COACH_STARTERS = [
  {
    id: "interview",
    label: "Interview",
    message: "I’m preparing for an interview.",
    placeholder: "Describe the role or company…",
  },
  {
    id: "salary-negotiation",
    label: "Salary negotiation",
    message: "I’m preparing for a salary negotiation.",
    placeholder: "Who are you negotiating with…",
  },
  {
    id: "difficult-feedback",
    label: "Difficult feedback",
    message: "I’m preparing for a difficult feedback conversation.",
    placeholder: "Who needs the feedback…",
  },
  {
    id: "setting-a-boundary",
    label: "Setting a boundary",
    message: "I’m preparing to set a boundary.",
    placeholder: "Who is the boundary with…",
  },
  {
    id: "something-else",
    label: "Something else",
    message: null,
    placeholder: "Describe the conversation…",
  },
] as const satisfies readonly CoachStarterDefinition[];

export type CoachStarter = (typeof COACH_STARTERS)[number];
export type CoachStarterId = (typeof COACH_STARTERS)[number]["id"];

export function inferCoachStarterId(
  firstUserMessage: string | null | undefined
): CoachStarterId | null {
  const starter = COACH_STARTERS.find(
    (candidate) =>
      candidate.message !== null && candidate.message === firstUserMessage
  );
  return starter?.id ?? null;
}

export function getCoachComposerPlaceholder(
  starterId: CoachStarterId | null
): string {
  return (
    COACH_STARTERS.find((starter) => starter.id === starterId)?.placeholder ??
    COACH_COMPOSER_PLACEHOLDER
  );
}

export const COACH_EMPTY_HINT =
  "Choose a starting point, or speak or type your own.";

export const COACH_COMPOSER_PLACEHOLDER =
  "Name your conversation…";

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

export const COACH_CONFIRM_MISSING =
  "I don’t have the conversation yet — tap Edit to name it.";

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
