/**
 * Diagnostic Integrity v2 — behavioral cases (not exact prompt strings).
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
  maybeAdvanceTowardClosingGaps,
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
import { buildTrainingScenarios } from "./assessment-training-scenarios.ts";
import { scoreMechanismCandidates } from "./assessment-synthesis.ts";
import { extractAcceptedEvidenceFacts } from "./assessment-synthesis.ts";

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

test("prompt: four gateways are dimensions + difficulty ladder", () => {
  const system = buildAssessmentSystemInstructions();
  assert.match(system, /FOUR DIAGNOSTIC GATEWAYS/i);
  assert.match(system, /NOT four mandatory UI questions/i);
  assert.match(system, /QUESTION DIFFICULTY LADDER/i);
  assert.match(system, /open_recall/i);
  assert.match(system, /forced_comparison/i);
  assert.match(system, /INTERACTION SIGNALS/i);
  assert.match(system, /I can't remember/i);
  assert.match(system, /CRITICAL INVARIANT/i);
  const turn = buildAssessmentTurnInstructions("skill_to_improve");
  assert.match(turn, /difficulty ladder/i);
  assert.match(turn, /LOWER difficulty/i);
  assert.match(turn, /RAISE/i);
});

test("1. repeated I don't know → not stored; prompt lowers difficulty", () => {
  for (const text of [
    "I don't know",
    "I don't know what to say really",
    "I don't know honestly",
  ]) {
    assert.equal(
      isGenericAssessmentSlotAnswer("skill_to_improve", text),
      true,
      text
    );
  }
  const started = startAssessmentLifecycle();
  const base = markSlotAsAsking({ ...started, consented: true }, "skill_to_improve");
  const rejected = acceptAnswer(base, "I don't know");
  assert.equal(rejected.ok, false);
  assert.ok(
    rejected.reason === "not_sufficient" || rejected.reason === "not_substantive"
  );
  assert.equal(rejected.state.slots.skill_to_improve.answer, null);

  const turn = buildAssessmentTurnInstructions("skill_to_improve", {
    lastUserText: "I don't know",
    priorDifficulty: "open_recall",
  });
  assert.match(turn, /CRITICAL THIS TURN/i);
  assert.match(turn, /Stay on gateway/i);
  assert.match(turn, /concrete_recall|recognition|forced_comparison/i);
  assert.doesNotMatch(turn, /Preferred next wording[^"]*"Who are you usually talking to/i);
});

test("2. word retrieval vs idea-generation — writing helps → retrieval wins", () => {
  const evidence = {
    skill_to_improve:
      "I know what I want to say, but the words don't come quickly",
    where_it_shows_up: "Work meetings with my manager",
    what_goes_wrong:
      "If I write first it is much easier, but speaking live the words won't come",
    six_week_success: "I want to answer clearly without hunting for words",
    practice_time: "Ten minutes each day",
    recent_missed_conversation:
      "Yesterday my manager asked me something and I knew the answer but stalled on the words",
  };
  const diagnosis = synthesizeDiagnosis(evidence);
  assert.equal(diagnosis.mechanismId, "verbal_retrieval");
  assert.equal(diagnosis.diagnosticConfidence, "supported");
  assert.equal(diagnosis.uncertainty, null);
  assert.match(diagnosis.focusArea, /words|thought|spontaneous|retrieval/i);
  assert.doesNotMatch(diagnosis.focusArea, /^small talk$/i);
  assert.doesNotMatch(diagnosis.focusArea, /communicate better/i);

  const idea = diagnosis.competingMechanisms.find(
    (c) => c.id === "thought_organization"
  );
  if (idea) {
    assert.notEqual(idea.status, "supported");
  }
});

test("3. ambiguous retrieval vs idea-generation → uncertainty, not premature pick", () => {
  const evidence = {
    skill_to_improve: "Speaking gets hard when I'm put on the spot",
    where_it_shows_up: "Meetings at work",
    what_goes_wrong:
      "Sometimes I blank and sometimes I have too many thoughts at once — I'm not sure which",
    six_week_success: "I want to answer clearly in meetings",
    practice_time: "Ten minutes each day",
  };
  const diagnosis = synthesizeDiagnosis(evidence);
  assert.equal(diagnosis.mechanismId, null);
  assert.ok(diagnosis.uncertainty);
  assert.match(diagnosis.uncertainty, /retrieval|idea-generation|uncertain|distinguish/i);
  assert.doesNotMatch(diagnosis.focusArea, /^small talk$/i);

  const scenarios = buildTrainingScenarios(diagnosis);
  for (const s of scenarios) {
    assert.doesNotMatch(s.title, /\binterruption recovery\b|\bsaying no\b|\bexecutive presence\b/i);
    assert.doesNotMatch(s.mission, /\brecommend interruption\b|\bpractice saying no\b|\bcommand the room\b/i);
  }
});

test("4. pressure / inhibition freeze under authority", () => {
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
  assert.match(diagnosis.rootPattern, /freeze|spot|pressure|blank/i);
  assert.match(diagnosis.keyEnvironments, /manager|work|meeting/i);
});

test("5. structure / compression (over-explaining)", () => {
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
  assert.match(diagnosis.focusArea, /over-explain|priorit/i);
  const scenarios = buildTrainingScenarios(diagnosis);
  assert.ok(scenarios.length >= 1);
  assert.match(scenarios[0].mission, /point|compress|Lead/i);
  assert.ok(scenarios[0].evidenceRefs.length >= 1);
});

test("6. group-entry / timing difficulty", () => {
  const evidence = {
    skill_to_improve: "I miss my turn in group conversation",
    where_it_shows_up: "Team standups and group meetings at work",
    what_goes_wrong:
      "By the time I'm ready the topic has moved on and I join too late",
    six_week_success: "I want to enter earlier with one clear contribution",
    practice_time: "Ten minutes each day",
    recent_missed_conversation:
      "Last week in a group meeting I waited too long and the topic moved on",
  };
  const diagnosis = synthesizeDiagnosis(evidence);
  assert.equal(diagnosis.mechanismId, "group_timing_lag");
  assert.match(diagnosis.rootPattern, /topic|timing|group|turn/i);
});

test("7. high-fluency user — prompt allows strategic depth", () => {
  const system = buildAssessmentSystemInstructions();
  assert.match(system, /high_fluency/i);
  assert.match(system, /RAISE difficulty/i);
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
  assert.ok(
    diagnosis.mechanismId === "over_explaining" ||
      diagnosis.mechanismId === "audience_mismatch"
  );
  const scenarios = buildTrainingScenarios(diagnosis);
  assert.ok(scenarios.every((s) => s.evidenceRefs.length > 0));
});

test("8. I can't remember when asked for an example — never profile fact", () => {
  assert.equal(
    isGenericAssessmentSlotAnswer(
      "recent_missed_conversation",
      "I can't remember"
    ),
    true
  );
  const started = startAssessmentLifecycle();
  const base = markSlotAsAsking(
    { ...started, consented: true },
    "recent_missed_conversation"
  );
  const rejected = acceptAnswer(base, "I can't remember");
  assert.equal(rejected.ok, false);
  assert.equal(rejected.state.slots.recent_missed_conversation.answer, null);

  const diagnosis = synthesizeDiagnosis({
    skill_to_improve: "I freeze when asked unexpected questions at work",
    where_it_shows_up: "Work meetings",
    what_goes_wrong: "I go blank under pressure",
    recent_missed_conversation: "I can't remember",
    six_week_success: "Answer without freezing",
    practice_time: "Ten minutes each day",
  });
  assert.doesNotMatch(diagnosis.evidence, /i can't remember/i);
  assert.doesNotMatch(diagnosis.rootPattern, /i can't remember/i);
  assert.doesNotMatch(
    (diagnosis.keyEnvironments || "") + diagnosis.focusArea,
    /i can't remember/i
  );
  const mapped = mapAssessmentSnapshotToLivingProfile(
    {
      version: 1,
      answers: {
        skill_to_improve: diagnosis.focusArea,
        where_it_shows_up: diagnosis.keyEnvironments,
        what_goes_wrong: diagnosis.rootPattern,
        behavior_to_change: diagnosis.rootPattern,
        recent_missed_conversation: diagnosis.evidence,
        six_week_success: diagnosis.desiredOutcome,
        practice_time: diagnosis.dailyCommitment,
      },
      filledSlotIds: ASSESSMENT_REQUIRED_SLOTS.slice(),
      answerSources: Object.fromEntries(
        ASSESSMENT_REQUIRED_SLOTS.map((id) => [id, "user"])
      ),
      diagnosis,
      consented: true,
      sufficient: true,
      practiceSessionId: null,
      completedAt: "2026-08-14T00:00:00.000Z",
    },
    { purposeStatement: "" }
  );
  assert.ok(mapped.ready);
  for (const c of mapped.challenges ?? []) {
    assert.doesNotMatch(c, /i can't remember/i);
  }
});

test("9. aspiration 'get better at small talk' alone is never the diagnosis", () => {
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
  assert.doesNotMatch(diagnosis.focusArea, /^small talk$/i);
  assert.doesNotMatch(diagnosis.primaryBottleneck, /^small talk$/i);
  assert.ok(
    diagnosis.uncertainty ||
      /clarif|uncertain|mechanism/i.test(diagnosis.focusArea)
  );
});

test("10. small talk with mechanism → initiation, not confidence", () => {
  const evidence = {
    skill_to_improve: "I'm bad at small talk and joining in",
    where_it_shows_up: "Hallway conversations with coworkers at work",
    what_goes_wrong: "I don't know how to start and the moment passes",
    six_week_success: "I want to join small talk comfortably",
    practice_time: "Five minutes each day",
  };
  const diagnosis = synthesizeDiagnosis(evidence);
  assert.equal(diagnosis.mechanismId, "small_talk_initiation");
  assert.doesNotMatch(diagnosis.focusArea, /^small talk$/i);
  assert.doesNotMatch(diagnosis.focusArea, /social confidence/i);
});

test("11. scenario recommendations cannot contain unsupported targets", () => {
  const diagnosis = synthesizeDiagnosis({
    skill_to_improve:
      "I know what I mean but can't find the words when I speak",
    where_it_shows_up: "Mostly in work meetings with my manager",
    what_goes_wrong: "Writing is much easier than speaking on the spot",
    six_week_success: "Answer clearly without hunting for words",
    practice_time: "About ten minutes each day",
    recent_missed_conversation:
      "Yesterday my manager asked me a question and I stalled on the words",
  });
  assert.equal(diagnosis.diagnosticConfidence, "supported");
  const scenarios = buildTrainingScenarios(diagnosis);
  assert.ok(scenarios.length >= 1);
  for (const s of scenarios) {
    assert.doesNotMatch(
      `${s.title} ${s.mission}`,
      /interruption recovery|saying no|executive presence|command the room|get paid|own the call/i
    );
    assert.ok(s.evidenceRefs.length >= 1, "every scenario needs evidenceRefs");
  }
});

test("12. synthesized compatibility fields cannot become evidence", () => {
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
    "Writing is much easier than speaking on the spot"
  );
  state = fillUser(
    state,
    "six_week_success",
    "I want to answer clearly without freezing"
  );
  state = fillUser(state, "practice_time", "Ten minutes each day");
  state = fillUser(
    state,
    "recent_missed_conversation",
    "Yesterday my manager asked me something and I stalled on the words"
  );
  assert.equal(canCompleteWithDiagnosticEvidence(state), true);
  state = applyCompatibilityProjection(state);
  assert.equal(isAssessmentSlotsComplete(state), true);
  assert.ok(
    state.slots.behavior_to_change.source === "synthesized" ||
      state.slots.behavior_to_change.source === "user"
  );

  const userOnly = collectUserEvidence(state.slots);
  assert.equal(
    userOnly.behavior_to_change === undefined ||
      state.slots.behavior_to_change.source === "user",
    true
  );

  const snap = buildAssessmentSnapshot(state, { sufficient: true });
  assert.ok(snap.diagnosis);
  assert.equal(snap.diagnosis.diagnosticConfidence, "supported");
  const mapped = mapAssessmentSnapshotToLivingProfile(snap, {
    purposeStatement: "",
  });
  assert.equal(mapped.ready, true);
  assert.doesNotMatch(mapped.goals[0], /^communicate better$/i);
});

test("13. closing is complete and diagnosis-grounded", () => {
  const closing = buildAssessmentClosingSpeechInstructions();
  assert.match(closing, /Zero questions/i);
  assert.match(closing, /bottleneck|friction/i);
  assert.match(closing, /competing mechanisms|Do not invent/i);
  const sample =
    "I've got a clear starting point. It sounds like you often know what you want to say, but the words slow down when you feel put on the spot — especially at work. We'll train getting one clear thought out under that pressure.";
  assert.equal(looksLikeCompleteAssessmentClosing(sample), true);
});

test("14. regression — ownership, one question, completion/lock, consent", () => {
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
  assert.equal(ASSESSMENT_REQUIRED_SLOTS.length, 7);
});

test("15. competingMechanisms track support/refute/unresolved", () => {
  const evidence = {
    skill_to_improve: "I know what I mean but can't find the words",
    what_goes_wrong: "Writing first makes it easy; live the words don't come",
    where_it_shows_up: "Work meetings",
  };
  const facts = extractAcceptedEvidenceFacts(evidence);
  const candidates = scoreMechanismCandidates(evidence, facts);
  const retrieval = candidates.find((c) => c.id === "verbal_retrieval");
  assert.ok(retrieval);
  assert.equal(retrieval.status, "supported");
  assert.ok(retrieval.supportingEvidence.length >= 1);
});

test("16. close-path: after mechanism evidence, app steers to practice_time", () => {
  let state = startAssessmentLifecycle();
  state = fillUser(
    state,
    "skill_to_improve",
    "I overexplain and keep circling when I try to make a point in meetings"
  );
  state = fillUser(
    state,
    "where_it_shows_up",
    "Work meetings with my manager and coworkers"
  );
  state = fillUser(
    state,
    "what_goes_wrong",
    "I keep talking in circles and say what I mean is over and over"
  );
  state = {
    ...state,
    substantiveUserAnswers: 4,
    currentSlot: "recent_missed_conversation",
  };
  state = markSlotAsAsking(state, "recent_missed_conversation");

  const advanced = maybeAdvanceTowardClosingGaps(state);
  assert.equal(
    advanced.currentSlot,
    "six_week_success",
    "should jump past micro-example mining toward outcome/practice"
  );
  assert.equal(advanced.slots.six_week_success.status, "asking");

  // After outcome exists in coverage path, practice is next.
  state = fillUser(
    advanced,
    "six_week_success",
    "I want to get to the point clearly without circling"
  );
  const towardPractice = maybeAdvanceTowardClosingGaps({
    ...state,
    substantiveUserAnswers: 5,
  });
  assert.equal(towardPractice.currentSlot, "practice_time");
  assert.equal(towardPractice.slots.practice_time.status, "asking");
});

test("17. close-path turn instructions forbid more mechanism mining", () => {
  const system = buildAssessmentSystemInstructions();
  assert.match(system, /CLOSE-PATH PACING/i);
  assert.match(system, /STOP mining more phrase examples/i);

  const practiceTurn = buildAssessmentTurnInstructions("practice_time");
  assert.match(practiceTurn, /CLOSE-PATH TURN/i);
  assert.match(practiceTurn, /practice commitment/i);
  assert.doesNotMatch(practiceTurn, /Descend the difficulty ladder/i);
  assert.doesNotMatch(practiceTurn, /four internal gateways/i);

  const outcomeTurn = buildAssessmentTurnInstructions("six_week_success", {
    lastUserText: "I don't remember",
  });
  assert.match(outcomeTurn, /CLOSE-PATH TURN/i);
  assert.match(outcomeTurn, /do NOT restart mechanism probing/i);
});
