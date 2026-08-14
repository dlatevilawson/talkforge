/**
 * Behavioral tests for assessment interview questioning:
 * intro, same-gateway difficulty ladder, failed-recall signals, fluency raise.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { isGenericAssessmentSlotAnswer } from "./assessment-generic-answers.ts";
import {
  acceptAnswer,
  isExplicitAssessmentExit,
  markSlotAsAsking,
  startAssessmentLifecycle,
  synthesizeDiagnosis,
} from "./assessment-lifecycle.ts";
import {
  ASSESSMENT_DISENGAGEMENT_CHECK_IN,
  ASSESSMENT_GATEWAY_LADDERS,
  ASSESSMENT_INTRODUCTION,
  ASSESSMENT_OPENING_LINE,
  buildAssessmentOpeningSpeechInstructions,
  buildAssessmentSystemInstructions,
  buildAssessmentTurnInstructions,
  looksLikeFailedRecallSignal,
  looksLikeFluentDiagnosticAnswer,
  looksLikePrematureAssessmentAbandonment,
  recommendNextAssessmentQuestion,
  recommendNextQuestionDifficulty,
} from "./assessment-prompt.ts";

test("A. Forge introduces itself before diagnostic questioning", () => {
  const opening = buildAssessmentOpeningSpeechInstructions();
  const system = buildAssessmentSystemInstructions();

  assert.match(ASSESSMENT_INTRODUCTION, /I'?m Forge/i);
  assert.match(ASSESSMENT_INTRODUCTION, /communication coach/i);
  assert.match(ASSESSMENT_INTRODUCTION, /adapt/i);
  assert.match(ASSESSMENT_INTRODUCTION, /no right answers/i);
  assert.doesNotMatch(ASSESSMENT_INTRODUCTION, /gateway|discriminator|Path 1|diagnostic confidence/i);

  assert.ok(opening.includes(ASSESSMENT_INTRODUCTION));
  assert.ok(opening.includes(ASSESSMENT_OPENING_LINE));
  assert.match(opening, /introduce yourself/i);
  assert.match(opening, /Exactly one question mark/i);

  assert.ok(system.includes(ASSESSMENT_INTRODUCTION));
  assert.ok(system.includes(ASSESSMENT_OPENING_LINE));
  assert.match(system, /OPENING/i);
  assert.doesNotMatch(system, /No permission preamble[\s\S]*Say nearly verbatim: "When you're trying/);
});

test("B. Open question + I don't know → same gateway, lower cognitive burden", () => {
  const next = recommendNextAssessmentQuestion({
    slot: "skill_to_improve",
    lastUserText: "I don't know",
    priorDifficulty: "open_recall",
  });
  assert.equal(next.gateway, "processing_retrieval");
  assert.equal(next.stayOnSameGateway, true);
  assert.equal(next.forbidContextJump, true);
  assert.ok(
    next.difficulty === "concrete_recall" ||
      next.difficulty === "recognition" ||
      next.difficulty === "forced_comparison"
  );
  assert.notEqual(
    next.suggestedWording,
    ASSESSMENT_GATEWAY_LADDERS.processing_retrieval.open_recall
  );
  assert.doesNotMatch(next.suggestedWording, /Who are you usually talking to/i);

  const turn = buildAssessmentTurnInstructions("skill_to_improve", {
    lastUserText: "I don't know",
    priorDifficulty: "open_recall",
  });
  assert.match(turn, /CRITICAL THIS TURN/i);
  assert.match(turn, /SAME gateway|Stay on gateway/i);
  assert.match(turn, /Do NOT ask who\/where|FORBIDDEN THIS TURN: context jump/i);
  assert.doesNotMatch(turn, /Offer check-in nearly verbatim/);
  assert.match(turn, /DISENGAGEMENT: OFF THIS TURN/i);
});

test("C. Repeated failed recall progresses toward recognition / forced comparison", () => {
  let difficulty = recommendNextQuestionDifficulty("I don't know", "open_recall");
  assert.equal(difficulty, "concrete_recall");

  difficulty = recommendNextQuestionDifficulty("I'm not sure", difficulty);
  assert.equal(difficulty, "recognition");

  difficulty = recommendNextQuestionDifficulty("I can't remember", difficulty);
  assert.equal(difficulty, "forced_comparison");

  const forced = recommendNextAssessmentQuestion({
    slot: "skill_to_improve",
    lastUserText: "I can't remember",
    priorDifficulty: "recognition",
  });
  assert.equal(forced.difficulty, "forced_comparison");
  assert.equal(
    forced.suggestedWording,
    ASSESSMENT_GATEWAY_LADDERS.processing_retrieval.forced_comparison
  );
  assert.match(forced.suggestedWording, /write|yes or no/i);
  assert.doesNotMatch(forced.suggestedWording, /Who are you usually talking to/i);
});

test("D. I can't remember an example — not evidence; no abandonment language", () => {
  assert.equal(
    isGenericAssessmentSlotAnswer(
      "recent_missed_conversation",
      "I can't remember"
    ),
    true
  );
  assert.equal(looksLikeFailedRecallSignal("I can't remember an example"), true);

  const started = startAssessmentLifecycle();
  const base = markSlotAsAsking(
    { ...started, consented: true },
    "recent_missed_conversation"
  );
  const rejected = acceptAnswer(base, "I can't remember");
  assert.equal(rejected.ok, false);
  assert.equal(rejected.state.slots.recent_missed_conversation.answer, null);

  const turn = buildAssessmentTurnInstructions("recent_missed_conversation", {
    lastUserText: "I can't remember",
    priorDifficulty: "concrete_recall",
  });
  assert.match(turn, /DISENGAGEMENT: OFF THIS TURN/i);
  assert.doesNotMatch(turn, new RegExp(ASSESSMENT_DISENGAGEMENT_CHECK_IN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.equal(
    looksLikePrematureAssessmentAbandonment(
      "Sounds like these questions aren’t landing — want me to explain what this is for, or stop here for now?"
    ),
    true
  );
  assert.equal(
    looksLikePrematureAssessmentAbandonment(
      "Which sounds closer: you know what you want to say but can't find the words, or you're not sure yet?"
    ),
    false
  );

  const system = buildAssessmentSystemInstructions();
  assert.match(system, /Do NOT treat "I don't know".*as disengagement/i);
  assert.match(system, /do not abandon the assessment/i);
});

test("E. Retrieval distinction: words don't come + writing helps → retrieval", () => {
  const evidence = {
    skill_to_improve:
      "I know what I want to say, but the words don't come",
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
});

test("F. Ambiguous 'my mind goes blank' alone → discriminating contrast, not premature pick", () => {
  const diagnosis = synthesizeDiagnosis({
    skill_to_improve: "My mind goes blank",
    where_it_shows_up: "Meetings",
    what_goes_wrong: "My mind goes blank and I'm not sure why",
    six_week_success: "I want to answer clearly",
    practice_time: "Ten minutes each day",
  });
  // Alone, blanking should not invent certainty without discriminators.
  assert.ok(
    diagnosis.mechanismId === null ||
      diagnosis.uncertainty ||
      diagnosis.diagnosticConfidence !== "supported" ||
      (diagnosis.competingMechanisms?.length ?? 0) > 1
  );

  const turn = buildAssessmentTurnInstructions("what_goes_wrong", {
    lastUserText: "My mind goes blank",
    priorDifficulty: "open_recall",
  });
  assert.match(turn, /discriminating|recognition|forced_comparison|contrast/i);
  const system = buildAssessmentSystemInstructions();
  assert.match(
    system,
    /know what you want to say but can't find the words|thought itself hasn't formed/i
  );
});

test("G. High-fluency user → raise sophistication, do not force binary", () => {
  const fluent =
    "When I'm in leadership reviews I notice I bury the ask under background because I want skeptical executives to feel prepared, rather than leading with the decision they need first.";
  assert.equal(looksLikeFluentDiagnosticAnswer(fluent), true);
  assert.equal(recommendNextQuestionDifficulty(fluent, "recognition"), "concrete_recall");
  assert.equal(recommendNextQuestionDifficulty(fluent, "concrete_recall"), "open_recall");

  const turn = buildAssessmentTurnInstructions("skill_to_improve", {
    lastUserText: fluent,
    priorDifficulty: "recognition",
  });
  assert.match(turn, /RAISE sophistication|fluent\/specific/i);
  assert.match(turn, /Do NOT force a simplistic binary/i);

  const system = buildAssessmentSystemInstructions();
  assert.match(system, /high_fluency/i);
  assert.match(system, /do NOT force simplistic binaries/i);
});

test("H. Context may wait — unresolved mechanism discrimination overrides slot filling", () => {
  const system = buildAssessmentSystemInstructions();
  assert.match(
    system,
    /Do NOT fill a context slot while a high-value mechanism distinction is still unresolved/i
  );
  assert.match(
    system,
    /Context \(who\/where\) may be asked later when diagnostically useful/i
  );

  // After failed mechanism recall, even if destination is where_it_shows_up,
  // stay on the active gateway default for that slot but forbid context jump wording.
  const stuckOnContextSlot = buildAssessmentTurnInstructions("where_it_shows_up", {
    lastUserText: "I don't know",
    priorDifficulty: "open_recall",
    activeGateway: "processing_retrieval",
  });
  assert.match(stuckOnContextSlot, /Stay on gateway "processing_retrieval"/i);
  assert.match(stuckOnContextSlot, /FORBIDDEN THIS TURN: context jump/i);
  assert.ok(
    stuckOnContextSlot.includes(
      ASSESSMENT_GATEWAY_LADDERS.processing_retrieval.concrete_recall
    ) ||
      stuckOnContextSlot.includes(
        ASSESSMENT_GATEWAY_LADDERS.processing_retrieval.recognition
      )
  );
  assert.doesNotMatch(
    stuckOnContextSlot,
    /Preferred next wording[^"]*"Who are you usually talking to/i
  );
});

test("I. Explicit stop intent remains respected", () => {
  assert.equal(isExplicitAssessmentExit("stop the assessment"), true);
  assert.equal(isExplicitAssessmentExit("I don't know"), false);
  assert.equal(isExplicitAssessmentExit("I'm not sure"), false);
  assert.equal(isExplicitAssessmentExit("I can't remember"), false);

  const system = buildAssessmentSystemInstructions();
  assert.match(system, /Respect explicit stop\/end intent/i);
  // Disengagement check-in still exists for true process confusion.
  assert.ok(system.includes(ASSESSMENT_DISENGAGEMENT_CHECK_IN));
  const turnOk = buildAssessmentTurnInstructions("skill_to_improve", {
    lastUserText: "I freeze when my boss asks unexpected questions in meetings",
  });
  assert.ok(turnOk.includes(ASSESSMENT_DISENGAGEMENT_CHECK_IN));
});

test("J. Generic / vague answers remain signals, never accepted evidence", () => {
  for (const text of [
    "I don't know",
    "I'm not sure",
    "I can't remember",
    "communicate better",
    "get better at small talk",
  ]) {
    assert.equal(looksLikeFailedRecallSignal(text) || isGenericAssessmentSlotAnswer("skill_to_improve", text), true, text);
    if (
      text === "I don't know" ||
      text === "I'm not sure" ||
      text === "I can't remember"
    ) {
      assert.equal(looksLikeFailedRecallSignal(text), true, text);
    }
  }

  const started = startAssessmentLifecycle();
  const base = markSlotAsAsking(
    { ...started, consented: true },
    "skill_to_improve"
  );
  for (const text of ["I don't know", "I can't remember", "I'm not sure"]) {
    const rejected = acceptAnswer(base, text);
    assert.equal(rejected.ok, false, text);
    assert.equal(rejected.state.slots.skill_to_improve.answer, null, text);
  }

  const system = buildAssessmentSystemInstructions();
  assert.match(system, /INTERACTION SIGNALS — NEVER PROFILE FACTS/i);
  assert.match(system, /must NEVER become diagnosis claims/i);
});

test("prompt contract: critical invariant + four gateway canonical probes", () => {
  const system = buildAssessmentSystemInstructions();
  assert.match(system, /CRITICAL INVARIANT/i);
  assert.match(system, /OPEN RECALL → CONCRETE RECALL → RECOGNITION → FORCED COMPARISON/i);
  assert.match(system, /Processing & Retrieval/i);
  assert.match(system, /Pressure & Tension/i);
  assert.match(system, /Structure & Brevity/i);
  assert.match(system, /Audience Adaptation/i);
  assert.match(
    system,
    /explain an idea out loud on the spot|write or think it through first/i
  );
  assert.match(system, /never say these labels to the user/i);
  assert.doesNotMatch(system, /mandatory four-question script/i);
});
