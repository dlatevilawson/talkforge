/**
 * First-user assessment — deterministic prompt/behavior contract tests.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  ASSESSMENT_OPENING_LINE,
  ASSESSMENT_ANCHOR_QUESTIONS,
  buildAssessmentSystemInstructions,
  buildAssessmentTurnInstructions,
  buildAssessmentOpeningSpeechInstructions,
  buildAssessmentClosingSpeechInstructions,
  looksLikeCompleteAssessmentClosing,
  countQuestionMarks,
} from "./assessment-prompt.ts";

test("first-user: opening is the diagnostic skill question (no permission ask)", () => {
  assert.equal(
    ASSESSMENT_OPENING_LINE,
    "What would you most like to get better at when you speak?"
  );
  const opening = buildAssessmentOpeningSpeechInstructions();
  assert.match(opening, /What would you most like to get better at when you speak\?/i);
  assert.match(opening, /Do not add a permission ask/i);
  assert.match(opening, /Do not add a permission ask or "That okay\?"/i);
  assert.doesNotMatch(ASSESSMENT_OPENING_LINE, /quick read/i);
  assert.doesNotMatch(ASSESSMENT_OPENING_LINE, /That okay\?/i);

  const system = buildAssessmentSystemInstructions();
  assert.match(system, /Do NOT ask permission for a generic/i);
  assert.match(system, /quick read/i);
  assert.match(system, /Do NOT open with/i);
  assert.match(system, /That okay/i);
});

test("first-user: useful questions uncover person / moment / breakdown", () => {
  const system = buildAssessmentSystemInstructions();
  assert.match(system, /real person, a real moment, or what actually breaks down/i);
  assert.match(system, /FORBIDDEN generic questions/i);
  assert.match(system, /Where does this show up most often/i);
  assert.doesNotMatch(
    ASSESSMENT_ANCHOR_QUESTIONS.join("\n"),
    /Where does this show up most often/i
  );

  const turn = buildAssessmentTurnInstructions("where_it_shows_up");
  assert.match(turn, /Do NOT ask "Where does this show up most often\?"/i);
  assert.match(turn, /who they are usually talking to/i);
});

test("first-user: small talk / articulation and everyday-life follow-ups", () => {
  const system = buildAssessmentSystemInstructions();
  assert.match(system, /small talk or articulation/i);
  assert.match(system, /joining in or expressing themselves hard/i);
  assert.match(system, /everyday life/i);
  assert.match(system, /who they are usually talking to/i);

  const turn = buildAssessmentTurnInstructions("where_it_shows_up");
  assert.match(turn, /small talk or articulation/i);
  assert.match(turn, /everyday life/i);
});

test("first-user: one question, plain language, no therapy, no drills", () => {
  const system = buildAssessmentSystemInstructions();
  assert.match(system, /ONE actual question per Forge turn/i);
  assert.match(system, /No therapy language/i);
  assert.match(system, /NO MID-ASSESSMENT COACHING/i);
  assert.match(system, /No practice, retry, tone tips, drills/i);

  const turn = buildAssessmentTurnInstructions("behavior_to_change");
  assert.match(turn, /Exactly ONE concrete diagnostic question/i);
  assert.match(turn, /mid-assessment drills/i);
  assert.match(turn, /not therapy/i);
});

test("first-user: closing still complete", () => {
  const closing = buildAssessmentClosingSpeechInstructions();
  assert.match(closing, /Zero questions/i);
  const good =
    "I've got enough to work with. You want clearer small talk, especially when joining conversations at work. We'll start by practicing simple ways to get into the conversation without freezing.";
  assert.equal(looksLikeCompleteAssessmentClosing(good), true);
  assert.equal(countQuestionMarks(good), 0);
});
