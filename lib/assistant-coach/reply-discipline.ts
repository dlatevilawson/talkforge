/**
 * Server-side guard so Coach cannot train like Forge even if the model ignores
 * the prompt. Prompt text is not enough — the founder walk already proved that.
 *
 * Assistant Coach diagnoses only. Every intervention is withheld, and only one
 * focused diagnostic question may be stored or shown.
 */
export const UNDERSTANDING_FALLBACK =
  "What feels hardest about handling this conversation?";

const DIRECT_QUESTION_START =
  /^[“"'‘]*(?:who(?:'s| is)?|what(?:'s| is)?|when|where|why|how|which|is|are|do|does|did|can|could|would|will|have|has)\b/i;
const FIRST_PERSON_DIALOGUE =
  /\b(?:I|I['’]m|I['’]d|I['’]ll|my|mine|we|we['’]re|we['’]ll|our|ours)\b/i;
const COACHING_QUESTION =
  /^[“"'‘]*(?:can|could|would|will)\s+you\s+(?:say|tell|try|practice|rehearse|use|start|open)\b/i;

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

function extractDiagnosticQuestion(reply: string): string {
  const questionEnd = reply.indexOf("?");
  if (questionEnd < 0) return UNDERSTANDING_FALLBACK;

  const throughQuestion = reply.slice(0, questionEnd + 1);
  let questionStart = 0;
  for (const boundary of throughQuestion.matchAll(/[.!]\s+|\n+/g)) {
    questionStart = (boundary.index ?? 0) + boundary[0].length;
  }
  const question = throughQuestion.slice(questionStart).trim();
  if (
    !DIRECT_QUESTION_START.test(question) ||
    FIRST_PERSON_DIALOGUE.test(question) ||
    COACHING_QUESTION.test(question)
  ) {
    return UNDERSTANDING_FALLBACK;
  }
  return question;
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
  void input.userMessages;
  return {
    reply: extractDiagnosticQuestion(input.reply.trim()),
    intervention: null,
    clippedCurriculum: isCurriculumText(input.reply),
    withheldIntervention: input.intervention != null,
  };
}
