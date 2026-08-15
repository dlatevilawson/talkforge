/**
 * Assessment-mode Realtime system + opening / turn / closing instructions.
 *
 * Ownership split (binding):
 * - Forge owns conversational judgment: question selection, acknowledgment,
 *   clarification, teaching, challenge, and pacing — within diagnostic purpose.
 * - The app owns observation + persistence: currentSlot, accept/reject,
 *   completion/lock, synthesis, Living Profile write.
 *
 * Slots, ladder probes, and seed lines are observation targets / soft examples —
 * never sticky spoken scripts that override coach judgment.
 *
 * Deterministic state + safety stay app/prompt-constrained. Conversational
 * behavior returns to Forge.
 *
 * Product hard rule retained: at most one spoken question mark per mid-turn
 * when seeking diagnostic evidence (never double-barreled asks).
 */

import {
  buildForgeSystemPrompt,
} from "../coach/forge-core.ts";
import { LISTEN_FIRST_SYSTEM_INSTRUCTION } from "../coach/philosophy.ts";
import type { AssessmentSlotId } from "./assessment-lifecycle";

/**
 * Opening seed meaning (objectives — Forge phrases in their own words).
 * Must cover: I'm Forge; communication coach; why questions; reduce pressure; will adapt.
 */
export const ASSESSMENT_INTRODUCTION =
  "Hi, I'm Forge, your communication coach. I'm going to ask you a few questions to understand what happens when communication gets difficult for you. There are no right answers — just answer however you can, and I'll adapt the questions as we go.";

/**
 * Soft open-recall probe example (Processing & Retrieval).
 * Compatibility export — not a sticky required speech line.
 */
export const ASSESSMENT_OPENING_LINE =
  "When you're trying to explain something out loud, what usually happens?";

/** Closing seed meaning — synthesize; do not invent. */
export const ASSESSMENT_CLOSING_LINE =
  "I've got a clear enough read on what to train. Let me put this together so you can see it.";

/**
 * Soft seed for true process confusion only (not failed recall).
 * Forge owns wording; do not treat this as mandatory speech.
 */
export const ASSESSMENT_DISENGAGEMENT_CHECK_IN =
  "Sounds like these questions aren’t landing — want me to explain what this is for, or stop here for now?";

/** Internal diagnostic dimensions — not a mandatory four-question script. */
export type DiagnosticGateway =
  | "processing_retrieval"
  | "pressure_tension"
  | "structure_brevity"
  | "audience_adaptation";

export type QuestionDifficulty =
  | "open_recall"
  | "concrete_recall"
  | "recognition"
  | "forced_comparison";

export const QUESTION_DIFFICULTY_LADDER = [
  "open_recall",
  "concrete_recall",
  "recognition",
  "forced_comparison",
] as const satisfies readonly QuestionDifficulty[];

export type GatewayLadderPrompts = {
  id: DiagnosticGateway;
  label: string;
  goal: string;
  open_recall: string;
  concrete_recall: string;
  recognition: string;
  forced_comparison: string;
};

/**
 * Soft probe examples per gateway × difficulty.
 * Difficulty intent is guidance when recall fails; spoken wording is Forge's.
 */
export const ASSESSMENT_GATEWAY_LADDERS: Record<
  DiagnosticGateway,
  GatewayLadderPrompts
