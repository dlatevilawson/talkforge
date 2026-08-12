/**
 * Forge Assessment Coach V2 — deterministic prompt/behavior contract tests.
 * Validates behavioral rules; wording checks stay flexible where possible.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAssessmentSystemInstructions,
  buildAssessmentTurnInstructions,
  buildAssessmentClosingSpeechInstructions,
  looksLikeCompleteAssessmentClosing,
  containsBannedAssessmentQuestionLanguage,
  countQuestionMarks,
  ASSESSMENT_ANCHOR_QUESTIONS,
} from "./assessment-prompt.ts";
import {
  classifyAssessmentAnswer,
  isAssessmentAnswerSufficient,
  synthesizeProfilePhrase,
} from "./assessment-answer-quality.ts";

test("coach v2: strong useful answer → move forward (sufficiency)", () => {
  const useful =
    "I want to get to the point faster when I explain ideas in meetings";
  assert.equal(isAssessmentAnswerSufficient("skill_to_improve", useful), true);
  const system = buildAssessmentSystemInstructions();
  assert.match(system, /USEFUL/i);
  assert.match(system, /move toward the next needed target/i);
});

test("coach v2: vague answer → clarifying question (not accept-as-done)", () => {
  assert.equal(
    classifyAssessmentAnswer("skill_to_improve", "I want to communicate better."),
    "vague"
  );
  const system = buildAssessmentSystemInstructions();
  const turn = buildAssessmentTurnInstructions("skill_to_improve");
  assert.match(system, /VAGUE/i);
  assert.match(system, /DO NOT treat as done/i);
  assert.match(system, /simpler clarifying question/i);
  assert.match(turn, /vague/i);
  assert.match(turn, /clarif/i);
  assert.match(turn, /app did not advance/i);
});

test("coach v2: ambiguous answer → clarifying question", () => {
  assert.equal(
    classifyAssessmentAnswer(
      "what_goes_wrong",
      "I either freeze or ramble depending, not sure which."
    ),
    "ambiguous"
  );
  const system = buildAssessmentSystemInstructions();
  assert.match(system, /AMBIGUOUS/i);
  assert.match(system, /narrows/i);
});

test("coach v2: concrete example → investigative follow-up guidance", () => {
  assert.equal(
    classifyAssessmentAnswer(
      "recent_missed_conversation",
      "Yesterday my manager asked me a question and I lost my train of thought"
    ),
    "concrete"
  );
  const system = buildAssessmentSystemInstructions();
  const turn = buildAssessmentTurnInstructions("recent_missed_conversation");
  assert.match(system, /CONCRETE/i);
  assert.match(system, /investigative follow-up/i);
  assert.match(turn, /concrete/i);
  assert.match(system, /scaffold/i);
});

test("coach v2: poor vocabulary → simpler ordinary-language questions", () => {
  const system = buildAssessmentSystemInstructions();
  assert.match(system, /POOR COMMUNICATION SKILLS/i);
  assert.match(system, /ordinary language/i);
  assert.match(system, /executive presence/i);
  assert.match(
    system,
    /When you know what you want to say but can't get it out/i
  );
  const bad =
    "When the stakes are high, where's the breakdown in your executive presence?";
  assert.equal(containsBannedAssessmentQuestionLanguage(bad), true);
  const good =
    "When you know what you want to say but can't get it out, what usually happens?";
  assert.equal(containsBannedAssessmentQuestionLanguage(good), false);
});

test("coach v2: diagnostic thread follow — conversational memory", () => {
  const system = buildAssessmentSystemInstructions();
  assert.match(system, /CONVERSATIONAL MEMORY/i);
  assert.match(system, /hate small talk/i);
  assert.match(system, /high-value thread/i);
  assert.match(system, /Do not mechanically march through fields/i);
  const turn = buildAssessmentTurnInstructions("what_goes_wrong");
  assert.match(turn, /conversation history/i);
});

test("coach v2: insufficient information → do not fabricate", () => {
  const system = buildAssessmentSystemInstructions();
  const closing = buildAssessmentClosingSpeechInstructions();
  assert.match(system, /Never fabricate/i);
  assert.match(system, /do NOT pretend certainty/i);
  assert.match(closing, /Do not invent details/i);
  assert.match(closing, /weaker/i);
});

test("coach v2: final response → complete natural closing", () => {
  const closing = buildAssessmentClosingSpeechInstructions();
  assert.match(closing, /complete, polished, natural closing/i);
  assert.match(closing, /Zero questions/i);
  assert.match(closing, /No ellipsis/i);
  assert.match(closing, /That gives me a good starting point/i);

  const good =
    "That gives me a good starting point. It sounds like the main thing to work on is getting your thoughts organized quickly enough that you can express them clearly in the moment. We'll build from there.";
  assert.equal(looksLikeCompleteAssessmentClosing(good), true);
  assert.equal(countQuestionMarks(good), 0);
  assert.equal(looksLikeCompleteAssessmentClosing("I've got enough to work with. You want to"), false);
  assert.equal(looksLikeCompleteAssessmentClosing("Thanks for sharing."), false);
  assert.equal(
    looksLikeCompleteAssessmentClosing("I've got enough to start..."),
    false
  );
});

test("coach v2: final profile → synthesis rather than verbatim restatement", () => {
  const system = buildAssessmentSystemInstructions();
  assert.match(system, /Synthesize/i);
  assert.match(system, /do not parrot/i);
  const polished = synthesizeProfilePhrase(
    "I want to communicate my ideas more clearly",
    "goal"
  );
  assert.notEqual(polished.toLowerCase(), "i want to communicate my ideas more clearly");
  assert.match(polished, /communicate my ideas more clearly/i);
  assert.doesNotMatch(polished, /^I want to/i);
});

test("coach v2: assessment stays bounded — not an endless interview", () => {
  const system = buildAssessmentSystemInstructions();
  assert.match(system, /4–7 meaningful/i);
  assert.match(system, /Do not interview forever/i);
  assert.match(system, /Do not keep diagnosing once you have enough/i);
  assert.match(system, /ONE actual question per Forge turn/i);
  const turn = buildAssessmentTurnInstructions("behavior_to_change");
  assert.match(turn, /Do not start an endless interview/i);
  assert.match(turn, /Exactly ONE concrete question/i);
  // Anchors remain single-question hints.
  for (const q of ASSESSMENT_ANCHOR_QUESTIONS) {
    assert.equal(countQuestionMarks(q), 1);
  }
});
