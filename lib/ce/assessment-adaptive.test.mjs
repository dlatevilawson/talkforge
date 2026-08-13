/**
 * Adaptive first-user assessment — behavioral cases (not exact prompt strings).
 */
import test from "node:test";
import assert from "node:assert/strict";
import { isGenericAssessmentSlotAnswer } from "./assessment-generic-answers.ts";
import {
  acceptAnswer,
  applyCompatibilityProjection,
  buildAssessmentSnapshot,
  canCompleteWithDiagnosticEvidence,
  collectUserEvidence,
  createIdleAssessmentState,
  isAssessmentSlotsComplete,
  mapAssessmentSnapshotToLivingProfile,
  markSlotAsAsking,
  reduceAssessmentLifecycle,
  resolveAssessmentTurnSlot,
  startAssessmentLifecycle,
  synthesizeDiagnosis,
  ASSESSMENT_REQUIRED_SLOTS,
} from "./assessment-lifecycle.ts";
import {
  buildAssessmentClosingSpeechInstructions,
  buildAssessmentSystemInstructions,
  buildAssessmentTurnInstructions,
  looksLikeCompleteAssessmentClosing,
} from "./assessment-prompt.ts";

function fillUser(state, slotId, text) {
  const base = markSlotAsAsking(
    {
      ...state,
      consented: true,
      assessmentMode: true,
      assessmentStatus: "active",
    },
    slotId
  );
  const accepted = acceptAnswer(base, text, { slotId });
  assert.equal(accepted.ok, true, `${slotId}: ${text}`);
  return accepted.state;
}