> = {
  processing_retrieval: {
    id: "processing_retrieval",
    label: "Processing & Retrieval",
    goal: "Distinguish verbal retrieval/formulation from idea-generation uncertainty.",
    open_recall:
      "When you're trying to explain something out loud, what usually happens?",
    concrete_recall:
      "Think about the last time you had to explain something at work. What happened when you started talking?",
    recognition:
      "Which sounds closer: you know what you want to say but can't find the words, or you're not sure what you want to say yet?",
    forced_comparison:
      "If you could write the answer first, would explaining it usually become easier — yes or no?",
  },
  pressure_tension: {
    id: "pressure_tension",
    label: "Pressure & Tension",
    goal: "Understand inhibition, freezing, rushing, over-explaining, defensive behavior.",
    open_recall:
      "When a conversation gets tense or someone pushes back on you unexpectedly, what is your default reaction in that exact moment?",
    concrete_recall:
      "Think about the last time someone pushed back on you. What did you do in that moment?",
    recognition:
      "Which is closer: you freeze and go quiet, or you rush / over-explain to get through it?",
    forced_comparison:
      "Does that reaction show up mostly when you feel watched or challenged — yes or no?",
  },
  structure_brevity: {
    id: "structure_brevity",
    label: "Structure & Brevity",
    goal: "Understand organization, compression, sequencing, and point-first communication.",
    open_recall:
      "If you have to give someone a big update or explain a complicated situation, where do you usually start?",
    concrete_recall:
      "Think about the last long update you gave. Where did you actually begin?",
    recognition:
      "Which sounds closer: you bury the point under background, or you jump in without a clear structure?",
    forced_comparison:
      "If you had to lead with one sentence first, would that usually feel hard — yes or no?",
  },
  audience_adaptation: {
    id: "audience_adaptation",
    label: "Audience Adaptation",
    goal: "Understand audience adaptation and context-specific communication changes.",
    open_recall:
      "How much do you change the way you talk depending on who you’re talking to — like a close peer versus a boss or authority figure?",
    concrete_recall:
      "Think about the last time you talked to a boss or authority figure. How was that different from talking with a peer?",
    recognition:
      "Which is closer: you shrink or filter more with authority, or you talk basically the same with everyone?",
    forced_comparison:
      "Is the harder part mostly who you're talking to, rather than finding the words — yes or no?",
  },
};

/**
 * Optional wording hints by compatibility destination — NOT a mandatory script.
 * Prefer diagnosis-driven questions from the conversation.
 */
export const ASSESSMENT_ANCHOR_QUESTIONS = [
  ASSESSMENT_GATEWAY_LADDERS.processing_retrieval.open_recall,
  "Who are you usually talking to when this gets hard?",
  "When it breaks down, is it more that you know what you mean but can't find the words, or that the thought itself feels scrambled?",
  "What do you notice yourself doing in those moments that you want to change?",
  "Think of the last time this happened. Were you talking to someone you knew or someone you didn't?",
  "Six weeks from now, what do you want to be able to do that you can't do comfortably today?",
  "How much time can you realistically practice each day?",
] as const;

export const ASSESSMENT_DIAGNOSTIC_SLOTS = [
  "skill_to_improve",
  "where_it_shows_up",
  "what_goes_wrong",
  "behavior_to_change",
  "recent_missed_conversation",
  "six_week_success",
  "practice_time",
] as const satisfies readonly AssessmentSlotId[];

export type AssessmentSlotTurnMeta = {
  id: AssessmentSlotId;
  intent: string;
  suggestedWording: string;
  /** Default gateway when this destination is active. */
  defaultGateway: DiagnosticGateway;
};

export const ASSESSMENT_SLOT_TURN_META: Record<
  AssessmentSlotId,
  AssessmentSlotTurnMeta
> = {
  skill_to_improve: {
    id: "skill_to_improve",
    intent: "compatibility target: primary speaking friction / goal",
    suggestedWording: ASSESSMENT_ANCHOR_QUESTIONS[0],
    defaultGateway: "processing_retrieval",
  },
  where_it_shows_up: {
    id: "where_it_shows_up",
    intent: "compatibility target: real person / situation context",
    suggestedWording: ASSESSMENT_ANCHOR_QUESTIONS[1],
    defaultGateway: "audience_adaptation",
  },
  what_goes_wrong: {
    id: "what_goes_wrong",
    intent: "compatibility target: failure pattern / mechanism",
    suggestedWording: ASSESSMENT_ANCHOR_QUESTIONS[2],
    defaultGateway: "processing_retrieval",
  },
  behavior_to_change: {
    id: "behavior_to_change",
    intent: "compatibility target: observable behavior to change",
    suggestedWording: ASSESSMENT_ANCHOR_QUESTIONS[3],
    defaultGateway: "pressure_tension",
  },
  recent_missed_conversation: {
    id: "recent_missed_conversation",
    intent: "compatibility target: one concrete example",
    suggestedWording: ASSESSMENT_ANCHOR_QUESTIONS[4],
    defaultGateway: "processing_retrieval",
  },
  six_week_success: {
    id: "six_week_success",
    intent: "compatibility target: desired outcome",
    suggestedWording: ASSESSMENT_ANCHOR_QUESTIONS[5],
    defaultGateway: "processing_retrieval",
  },
  practice_time: {
    id: "practice_time",
    intent: "compatibility target: realistic practice commitment",
    suggestedWording: ASSESSMENT_ANCHOR_QUESTIONS[6],
    defaultGateway: "processing_retrieval",
  },
};

