/**
 * Diagnosis → training scenarios must stay evidence-traceable.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { synthesizeDiagnosis } from "./assessment-synthesis.ts";
import {
  buildTrainingScenarios,
  trainingScenarioPracticeHref,
} from "./assessment-training-scenarios.ts";

test("scenarios require evidence refs and exclude catalog defaults", () => {
  const diagnosis = synthesizeDiagnosis({
    skill_to_improve: "I freeze when my boss asks me something",
    where_it_shows_up: "Meetings with my manager at work",
    what_goes_wrong: "I go blank when put on the spot",
    six_week_success: "Answer without freezing",
    practice_time: "Ten minutes each day",
    recent_missed_conversation:
      "Yesterday my manager asked a question and I blanked",
  });
  const scenarios = buildTrainingScenarios(diagnosis);
  assert.ok(scenarios.length >= 1);
  for (const s of scenarios) {
    assert.ok(s.title);
    assert.ok(s.mission);
    assert.ok(s.evidenceRefs.length >= 1);
    assert.doesNotMatch(
      `${s.title} ${s.mission}`,
      /Recover Instantly When Interrupted|Practice Saying .No.|Command the Room|Get Paid What|Own the Call/i
    );
  }
  const href = trainingScenarioPracticeHref(scenarios);
  assert.match(href, /\/app\/practice\?start=1/);
  assert.match(href, /title=/);
});

test("empty / signal-only diagnosis yields no invented specialty scenarios", () => {
  const diagnosis = synthesizeDiagnosis({
    skill_to_improve: "I want to get better at small talk",
  });
  const scenarios = buildTrainingScenarios(diagnosis);
  for (const s of scenarios) {
    assert.doesNotMatch(s.title, /interruption|saying no|executive/i);
    assert.ok(s.evidenceRefs.length >= 1 || s.trainingImplicationId);
  }
});
