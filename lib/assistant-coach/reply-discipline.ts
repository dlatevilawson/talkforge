/**
 * Server-side guard so Coach cannot train like Forge even if the model ignores
 * the prompt. Prompt text is not enough — the founder walk already proved that.
 *
 * Does not change #153 conversion: a single grounded first move still counts.
 * A script dump / "all the above" curriculum does not.
 */
import { isPracticableMoment } from "./confirmation.ts";
import { COACH_STARTERS } from "./coach-copy.ts";

export const UNDERSTANDING_FALLBACK =
  "Who is that conversation with — and what do you need to say or start?";

const STARTER_MESSAGES = new Set(
  COACH_STARTERS.flatMap((starter) =>
    starter.message === null ? [] : [starter.message]
  )
);
const DIRECT_QUESTION_START =
  /^[“"'‘]*(?:who(?:'s| is)?|what(?:'s| is)?|when|where|why|how|which|is|are|do|does|did|can|could|would|will|have|has)\b/i;

const NUMBERED_ITEM = /^\s*(?:\d+[\.)]|text\s*\d+[:.)]|option\s*\d+[:.)])\s+/im;
const LIST_ITEM = /^\s*(?:\d+[\.)]|[-*•]|text\s*\d+[:.)]|option\s*\d+[:.)])\s+/gim;
const ALL_THE_ABOVE =
  /\b(?:all of the above|all the above|all of those|both of those|all of the (?:options|choices))\b/i;
const CURRICULUM_TELL =
  /\b(?:copy(?:\s+and)?\s+tweak|copy these|try (?:all of )?these|here are \d+|seven texts|scripts? you can (?:send|use)|homework|this week(?:'s)? practice)\b/i;

export function isAllTheAbove(text: string): boolean {
  return ALL_THE_ABOVE.test(text.trim());
}

export function isCurriculumText(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (CURRICULUM_TELL.test(t)) return true;
  const items = t.match(LIST_ITEM) ?? [];
  if (items.length >= 3) return true;
  const numbered = t.match(new RegExp(NUMBERED_ITEM.source, "gim")) ?? [];
  return numbered.length >= 3;
}

function clipCurriculumReply(reply: string): string {
  const lines = reply.split(/\n+/);
  const kept: string[] = [];
  for (const line of lines) {
    if (LIST_ITEM.test(line) || NUMBERED_ITEM.test(line)) break;
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (CURRICULUM_TELL.test(trimmed)) break;
    kept.push(trimmed);
    if (kept.join(" ").length >= 280) break;
  }
  const clipped = kept.join(" ").trim();
  if (clipped.length >= 24 && !isCurriculumText(clipped)) {
    return clipped;
  }
  return UNDERSTANDING_FALLBACK;
}

function summaryLooksLikeCurriculum(intervention: unknown): boolean {
  if (!intervention || typeof intervention !== "object") return false;
  const summary = (intervention as { summary?: unknown }).summary;
  return typeof summary === "string" && isCurriculumText(summary);
}

function directStarterQuestion(reply: string, lastUser: string): string {
  if (!STARTER_MESSAGES.has(lastUser)) return reply;

  const questionEnd = reply.indexOf("?");
  if (questionEnd < 0) return reply;

  const throughQuestion = reply.slice(0, questionEnd + 1);
  let questionStart = 0;
  for (const boundary of throughQuestion.matchAll(/[.!]\s+|\n+/g)) {
    questionStart = (boundary.index ?? 0) + boundary[0].length;
  }
  if (questionStart === 0) return reply;

  const question = throughQuestion.slice(questionStart).trim();
  return DIRECT_QUESTION_START.test(question) ? question : reply;
}

export type DisciplinedCoachOutput = {
  reply: string;
  intervention: unknown;
  clippedCurriculum: boolean;
  withheldIntervention: boolean;
};

/**
 * Last line of defense before a turn is stored / can convert.
 */
export function disciplineAssistantCoachOutput(input: {
  reply: string;
  intervention: unknown;
  userMessages: string[];
}): DisciplinedCoachOutput {
  const lastUser = input.userMessages.at(-1)?.trim() ?? "";
  let reply = input.reply.trim();
  let intervention = input.intervention ?? null;
  let clippedCurriculum = false;
  let withheldIntervention = false;

  if (isCurriculumText(reply)) {
    reply = clipCurriculumReply(input.reply);
    clippedCurriculum = true;
    intervention = null;
    withheldIntervention = true;
  }

  reply = directStarterQuestion(reply, lastUser);

  if (isAllTheAbove(lastUser) || summaryLooksLikeCurriculum(intervention)) {
    intervention = null;
    withheldIntervention = true;
  }

  // Multi-select / stacked options are not a speaking moment.
  if (
    intervention != null &&
    lastUser &&
    !isPracticableMoment(lastUser) &&
    isAllTheAbove(lastUser)
  ) {
    intervention = null;
    withheldIntervention = true;
  }

  if (!reply) reply = UNDERSTANDING_FALLBACK;

  return { reply, intervention, clippedCurriculum, withheldIntervention };
}