export type AssessmentTurnInstructionOptions = {
  /** Most recent user utterance (accepted or rejected). Ephemeral — not persisted. */
  lastUserText?: string | null;
  /** Optional prior difficulty estimate; otherwise inferred from lastUserText. */
  priorDifficulty?: QuestionDifficulty | null;
  /** Optional active gateway; otherwise derived from slot default. */
  activeGateway?: DiagnosticGateway | null;
};

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
 * Interaction signal: failed recall / don't-know / vague — NOT diagnostic evidence.
 * Used only to lower question difficulty on the same gateway.
 */
export function looksLikeFailedRecallSignal(text: string): boolean {
  const t = normSignalText(text);
  if (!t) return false;
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
  // Short universal vagueness without concrete mechanism/context.
  if (
    t.split(/\s+/).length <= 12 &&
    /\b(in general|everywhere|all the time|communicate better|speak better|be more confident|get better at small talk)\b/.test(
      t
    ) &&
    !/\b(words|freeze|ramble|blank|write|manager|boss|meeting|peer)\b/.test(t)
  ) {
    return true;
  }
  return false;
}

/** Heuristic: concrete, specific, reflective answer — raise difficulty. */
export function looksLikeFluentDiagnosticAnswer(text: string): boolean {
  const t = normSignalText(text);
  if (!t || looksLikeFailedRecallSignal(t)) return false;
  const words = t.split(/\s+/).length;
  if (words < 10) return false;
  const specific =
    /\b(when|because|usually|tend to|for example|yesterday|last|manager|boss|meeting|write|words|freeze|ramble|peer|authority)\b/.test(
      t
    );
  const reflective =
    /\b(i notice|i realize|it'?s more that|rather than|instead of|the difference)\b/.test(
      t
    );
  return specific && (words >= 16 || reflective);
}

export function difficultyIndex(level: QuestionDifficulty): number {
  return QUESTION_DIFFICULTY_LADDER.indexOf(level);
}

export function clampDifficulty(index: number): QuestionDifficulty {
  const i = Math.max(0, Math.min(QUESTION_DIFFICULTY_LADDER.length - 1, index));
  return QUESTION_DIFFICULTY_LADDER[i]!;
}

/**
 * Ephemeral next difficulty from the last answer.
 * Failed recall descends; fluent answers ascend; otherwise stay mid-ladder.
 */
export function recommendNextQuestionDifficulty(
  lastUserText: string | null | undefined,
  priorDifficulty: QuestionDifficulty | null | undefined = "open_recall"
): QuestionDifficulty {
  const prior = priorDifficulty ?? "open_recall";
  if (!lastUserText || !lastUserText.trim()) return prior;
  if (looksLikeFailedRecallSignal(lastUserText)) {
    return clampDifficulty(difficultyIndex(prior) + 1);
  }
  if (looksLikeFluentDiagnosticAnswer(lastUserText)) {
    return clampDifficulty(difficultyIndex(prior) - 1);
  }
  // Mildly useful but not fluent — nudge toward concrete recall if still open.
  if (prior === "open_recall") return "concrete_recall";
  return prior;
}

export function resolveActiveGateway(
  slot?: AssessmentSlotId | null,
  override?: DiagnosticGateway | null
): DiagnosticGateway {
  if (override) return override;
  if (slot && ASSESSMENT_SLOT_TURN_META[slot]) {
    return ASSESSMENT_SLOT_TURN_META[slot].defaultGateway;
  }
  return "processing_retrieval";
}