test("1. severe high-friction / I don't know → not stored as goal", () => {
  assert.equal(
    isGenericAssessmentSlotAnswer(
      "skill_to_improve",
      "I don't know what to say really"
    ),
    true
  );
  const started = startAssessmentLifecycle();
  const base = markSlotAsAsking({ ...started, consented: true }, "skill_to_improve");
  const rejected = acceptAnswer(base, "I don't know what to say really");
  assert.equal(rejected.ok, false);
  assert.equal(rejected.reason, "not_sufficient");
  assert.equal(rejected.state.slots.skill_to_improve.answer, null);
  assert.equal(rejected.state.currentSlot, "skill_to_improve");

  const system = buildAssessmentSystemInstructions();
  assert.match(system, /recognition/i);
  assert.match(system, /I don't know/i);
  const turn = buildAssessmentTurnInstructions("skill_to_improve");
  assert.match(turn, /recognition/i);
});

test("2. word retrieval → diagnosis reflects retrieval friction", () => {
  let state = startAssessmentLifecycle();
  state = { ...state, consented: true };
  state = fillUser(
    state,
    "skill_to_improve",
    "I know what I mean but can't find the words when I speak"
  );
  state = fillUser(
    state,
    "where_it_shows_up",
    "Mostly in work meetings with my manager"
  );
  state = fillUser(
    state,
    "what_goes_wrong",
    "The words disappear even though the idea is clear"
  );
  state = fillUser(
    state,
    "six_week_success",
    "I want to be able to answer clearly without hunting for words"
  );
  state = fillUser(state, "practice_time", "About ten minutes each day");

  const evidence = collectUserEvidence(state.slots);
  const diagnosis = synthesizeDiagnosis(evidence);
  assert.equal(diagnosis.mechanismId, "verbal_retrieval");
  assert.match(diagnosis.primaryBottleneck, /words|thought|spontaneous/i);
  assert.doesNotMatch(diagnosis.primaryBottleneck, /communicate better/i);

  assert.equal(canCompleteWithDiagnosticEvidence(state), true);
  state = applyCompatibilityProjection(state);
  assert.equal(isAssessmentSlotsComplete(state), true);
  assert.equal(state.slots.behavior_to_change.source, "synthesized");
  assert.equal(state.slots.skill_to_improve.source, "user");
});

test("3. rambler / over-explainer → filtering / structure", () => {
  const evidence = {
    skill_to_improve: "I ramble and over-explain in meetings",
    where_it_shows_up: "Weekly team meetings at work",
    what_goes_wrong: "I add too much background before the point",
    six_week_success: "I want to get to the point faster",
    practice_time: "Fifteen minutes each day",
    recent_missed_conversation:
      "Yesterday in a meeting I spent five minutes on background before my point",
  };
  const diagnosis = synthesizeDiagnosis(evidence);
  assert.equal(diagnosis.mechanismId, "over_explaining");
  assert.match(diagnosis.primaryBottleneck, /over-explain|priorit/i);
});

test("4. freeze under authority → pressure / status mechanism", () => {
  const evidence = {
    skill_to_improve: "I freeze when my boss asks me something",
    where_it_shows_up: "In meetings with my manager at work",
    what_goes_wrong: "I go blank when put on the spot by my boss",
    six_week_success: "Answer clearly without freezing when my manager asks",
    practice_time: "Ten minutes per day",
    recent_missed_conversation:
      "Yesterday my manager asked a question and I completely blanked",
  };
  const diagnosis = synthesizeDiagnosis(evidence);
  assert.equal(diagnosis.mechanismId, "freeze_under_pressure");
  assert.match(diagnosis.primaryBottleneck, /freeze|spot|pressure/i);
  assert.match(diagnosis.contexts, /manager|work|spot/i);
});

test("5. everyday small talk → initiation — not generic confidence", () => {
  const evidence = {
    skill_to_improve: "I'm bad at small talk and joining in",
    where_it_shows_up: "Hallway conversations with coworkers at work",
    what_goes_wrong: "I don't know how to start and the moment passes",
    six_week_success: "I want to join small talk comfortably",
    practice_time: "Five minutes each day",
  };
  const diagnosis = synthesizeDiagnosis(evidence);
  assert.equal(diagnosis.mechanismId, "small_talk_initiation");
  assert.doesNotMatch(diagnosis.primaryBottleneck, /social confidence/i);
  assert.match(diagnosis.contexts, /small talk|Everyday|coworker|work/i);
});

test("6. competent professional → deeper questions allowed", () => {
  const system = buildAssessmentSystemInstructions();
  assert.match(system, /high_fluency/i);
  assert.match(system, /strategic/i);
  const turn = buildAssessmentTurnInstructions("what_goes_wrong");
  assert.match(turn, /fluent and specific/i);
  assert.match(turn, /Exactly ONE concrete question/i);
});

test("7. senior / executive → strategic questions when earned", () => {
  const system = buildAssessmentSystemInstructions();
  assert.match(system, /audience adaptation/i);
  assert.match(system, /unless the user has demonstrated that maturity/i);
  const evidence = {
    skill_to_improve:
      "I want to calibrate updates for skeptical executives and lead with what they need first",
    where_it_shows_up: "Leadership reviews with senior stakeholders at work",
    what_goes_wrong:
      "I over-explain detail before the decision ask when the audience is skeptical",
    six_week_success:
      "Lead with the audience need first and influence the room more cleanly",
    practice_time: "Twenty minutes each day",
    recent_missed_conversation:
      "Last week in a leadership review I buried the ask under background",
  };
  const diagnosis = synthesizeDiagnosis(evidence);
  assert.match(
    diagnosis.primaryBottleneck + diagnosis.supportingPatterns.join(" "),
    /point|explain|audience|priorit|frame|over-explain/i
  );
});

test("8. closing is complete and diagnosis-grounded", () => {
  const closing = buildAssessmentClosingSpeechInstructions();
  assert.match(closing, /Zero questions/i);
  assert.match(closing, /bottleneck|friction/i);
  assert.match(closing, /Do not invent/i);
  const sample =
    "I've got a clear starting point. It sounds like you often know what you want to say, but the words slow down when you feel put on the spot — especially at work. We'll train getting one clear thought out under that pressure.";
  assert.equal(looksLikeCompleteAssessmentClosing(sample), true);
});

test("9. profile synthesis — vague raw answers do not become the diagnosis", () => {
  let state = startAssessmentLifecycle();
  state = { ...state, consented: true };
  state = fillUser(
    state,
    "skill_to_improve",
    "I know what I mean but can't find the words in meetings"
  );
  state = fillUser(
    state,
    "where_it_shows_up",
    "Work meetings with coworkers and my manager"
  );
  state = fillUser(
    state,
    "what_goes_wrong",
    "Words disappear when I'm put on the spot"
  );
  state = fillUser(
    state,
    "six_week_success",
    "I want to answer clearly without freezing"
  );
  state = fillUser(state, "practice_time", "Ten minutes each day");
  state = applyCompatibilityProjection(state);
  const snap = buildAssessmentSnapshot(state, { sufficient: true });
  assert.ok(snap.diagnosis);
  assert.doesNotMatch(snap.diagnosis.primaryBottleneck, /^communicate better$/i);
  assert.doesNotMatch(
    snap.diagnosis.primaryBottleneck,
    /not knowing what to say/i
  );

  const mapped = mapAssessmentSnapshotToLivingProfile(snap, {
    purposeStatement: "",
  });
  assert.equal(mapped.ready, true);
  assert.match(mapped.goals[0], /words|thought|freeze|spot|spontaneous/i);
  const userOnly = collectUserEvidence(state.slots);
  assert.equal(userOnly.behavior_to_change, undefined);
});

test("10. regression — ownership, one question, completion/lock, consent", () => {
  const started = startAssessmentLifecycle();
  assert.equal(started.currentSlot, null);
  assert.equal(resolveAssessmentTurnSlot(started), null);

  let { state, effect } = reduceAssessmentLifecycle(createIdleAssessmentState(), {
    type: "START",
  });
  ({ state, effect } = reduceAssessmentLifecycle(state, {
    type: "USER_UTTERANCE",
    text: "yes",
  }));
  assert.equal(state.consented, true);
  assert.equal(state.currentSlot, "skill_to_improve");
  assert.equal(resolveAssessmentTurnSlot(state), "skill_to_improve");

  const turn = buildAssessmentTurnInstructions("skill_to_improve");
  assert.match(turn, /Exactly ONE concrete question/i);
  assert.match(turn, /COMPATIBILITY DESTINATION/i);

  const answers = {
    skill_to_improve: "I freeze when my boss asks me something in meetings",
    where_it_shows_up: "Work meetings with my manager",
    what_goes_wrong: "I go blank under pressure from my boss",
    behavior_to_change: "I want to stop freezing and answer directly",
    recent_missed_conversation:
      "Yesterday my manager asked a question and I blanked",
    six_week_success: "Answer clearly without freezing on the spot",
    practice_time: "Ten minutes each day",
  };
  for (const id of ASSESSMENT_REQUIRED_SLOTS) {
    if (state.assessmentStatus !== "active") break;
    ({ state, effect } = reduceAssessmentLifecycle(state, {
      type: "USER_UTTERANCE",
      text: answers[id],
    }));
  }
  assert.equal(state.assessmentStatus, "complete");
  assert.equal(state.responsesLocked, true);
  assert.equal(effect.type, "REQUEST_FINAL_RESPONSE");

  const system = buildAssessmentSystemInstructions();
  assert.match(system, /APPLICATION OWNS SLOT SELECTION/i);
  assert.equal(ASSESSMENT_REQUIRED_SLOTS.length, 7);
});
