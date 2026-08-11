/**
 * Forge Assessment Coach V1 — deterministic prompt/behavior contract tests.
 * Prompt-only experiment: instructions encode coach behavior; architecture unchanged.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAssessmentSystemInstructions,
  buildAssessmentTurnInstructions,
  buildAssessmentClosingSpeechInstructions,
  looksLikeCompleteAssessmentClosing,
  countQuestionMarks,
} from "./assessment-prompt.ts";

test("coach v1: vague goal → clarification (not generic next-slot)", () => {
  const system = buildAssessmentSystemInstructions();
  const turn = buildAssessmentTurnInstructions("where_it_shows_up");
  assert.match(turn, /vague/i);
  assert.match(turn, /clarif/i);
  assert.match(system, /communicate better/i);
  assert.match(system, /getting your thoughts out clearly/i);
  assert.match(system, /SLOT IS THE DESTINATION, NOT THE SCRIPT/i);
  assert.doesNotMatch(turn, /Ask ONLY this/i);
  assert.doesNotMatch(system, /NEVER repeat, paraphrase, summarize/i);
  assert.doesNotMatch(system, /ACK ≤5 words/i);
});

test("coach v1: specific answer → contextual follow-up", () => {
  const system = buildAssessmentSystemInstructions();
  assert.match(system, /ramble in meetings/i);
  assert.match(system, /right before you start rambling/i);
  assert.match(system, /Do NOT ask a generic question when their last answer opens a better thread/i);
  const turn = buildAssessmentTurnInstructions("what_goes_wrong");
  assert.match(turn, /Use conversation history/i);
  assert.match(turn, /most useful next question/i);
});

test("coach v1: information already supplied → do not ask again", () => {
  const system = buildAssessmentSystemInstructions();
  assert.match(system, /Do NOT ask for information they already supplied/i);
  assert.match(system, /It mostly happens at work/i);
  assert.match(system, /Where does this show up most often/i);
  const turn = buildAssessmentTurnInstructions("where_it_shows_up");
  assert.match(turn, /Do NOT ask for facts already clearly given/i);
});

test("coach v1: real example → explore the example", () => {
  const system = buildAssessmentSystemInstructions();
  assert.match(system, /lost my train of thought/i);
  assert.match(system, /Walk me through what happened right after/i);
  assert.match(system, /Explore that moment/i);
  const turn = buildAssessmentTurnInstructions("recent_missed_conversation");
  assert.match(turn, /real recent example|information target/i);
});

test("coach v1: sufficient information → stop diagnosing", () => {
  const system = buildAssessmentSystemInstructions();
  assert.match(system, /Do not keep diagnosing once you have enough to coach/i);
  assert.match(system, /Do not turn this into a six-question checklist/i);
  const closing = buildAssessmentClosingSpeechInstructions();
  assert.match(closing, /ASSESSMENT MODE FINAL CLOSING/i);
  assert.match(closing, /Zero questions/i);
  assert.match(closing, /Do not ask what they want next/i);
});

test("coach v1: exactly one question per turn", () => {
  const system = buildAssessmentSystemInstructions();
  assert.match(system, /ONE actual question per Forge turn/i);
  assert.match(system, /Do not bundle multiple questions/i);
  assert.match(system, /SLOT IS THE DESTINATION, NOT THE SCRIPT/i);
  const turn = buildAssessmentTurnInstructions("behavior_to_change");
  assert.match(turn, /Exactly ONE concrete diagnostic question/i);
  assert.match(turn, /one question mark/i);
  assert.equal(countQuestionMarks("What's usually happening right before you start rambling?"), 1);
  assert.ok(countQuestionMarks("Where does it show up? And what happens?") > 1);
});

test("coach v1: closing is complete and does not trail off", () => {
  const closing = buildAssessmentClosingSpeechInstructions();
  assert.match(closing, /Finish every sentence/i);
  assert.match(closing, /Do not trail off/i);
  assert.match(closing, /Zero questions/i);
  assert.match(closing, /I've got enough to work with/i);
  assert.match(closing, /thanks for sharing/i);
  assert.match(closing, /Do not offer to continue the interview/i);

  const good =
    "I've got enough to work with. You want to communicate your ideas more clearly, especially in work conversations where you sometimes lose your train of thought. We'll start by working on clarity and structure so you can get your point across without rushing.";
  assert.equal(looksLikeCompleteAssessmentClosing(good), true);
  assert.equal(countQuestionMarks(good), 0);

  assert.equal(looksLikeCompleteAssessmentClosing("I've got enough to work with. You want to"), false);
  assert.equal(looksLikeCompleteAssessmentClosing("Thanks for sharing."), false);
  assert.equal(
    looksLikeCompleteAssessmentClosing(
      "I've got enough to work with. You want clearer meetings. What else should we cover?",
    ),
    false,
  );
});

test("coach v1: no therapy/diagnostic language", () => {
  const system = buildAssessmentSystemInstructions();
  assert.match(system, /No therapy language/i);
  assert.match(system, /No diagnostic language/i);
  assert.doesNotMatch(system, /\btrauma\b/i);
  assert.doesNotMatch(system, /\banxiety disorder\b/i);
  assert.doesNotMatch(system, /\bdepression\b/i);
  const turn = buildAssessmentTurnInstructions("six_week_success");
  assert.doesNotMatch(turn, /\btrauma\b/i);
  assert.match(turn, /not therapy/i);
  const closing = buildAssessmentClosingSpeechInstructions();
  assert.doesNotMatch(closing, /\btrauma\b/i);
});