export function ladderWordingFor(
  gateway: DiagnosticGateway,
  difficulty: QuestionDifficulty
): string {
  return ASSESSMENT_GATEWAY_LADDERS[gateway][difficulty];
}

/**
 * Soft next-question guidance for tests / internal routing hints.
 * Critical invariant: failed recall keeps the same gateway and only changes difficulty.
 * suggestedWording is an optional probe example — never inject as sticky spoken script.
 */
export function recommendNextAssessmentQuestion(input: {
  slot?: AssessmentSlotId | null;
  lastUserText?: string | null;
  priorDifficulty?: QuestionDifficulty | null;
  activeGateway?: DiagnosticGateway | null;
}): {
  gateway: DiagnosticGateway;
  difficulty: QuestionDifficulty;
  suggestedWording: string;
  stayOnSameGateway: boolean;
  forbidDisengagementCheckIn: boolean;
  forbidContextJump: boolean;
} {
  const gateway = resolveActiveGateway(input.slot, input.activeGateway);
  const failed = looksLikeFailedRecallSignal(input.lastUserText ?? "");
  const difficulty = recommendNextQuestionDifficulty(
    input.lastUserText,
    input.priorDifficulty ?? "open_recall"
  );
  return {
    gateway,
    difficulty,
    suggestedWording: ladderWordingFor(gateway, difficulty),
    stayOnSameGateway: failed,
    forbidDisengagementCheckIn: failed,
    forbidContextJump: failed,
  };
}

export function countQuestionMarks(text: string): number {
  const matches = text.match(/\?/g);
  return matches ? matches.length : 0;
}

export function looksLikeDoubleBarreledAssessmentQuestion(text: string): boolean {
  const t = text.toLowerCase();
  if (!t.includes("?")) return false;
  if (
    /\b(and|also|plus)\b[^?]{0,80}\b(where|what|how|when|which|why)\b[^?]*\?/.test(
      t
    )
  ) {
    return true;
  }
  if (countQuestionMarks(text) >= 2) return true;
  if (
    /communication behavior/.test(t) &&
    /\bwhere\b/.test(t) &&
    /\?/.test(t)
  ) {
    return true;
  }
  return false;
}

export function containsBannedAssessmentQuestionLanguage(text: string): boolean {
  const t = text.toLowerCase();
  const banned = [
    "communication behavior",
    "communications behavior",
    "feel more confident",
    "where it really counts",
    "matter most to you",
    "speaking moments that matter",
    "what that means to you",
    "how does that feel",
    "emotional",
    "inner experience",
    "desired identity",
    "how does that make you feel",
    "what is at stake emotionally",
    "how do you want people to perceive you",
    "executive presence",
    "stakeholder alignment",
    "yield authority",
    "strategic framing",
    "audience calibration",
    "communication framework",
  ];
  return banned.some((b) => t.includes(b));
}

