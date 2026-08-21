/**
 * Coach confirm → first Forge practice.
 * Confirmed conversation is the session. Forge starts the first rep.
 * Does not redefine Forge Core.
 */
import type { CoachPromptContext } from "../coach/types.ts";

export const AC_PRACTICE_HANDOFF_SOURCE = "ac";

export function isAcPracticeHandoff(input?: {
  handoffSource?: string | null;
  eventTitle?: string | null;
}): boolean {
  return (
    input?.handoffSource === AC_PRACTICE_HANDOFF_SOURCE &&
    Boolean(input?.eventTitle?.trim())
  );
}

/**
 * Overlay so Forge does not re-intake or open from a previous scenario.
 */
export function applyConfirmedPracticeHandoff(
  ctx: CoachPromptContext,
  input: { eventTitle: string; successCriteria?: string }
): CoachPromptContext {
  const eventTitle = input.eventTitle.trim();
  const success = input.successCriteria?.trim() || "";
  const name = ctx.firstName?.trim() || "there";
  const successLine =
    success && success !== eventTitle
      ? ` Success they named: ${success}. Hold it as the practice aim — not a slogan.`
      : "";
  return {
    ...ctx,
    lastScenarioTitle: "",
    lastSessionSummary: "",
    adaptiveInsight: null,
    topicsWorkingOn: [],
    welcomeHint: `Confirmed first practice. Say hello to ${
      name === "there" ? "them" : name
    } in one short breath. The conversation is already known: "${eventTitle}".${successLine} Do not ask what brought them in. Do not ask what they want to work on. Do not open from a previous session. Name this conversation and start the first spoken rep of that scene, then wait.`,
  };
}

export function buildAcPracticeObjectiveLines(input: {
  eventTitle: string;
  successCriteria?: string;
}): {
  eventLine: string;
  successLine: string;
  practiceHint: string;
  openingRule: string;
  evolutionRule: string;
  disciplineRule: string;
} {
  const eventTitle = input.eventTitle.trim();
  const success = input.successCriteria?.trim() || "";
  return {
    eventLine: `CONFIRMED CONVERSATION (Coach handoff): "${eventTitle}". This IS the session. Do not rediscover why they came. Do not hold it lightly. Do not treat it as optional.`,
    successLine: success
      ? `Practice aim they already named: ${success}. Use it to shape the first rep — not as a slogan or checklist recap.`
      : `Practice aim: the first spoken turn of "${eventTitle}".`,
    practiceHint: `Start in the scene of "${eventTitle}" immediately after a one-breath welcome. Invite their opener, or step into the other role and wait. Member airtime first. Do not open as an interviewer of why they are here.`,
    openingRule: [
      "When the session begins, speak first: one short welcome, name the confirmed conversation, then start the first spoken rep of that scene.",
      "Forbidden in the opening: asking what brought them in; asking what they want to work on or practice; asking what feels alive; offering a topic menu; opening from last scenario, last struggle, or pattern insight.",
      "Then wait. They speak the first rep.",
    ].join(" "),
    evolutionRule:
      "Do not mention a previous session in the first breath. Notice patterns only after they have practiced this conversation.",
    disciplineRule: [
      "CONFIRMED PRACTICE DISCIPLINE:",
      "The conversation is already known from Coach.",
      "Your first move is the first spoken rep of that scene — not a clarifying question about why they came.",
      "Do not ask what brought them in. Do not reopen intake.",
    ].join(" "),
  };
}
