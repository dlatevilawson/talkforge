import test from "node:test";
import assert from "node:assert/strict";
import {
  ASSESSMENT_OPENING_LINE,
  buildAssessmentClosingSpeechInstructions,
  buildAssessmentSystemInstructions,
  buildAssessmentTurnInstructions,
} from "./assessment-prompt.ts";

test("accessible opening is a concrete diagnostic question after intro", () => {
  assert.match(ASSESSMENT_OPENING_LINE, /explain something out loud/i);
  assert.doesNotMatch(ASSESSMENT_OPENING_LINE, /quick read|That okay\?/i);
  assert.doesNotMatch(
    ASSESSMENT_OPENING_LINE,
    /What would you most like to get better at/
  );
  assert.match(ASSESSMENT_OPENING_LINE, /\?/);
});

test("system prompt embeds adaptive diagnostic contract", () => {
  const system = buildAssessmentSystemInstructions();
  assert.match(system, /COMPATIBILITY DESTINATION/i);
  assert.match(system, /COMMUNICATION LOAD/i);
  assert.match(system, /QUESTION DIFFICULTY LADDER/i);
  assert.match(system, /FOUR DIAGNOSTIC GATEWAYS/i);
  assert.match(system, /BOTTLENECK HYPOTHESIS/i);
  assert.match(system, /NEVER TREAT AS SUFFICIENT DIAGNOSIS ALONE/i);
  assert.match(system, /APPLICATION OWNS SLOT SELECTION/i);
  assert.match(system, /Understand before you coach/i);
  assert.match(system, /OWNERSHIP SPLIT/i);
  assert.match(system, /APP OBSERVATION/i);
  assert.ok(system.includes(ASSESSMENT_OPENING_LINE));
  assert.doesNotMatch(system, /Ask ONLY about the current slot/);
  assert.doesNotMatch(system, /NEVER echo, paraphrase/);
});

test("turn instructions treat currentSlot as observation target not script", () => {
  const turn = buildAssessmentTurnInstructions("skill_to_improve");
  assert.match(turn, /COMPATIBILITY DESTINATION/i);
  assert.match(turn, /APP OBSERVATION TARGET/i);
  assert.match(turn, /id: skill_to_improve/);
  assert.match(turn, /Exactly ONE concrete question/i);
  assert.match(turn, /recognition/i);
  assert.match(turn, /You own the next question/i);
  assert.doesNotMatch(turn, /Ask ONLY this/);
  assert.doesNotMatch(turn, /CURRENT ASSESSMENT SLOT/);
});

test("closing instructions require complete diagnosis-grounded speech", () => {
  const closing = buildAssessmentClosingSpeechInstructions();
  assert.match(closing, /Zero questions/i);
  assert.match(closing, /Do not invent/i);
  assert.match(closing, /bottleneck|friction/i);
});