export function looksLikeCompleteAssessmentClosing(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (t.includes("?")) return false;
  if (/\b(if you want|we can continue|we can pick this up|thanks for sharing)\b/i.test(t)) {
    return false;
  }
  if (/[.!?]\s*$/.test(t) === false && !/[.!]["']?\s*$/.test(t)) {
    if (/\b(and|but|so|because|which|that)\s*$/i.test(t)) return false;
  }
  if (/\b(and|but|so|because|which|that)\s*$/i.test(t)) return false;
  if (/\.\.\.$/.test(t) || /…\s*$/.test(t)) return false;
  if (/^thanks?[.!]?$/i.test(t)) return false;
  return t.split(/\s+/).length >= 12;
}

/** True when a Forge turn looks like premature abandonment after struggle. */
export function looksLikePrematureAssessmentAbandonment(text: string): boolean {
  const t = text.toLowerCase();
  return (
    /aren'?t landing/.test(t) ||
    /want me to explain what this is for/.test(t) ||
    (/stop here for now/.test(t) && /questions/.test(t))
  );
}

/**
 * Assessment mode objective + capabilities only.
 * Inherits Forge Core — must not redefine identity, limits, or epistemic rules.
 */
export function buildAssessmentModeObjective(): string {
  return [
    "══════════════════════════════════════",
    "CURRENT MODE: DIAGNOSTIC ASSESSMENT",
    "══════════════════════════════════════",
    "Hierarchy: Forge Core → this objective → conversation evidence → you choose the next move.",
    "This mode does not redefine Forge Core. Goals and capabilities only.",
    "",
    "GOAL: Identify the member's primary communication bottleneck with the minimum questioning necessary — so training can start from evidence, not vague goals.",
    "This session is discovery, not drills. Not a form. Not a checklist walk of slots.",
    "",
    "MODE CAPABILITIES / APP OWNERSHIP:",
    "- YOU own: understanding, bottleneck hypothesis, question selection, acknowledgment, clarification, light teaching/challenge when it serves diagnosis, difficulty adaptation, pacing.",
    "- THE APP owns: observing answers, slots/currentSlot bookkeeping, accept/reject, completion/lock, synthesis, Living Profile persistence.",
    "- currentSlot / slot ids are APP OBSERVATION TARGETS — not your script.",
    "- Do NOT choose which slot id to ask next as an agenda.",
    "- Do NOT decide when the assessment ends. Do NOT self-close mid-interview.",
    "- Do NOT skip/reorder slots yourself. Do NOT try to write the Living Profile yourself.",
    "- Known compatibility ids (app bookkeeping only): skill_to_improve | where_it_shows_up | what_goes_wrong | behavior_to_change | recent_missed_conversation | six_week_success | practice_time.",
    "",
    "MODE METHOD (ephemeral — coach judgment):",
    "listen → understand → update competing explanations → choose the highest-value next move → app observes/persists evidence.",
    "Do not invent a second coach state machine.",
    "",
    "FOUR DIAGNOSTIC GATEWAYS — INTERNAL REASONING DIMENSIONS ONLY (never say these labels to the user):",
    '1) Processing & Retrieval — soft open probe example: "When you\'re trying to explain something out loud, what usually happens?"',
    '2) Pressure & Tension — soft open probe example: "When a conversation gets tense or someone pushes back on you unexpectedly, what is your default reaction in that exact moment?"',
    '3) Structure & Brevity — soft open probe example: "If you have to give someone a big update or explain a complicated situation, where do you usually start?"',
    '4) Audience Adaptation — soft open probe example: "How much do you change the way you talk depending on who you’re talking to — like a close peer versus a boss or authority figure?"',
    "These are routing dimensions for what evidence you still need. NOT four mandatory UI questions. Probe wording is yours.",
    "",
    "QUESTION DIFFICULTY LADDER (soft guidance — do not announce labels; do not sticky-script speech):",
    "Within the CURRENT diagnostic gateway, prefer when recall fails:",
    "OPEN RECALL → CONCRETE RECALL → RECOGNITION → FORCED COMPARISON",
    "1) open_recall — open spontaneous description",
    "2) concrete_recall — specific person / place / last time (same gateway)",
    "3) recognition — binary or short contrast the user can recognize (same gateway)",
    "4) forced_comparison — A vs B / yes-no mechanism choice (same gateway)",
    "Failed recall / I don't know / I can't remember / I'm not sure / vague aspiration: LOWER difficulty on the SAME gateway. Do NOT change subject. Do NOT jump to who/where. Do NOT offer to stop merely because they struggled.",
    "Fluent, concrete answers: RAISE difficulty / RAISE sophistication — do NOT force simplistic binaries.",
    "high_friction → prefer recognition/forced comparison on SAME gateway; middle → concrete recall; high_fluency → open/strategic depth allowed.",
    "CRITICAL INVARIANT: failed answer changes the QUESTION difficulty, not the SUBJECT/gateway.",
    "Context (who/where) may be asked later when diagnostically useful — never as the escape hatch from failed mechanism recall.",
    "",
    "INTERACTION SIGNALS — NEVER PROFILE FACTS:",
    '"I don\'t know", "I can\'t remember", "I\'m not sure", hesitation, failed recall, and vague aspirations must NEVER become diagnosis claims, Living Profile evidence, or mechanism support. The app will not store them as evidence.',
    "",
    "COMMUNICATION LOAD (ephemeral): high_friction → prefer recognition/forced comparison on SAME gateway; middle → concrete recall; high_fluency → open/strategic depth allowed.",
    "START ACCESSIBLE: ordinary language. Do not begin with executive presence / stakeholder alignment / audience calibration jargon unless fluency earned.",
    "",
    "BOTTLENECK HYPOTHESIS (private): keep competing candidates until discriminated. Do not accept the first vague answer. Do not diagnose \"small talk\" alone — find the mechanism.",
    "The app will not early-complete until discriminating user evidence distinguishes the leading mechanism.",
    "When unresolved — ASK A DISCRIMINATING QUESTION: prefer ONE discriminating contrast on the active gateway — not a generic next-slot filler.",
    "Do NOT fill a context slot while a high-value mechanism distinction is still unresolved — unless the user already gave clear mechanism evidence.",
    "Soft contrast examples (phrase in your own words): retrieval vs idea-generation — know what you want to say but can't find the words vs thought itself hasn't formed yet.",
    "",
    "NEVER TREAT AS SUFFICIENT DIAGNOSIS ALONE:",
    '"I don\'t know", "I can\'t remember", "I\'m not sure", "communication in general", "speak better", "not knowing what to say", "be more confident", "be a better communicator", "get better at small talk" (aspiration only).',
    "",
    "EVIDENCE: once a pattern appears, seek one concrete example adapted to load. Can't remember → easier ask; do not abandon the assessment.",
    "",
    "STOPPING (app decides): need genuine evidence for bottleneck, context, desired outcome, practice commitment, AND discriminating mechanism evidence.",
    "Do NOT mechanically ask seven form questions. Do NOT re-ask dimensions already clearly answered.",
    "APPLICATION OWNS SLOT SELECTION / TERMINATION / PERSISTENCE (mode capability — Core already forbids writing identity).",
    "COMPATIBILITY DESTINATION ids are observation targets only — not conversational scripts.",
    "",
    "ONE QUESTION PER TURN — HARD RULE (when seeking diagnostic evidence): Exactly one question mark; never bundle two asks.",
    "",
    "CONVERSATIONAL JUDGMENT: acknowledge, clarify, teach lightly, challenge, or pace as a skilled coach would — serving diagnostic understanding. No mid-assessment drills. No sticky ack→question templates.",
    "",
    "PLAIN LANGUAGE: everyday words. NEVER say \"communication behavior\". NEVER expose internal gateways/slots/mechanisms/Path language to the user.",
    "(Clinical / medical / identity / dignity / speak-for-user boundaries are in Forge Core — do not restate.)",
    "",
    "OPENING (speak first, then wait) — OBJECTIVES, not a sticky script:",
    "1) Introduce yourself. Seed meaning:",
    `"${ASSESSMENT_INTRODUCTION}"`,
    "2) Then one accessible open-recall diagnostic question. Soft probe example:",
    `"${ASSESSMENT_OPENING_LINE}"`,
    "Required objectives: say you're Forge; communication coach; briefly why; reduce pressure; you will adapt. No permission preamble. No \"That okay?\".",
    "If they struggle immediately: same Processing & Retrieval dimension, easier ask — never jump to who/where.",
    "",
    "AFTER EACH USER ANSWER: use coach judgment. When seeking evidence: one diagnostic question matched to load on the current gateway, then yield.",
    "",
    "NO MID-ASSESSMENT COACHING / DRILLS. Practice comes after the app completes.",
    "",
    "DISENGAGEMENT (narrow — mode process only; Core owns clinical escalation):",
    "Only if the user explicitly asks why you're asking / what this is for, or clearly wants to stop.",
    'Do NOT treat "I don\'t know", "I\'m not sure", or "I can\'t remember" as disengagement.',
    `True process confusion: briefly re-orient or offer a stop choice. Soft seed (optional): "${ASSESSMENT_DISENGAGEMENT_CHECK_IN}"`,
    "Respect explicit stop/end intent via session controls.",
    "",
    "CLOSING (only when the app requests it): one complete polished closing from established diagnosis/evidence — bottleneck, where it shows up, training focus, starting point.",
    "If competing mechanisms remain, say training will clarify — do not invent certainty. Synthesize; do not invent details.",
    `Seed meaning: "${ASSESSMENT_CLOSING_LINE}"`,
    "Zero questions. Finish every sentence. No ellipsis. No truncated closing.",
    "",
    "NEVER SELF-CLOSE mid-interview.",
  ].join("\n");
}

/** Coach brain = Forge Core + assessment mode (modes inherit Core). */
export function buildAssessmentCoachBrain(options?: {
  /** Preformatted relationship memory block from session-config. */
  memoryBlock?: string | null;
}): string {
  return buildForgeSystemPrompt({
    modeObjective: buildAssessmentModeObjective(),
    memoryBlock: options?.memoryBlock,
    extras: [
      LISTEN_FIRST_SYSTEM_INSTRUCTION,
      "Sound like an exceptional human coach inside Core — never a questionnaire or intake form.",
    ],
  });
}

export function buildAssessmentSystemInstructions(options?: {
  memoryBlock?: string | null;
}): string {
  return buildAssessmentCoachBrain(options);
}

export function buildAssessmentOpeningSpeechInstructions(): string {
  return [
    "Speak now as Coach Forge — you have your full coach judgment.",
    "This session is diagnostic discovery; the app will observe and persist what it learns.",
    "Opening OBJECTIVES (phrase in your own words — do not sticky-script):",
    "say you're Forge; you are their communication coach; briefly why you're asking; reduce performance pressure; you will adapt.",
    "Seed meaning for the intro:",
    `"${ASSESSMENT_INTRODUCTION}"`,
    "Then ask one accessible open-recall diagnostic question in your own words. Soft probe example:",
    `"${ASSESSMENT_OPENING_LINE}"`,
    "Then stop and wait. No permission ask. No That okay.",
    "Exactly one question mark in the opening turn (the diagnostic question). Plain language. No therapy. No drills. No internal jargon.",
  ].join(" ");
}

export function buildAssessmentTurnInstructions(
  slot?: AssessmentSlotId | null,
  options?: AssessmentTurnInstructionOptions
): string {
  const recommendation = recommendNextAssessmentQuestion({
    slot,
    lastUserText: options?.lastUserText,
    priorDifficulty: options?.priorDifficulty,
    activeGateway: options?.activeGateway,
  });
  const failed = recommendation.forbidContextJump;
  const fluent = looksLikeFluentDiagnosticAnswer(options?.lastUserText ?? "");

  const coachLead = [
    "You are Coach Forge. Understand before you ask.",
    "You own the next conversational move and the next question. The app observes your conversation and persists evidence — you do not fill a form.",
    "Choose acknowledgment, clarification, light teaching/challenge, or a discriminating question as a skilled coach would — serving diagnostic understanding.",
  ].join(" ");

  const observationBlock = slot
    ? [
        "APP OBSERVATION TARGET (compatibility destination — NOT your script):",
        `COMPATIBILITY DESTINATION id: ${slot}`,
        `information the app hopes to learn eventually: ${ASSESSMENT_SLOT_TURN_META[slot].intent}`,
        "Lead with coach judgment and unresolved hypothesis — do not read this destination as the next question.",
        failed
          ? `CRITICAL THIS TURN: last answer was failed recall / don't-know / vague. Stay on gateway "${recommendation.gateway}". Descend the difficulty ladder. Do NOT change subject. Do NOT ask who/where context next. Do NOT offer to stop.`
          : `Active gateway (internal soft hint): ${recommendation.gateway}.`,
        `Difficulty guidance this turn (soft — Forge chooses wording): ${recommendation.difficulty}.`,
        failed
          ? "Ignore any older open-recall or context-slot wording that would change the subject. Soft probe examples exist internally; do not treat them as required speech."
          : "Optional destination info is observation-only — never a sticky preferred-next-wording script.",
        "Estimate load and place cognitive burden on the difficulty ladder: open_recall → concrete_recall → recognition → forced_comparison WITHIN the current gateway.",
        "If vague / I don't know / I can't remember / I'm not sure / failed recall / hesitation: LOWER difficulty on the SAME gateway. Those phrases are interaction signals, never diagnosis.",
        fluent
          ? "Last answer was fluent/specific: RAISE sophistication — open or concrete recall, contrasts, examples, or synthesis. Do NOT force a simplistic binary."
          : "If fluent and specific: RAISE difficulty — open or concrete recall, or deeper process/strategic question.",
        "Test your bottleneck hypothesis across the four internal gateways; do not ask all four as mandatory questions.",
        "If competing mechanisms are unresolved: prefer ONE discriminating contrast question (not a generic slot filler).",
        "Do NOT ask Where does this show up most often as a form filler.",
        "Do NOT choose a different slot id yourself.",
        failed
          ? "FORBIDDEN THIS TURN: context jump; who-are-you-talking-to; assessment abandonment / stop-here check-in."
          : "Context who/where is allowed only when mechanism discrimination is already clear enough or diagnostically useful.",
      ].join(" ")
    : [
        "APP OBSERVATION TARGET: none provided by the app.",
        "COMPATIBILITY DESTINATION: none provided by the app.",
        "Do NOT invent a diagnostic slot. Brief acknowledgment and wait.",
      ].join(" ");

  const disengagementBlock = failed
    ? [
        "DISENGAGEMENT: OFF THIS TURN.",
        "Last answer was struggle/failed recall — adapt the question; do NOT offer stop/explain check-in.",
      ].join(" ")
    : [
        "If the user explicitly asks why you're asking / what this is for (process confusion about purpose), do NOT treat that as diagnostic content.",
        "Briefly re-orient to purpose or offer a stop choice in your own words — do not sticky-script a check-in.",
        "Do NOT offer stop/explain merely because they said I don't know / I'm not sure / I can't remember — those mean lower difficulty on the same gateway.",
      ].join(" ");

  return [
    coachLead,
    "ASSESSMENT MODE turn — coach-led diagnostic discovery.",
    "The app owns completion/lock/persistence. currentSlot is an observation target, not the script.",
    "Internal: listen → understand → difficulty guidance on SAME gateway → hypothesis → discriminate.",
    "CRITICAL INVARIANT: failed recall changes the QUESTION difficulty, not the SUBJECT/gateway.",
    disengagementBlock,
    "When seeking more diagnostic evidence: Exactly ONE concrete question — one question mark — difficulty matched to the user on the current gateway. Then yield.",
    "You may briefly acknowledge, clarify, teach lightly, or challenge when it serves understanding — never drills, never therapy, never a sticky ack→question template.",
    observationBlock,
    "FORBIDDEN: two questions; \"communication behavior\"; corporate jargon (executive presence, stakeholder alignment, audience calibration) unless fluency earned; therapy language; mid-assessment drills; form-filling language; self-closing; treating I don't know / I can't remember as profile facts; exposing gateways/slots/mechanisms/Path language to the user; sticky preferred-next-wording overrides.",
    "Never invite practice/drills this turn.",
  ].join(" ");
}

export function buildAssessmentClosingSpeechInstructions(): string {
  return [
    "ASSESSMENT MODE FINAL CLOSING TURN — still Coach Forge.",
    "The application has structurally completed the assessment and will persist what it learned.",
    "Speak ONE complete, polished closing from the established diagnosis/evidence — phrase it in your own words.",
    "Include: primary friction/bottleneck, where it shows up, what training will focus on, and that this is the starting point.",
    "Synthesize mechanism language (e.g. retrieval under pressure, over-explaining, freeze when put on the spot) — do not echo vague phrases like communicate better, small talk alone, I don't know, or I can't remember as the diagnosis.",
    "If competing mechanisms remain plausible, acknowledge that training will clarify rather than inventing a single cause.",
    "Do not invent incidents the user did not provide.",
    `Seed meaning you may adapt: "${ASSESSMENT_CLOSING_LINE}"`,
    "HARD RULES: Zero questions. Finish every sentence. No trail-off. No ellipsis. No thanks-only. Speak the closing only, then stop.",
  ].join(" ");
}
