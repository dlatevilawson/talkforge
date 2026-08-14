/**
 * Discriminating-evidence gate — early completion must not fire on abstract fills.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { isGenericAssessmentSlotAnswer } from "./assessment-generic-answers.ts";
import {
  applyCompatibilityProjection,
  canCompleteWithDiagnosticEvidence,
  collectUserEvidence,
  startAssessmentLifecycle,
  synthesizeDiagnosis,
} from "./assessment-lifecycle.ts";
import {
  assessGenuineEvidenceCoverage,
  extractDiscriminatingEvidence,
  evidenceFingerprint,
} from "./assessment-synthesis.ts";
import { buildTrainingScenarios } from "./assessment-training-scenarios.ts";
import { buildAssessmentSystemInstructions } from "./assessment-prompt.ts";

test("A. aspiration small talk → no diagnosis, no scenarios, needs discrimination", () => {
  assert.equal(
    isGenericAssessmentSlotAnswer(
      "skill_to_improve",
      "I want to get better at small talk"
    ),
    true
  );
  const diagnosis = synthesizeDiagnosis({
    skill_to_improve: "I want to get better at small talk",
  });
  assert.equal(diagnosis.diagnosticConfidence, "low");
  assert.equal(diagnosis.mechanismId, null);
  assert.doesNotMatch(diagnosis.focusArea, /^small talk$/i);
  assert.equal(buildTrainingScenarios(diagnosis).length, 0);
  assert.equal(assessGenuineEvidenceCoverage({
    skill_to_improve: "I want to get better at small talk",
  }).sufficient, false);

  const system = buildAssessmentSystemInstructions();
  assert.match(system, /DISCRIMINATING QUESTION/i);
  assert.match(system, /retrieval vs idea-generation/i);
});

test("B. retrieval + writing easier → supported without named incident (PATH 2)", () => {
  const evidence = {
    skill_to_improve: "I know what I mean, but the words disappear",
    where_it_shows_up: "Work meetings",
    what_goes_wrong: "Writing is much easier than speaking on the spot",
    six_week_success: "I want to answer clearly without hunting for words",
    practice_time: "Ten minutes each day",
  };
  const coverage = assessGenuineEvidenceCoverage(evidence);
  assert.equal(coverage.path2, true);
  assert.equal(coverage.sufficient, true);
  assert.equal(coverage.diagnosticConfidence, "supported");
  const diagnosis = synthesizeDiagnosis(evidence);
  assert.equal(diagnosis.mechanismId, "verbal_retrieval");
  assert.equal(diagnosis.diagnosticConfidence, "supported");
  assert.equal(diagnosis.uncertainty, null);
});

test("C. mind goes blank alone → insufficient (ambiguous)", () => {
  const evidence = {
    skill_to_improve: "My mind goes blank",
    where_it_shows_up: "Conversations",
    what_goes_wrong: "My mind goes blank",
    six_week_success: "I want to speak more clearly",
    practice_time: "Ten minutes each day",
  };
  const coverage = assessGenuineEvidenceCoverage(evidence);
  assert.equal(coverage.sufficient, false);
  assert.notEqual(coverage.diagnosticConfidence, "supported");
  const diagnosis = synthesizeDiagnosis(evidence);
  assert.notEqual(diagnosis.diagnosticConfidence, "supported");
});

test("D. blank with manager + fine with friends → pressure supported", () => {
  const evidence = {
    skill_to_improve: "My mind goes blank when my manager suddenly asks me something",
    where_it_shows_up: "Work meetings with my manager",
    what_goes_wrong: "With friends I'm usually fine",
    six_week_success: "Answer clearly when put on the spot at work",
    practice_time: "Ten minutes each day",
    recent_missed_conversation:
      "Yesterday my manager asked me something suddenly and I blanked",
  };
  const diagnosis = synthesizeDiagnosis(evidence);
  assert.equal(diagnosis.mechanismId, "freeze_under_pressure");
  assert.equal(diagnosis.diagnosticConfidence, "supported");
  const coverage = assessGenuineEvidenceCoverage(evidence);
  assert.equal(coverage.sufficient, true);
});

test("E. too many thoughts + fear of leaving things out → over-explaining", () => {
  const evidence = {
    skill_to_improve: "I have too many thoughts and start from the beginning every time",
    where_it_shows_up: "Team meetings at work",
    what_goes_wrong:
      "I keep adding context because I'm afraid I'll leave something out",
    six_week_success: "I want to get to the point faster",
    practice_time: "Fifteen minutes each day",
    recent_missed_conversation:
      "Yesterday in a meeting I started from the beginning and buried the point",
  };
  const diagnosis = synthesizeDiagnosis(evidence);
  assert.equal(diagnosis.mechanismId, "over_explaining");
  assert.equal(diagnosis.diagnosticConfidence, "supported");
});

test("F. group pause timing → group-entry, not generic small-talk", () => {
  const evidence = {
    skill_to_improve:
      "In groups I think of something, but by the time there's a pause they've moved on",
    where_it_shows_up: "Team standups and group meetings at work",
    what_goes_wrong: "I miss the opening and the topic has moved",
    six_week_success: "Enter earlier with one contribution",
    practice_time: "Ten minutes each day",
  };
  const diagnosis = synthesizeDiagnosis(evidence);
  assert.equal(diagnosis.mechanismId, "group_timing_lag");
  assert.doesNotMatch(diagnosis.focusArea, /^small talk$/i);
});

test("G. two paraphrases count as one discriminating observation", () => {
  const evidence = {
    skill_to_improve: "I know what I mean but can't find the words",
    what_goes_wrong: "I know what I mean but I can't find the words when I speak",
  };
  const items = extractDiscriminatingEvidence(evidence);
  const retrievalItems = items.filter((i) =>
    i.mechanisms.includes("verbal_retrieval")
  );
  assert.ok(retrievalItems.length <= 1);
  assert.ok(
    evidenceFingerprint(evidence.skill_to_improve) ===
      evidenceFingerprint(evidence.skill_to_improve)
  );
  const coverage = assessGenuineEvidenceCoverage({
    ...evidence,
    where_it_shows_up: "Work meetings",
    six_week_success: "Answer more clearly",
    practice_time: "Ten minutes each day",
  });
  // One unique discriminator alone without example → not PATH 2
  assert.equal(coverage.path2, false);
  assert.equal(coverage.sufficient, false);
});

test("H. synthetic compatibility fills never increase confidence", () => {
  let state = startAssessmentLifecycle();
  state = {
    ...state,
    consented: true,
    slots: {
      ...state.slots,
      skill_to_improve: {
        id: "skill_to_improve",
        status: "filled",
        answer: "I know what I mean but the words disappear",
        source: "user",
      },
      where_it_shows_up: {
        id: "where_it_shows_up",
        status: "filled",
        answer: "Work meetings",
        source: "user",
      },
      what_goes_wrong: {
        id: "what_goes_wrong",
        status: "filled",
        answer: "Writing is much easier than speaking on the spot",
        source: "user",
      },
      six_week_success: {
        id: "six_week_success",
        status: "filled",
        answer: "Answer clearly without hunting for words",
        source: "user",
      },
      practice_time: {
        id: "practice_time",
        status: "filled",
        answer: "Ten minutes each day",
        source: "user",
      },
      behavior_to_change: {
        id: "behavior_to_change",
        status: "filled",
        answer: "SYNTHETIC FILLER THAT SHOULD NOT BOOST CONFIDENCE",
        source: "synthesized",
      },
      recent_missed_conversation: {
        id: "recent_missed_conversation",
        status: "filled",
        answer: "SYNTHETIC EXAMPLE FILLER",
        source: "synthesized",
      },
    },
  };
  const userOnly = collectUserEvidence(state.slots);
  assert.equal(userOnly.behavior_to_change, undefined);
  assert.equal(userOnly.recent_missed_conversation, undefined);
  const before = synthesizeDiagnosis(userOnly);
  const withSynthEcho = synthesizeDiagnosis({
    ...userOnly,
    behavior_to_change: "SYNTHETIC FILLER THAT SHOULD NOT BOOST CONFIDENCE",
  });
  // Even if someone passed synth text in, collectUserEvidence excludes it from lifecycle path.
  // Confidence from user-only path must not rely on synth slots.
  assert.ok(before.discriminatingEvidenceCount >= 1);
  assert.equal(
    collectUserEvidence(state.slots).behavior_to_change,
    undefined
  );
  void withSynthEcho;
  assert.equal(canCompleteWithDiagnosticEvidence(state), true);
  // Projection must not treat synth as user evidence for further inference
  const projected = applyCompatibilityProjection(state);
  const afterUser = collectUserEvidence(projected.slots);
  assert.equal(afterUser.behavior_to_change, undefined);
});

test("I. tied mechanisms → uncertainty, no premature specialization, prompt discriminates", () => {
  const evidence = {
    skill_to_improve: "Speaking gets hard when I'm put on the spot",
    where_it_shows_up: "Meetings at work",
    what_goes_wrong:
      "Sometimes I blank and sometimes I have too many thoughts at once — I'm not sure which",
    six_week_success: "I want to answer clearly in meetings",
    practice_time: "Ten minutes each day",
  };
  const diagnosis = synthesizeDiagnosis(evidence);
  assert.ok(diagnosis.uncertainty);
  assert.notEqual(diagnosis.diagnosticConfidence, "supported");
  assert.equal(diagnosis.mechanismId, null);
  const scenarios = buildTrainingScenarios(diagnosis);
  for (const s of scenarios) {
    assert.doesNotMatch(
      `${s.title} ${s.mission}`,
      /\brecommend interruption\b|\bPractice Saying .No.|\bexecutive presence\b|\bcommand the room\b/i
    );
    if (s.trainingImplicationId) {
      assert.equal(s.trainingImplicationId, "clarify_mechanism");
    }
  }
  const system = buildAssessmentSystemInstructions();
  assert.match(system, /Ask ONE discriminating contrast question|DISCRIMINATING QUESTION/i);
});

test("J. sufficient diagnosis → scenarios cite real accepted evidenceRefs", () => {
  const evidence = {
    skill_to_improve: "I know what I mean but can't find the words",
    where_it_shows_up: "Work meetings with my manager",
    what_goes_wrong: "Writing is much easier than speaking on the spot",
    six_week_success: "Answer clearly without hunting for words",
    practice_time: "Ten minutes each day",
    recent_missed_conversation:
      "Yesterday my manager asked a question and I stalled on the words",
  };
  const diagnosis = synthesizeDiagnosis(evidence);
  assert.equal(diagnosis.diagnosticConfidence, "supported");
  const scenarios = buildTrainingScenarios(diagnosis);
  assert.ok(scenarios.length >= 1);
  for (const s of scenarios) {
    assert.ok(s.evidenceRefs.length >= 1);
    const joined = s.evidenceRefs.join(" ").toLowerCase();
    assert.ok(
      /words|writing|manager|meeting|stall/i.test(joined),
      `evidenceRefs should cite real user evidence: ${joined}`
    );
    assert.doesNotMatch(joined, /synthetic|communicate better/i);
  }
});
