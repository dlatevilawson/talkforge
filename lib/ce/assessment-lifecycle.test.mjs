import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ASSESSMENT_MAX_FORGE_CONTENT_QUESTIONS,
  ASSESSMENT_MAX_SUBSTANTIVE_ANSWERS,
  ASSESSMENT_MIN_COVERED_CATEGORIES,
  ASSESSMENT_MIN_SUBSTANTIVE_ANSWERS,
  canRequestAssessmentClosingResponse,
  canRequestAssessmentModelResponse,
  createIdleAssessmentState,
  forgeTextLooksLikeContentQuestion,
  isExplicitAssessmentExit,
  reduceAssessmentLifecycle,
  startAssessmentLifecycle,
} from "./assessment-lifecycle.ts";
import {
  ASSESSMENT_CLOSING_LINE,
  buildAssessmentClosingSpeechInstructions,
  buildAssessmentSystemInstructions,
  buildAssessmentTurnInstructions,
} from "./assessment-prompt.ts";

function utter(state, text) {
  return reduceAssessmentLifecycle(state, { type: "USER_UTTERANCE", text });
}

describe("assessment lifecycle — start", () => {
  it("A. assessment starts correctly", () => {
    const idle = createIdleAssessmentState();
    assert.equal(idle.assessmentMode, false);
    assert.equal(idle.assessmentStatus, "idle");

    const started = startAssessmentLifecycle();
    assert.equal(started.assessmentMode, true);
    assert.equal(started.assessmentStatus, "active");
    assert.equal(started.responsesLocked, false);
    assert.equal(canRequestAssessmentModelResponse(started), true);
  });
});

describe("assessment lifecycle — multi-turn gather", () => {
  it("B. can gather multiple conversational turns without completing early", () => {
    let { state } = reduceAssessmentLifecycle(createIdleAssessmentState(), {
      type: "START",
    });
    ({ state } = utter(state, "yes"));
    assert.equal(state.consented, true);
    assert.equal(state.assessmentStatus, "active");

    ({ state } = utter(
      state,
      "I want to sound calmer when I present to leadership"
    ));
    ({ state } = utter(
      state,
      "I freeze in executive updates and lose my thread"
    ));
    assert.equal(state.assessmentStatus, "active");
    assert.ok(state.substantiveUserAnswers >= 2);
    assert.equal(canRequestAssessmentModelResponse(state), true);
  });
});

describe("assessment lifecycle — structural completion", () => {
  it("C. completion sets assessmentStatus = complete", () => {
    let { state, effect } = reduceAssessmentLifecycle(
      createIdleAssessmentState(),
      { type: "START" }
    );
    ({ state } = utter(state, "yes sure"));

    const answers = [
      "I want to be clearer and calmer in high-stakes meetings at work",
      "I freeze when my boss challenges me in front of the team",
      "I usually rush and then apologize which makes it worse",
      "I can practice about twenty minutes most evenings after work",
    ];
    for (const text of answers) {
      ({ state, effect } = utter(state, text));
    }

    assert.ok(
      state.substantiveUserAnswers >= ASSESSMENT_MIN_SUBSTANTIVE_ANSWERS
    );
    assert.equal(state.assessmentStatus, "complete");
    assert.equal(effect.type, "REQUEST_FINAL_RESPONSE");
    assert.equal(state.responsesLocked, true);
  });

  it("D/E. completion yields exactly one final response privilege then locks", () => {
    let { state, effect } = reduceAssessmentLifecycle(
      createIdleAssessmentState(),
      { type: "START" }
    );
    ({ state } = utter(state, "okay"));
    let sawFinalRequest = false;
    for (let i = 0; i < ASSESSMENT_MAX_SUBSTANTIVE_ANSWERS; i++) {
      ({ state, effect } = utter(
        state,
        `I struggle in meetings at work and want to become a calm clear leader number ${i + 1}`
      ));
      if (effect.type === "REQUEST_FINAL_RESPONSE") sawFinalRequest = true;
      if (state.assessmentStatus === "complete") break;
    }
    assert.equal(state.assessmentStatus, "complete");
    assert.equal(sawFinalRequest, true);
    assert.equal(canRequestAssessmentModelResponse(state), false);
    assert.equal(canRequestAssessmentClosingResponse(state), true);

    // Second BEGIN_CLOSING is a no-op — no second final request.
    ({ state, effect } = reduceAssessmentLifecycle(state, {
      type: "BEGIN_CLOSING",
    }));
    assert.equal(effect.type, "NONE");

    ({ state, effect } = reduceAssessmentLifecycle(state, {
      type: "FINAL_RESPONSE_DONE",
    }));
    assert.equal(effect.type, "NAVIGATE_RESULTS");
    assert.equal(state.finalResponseDelivered, true);
    assert.equal(canRequestAssessmentClosingResponse(state), false);

    // Further utterances / VAD-equivalent events cannot continue.
    ({ state, effect } = utter(state, "wait what about my plan?"));
    assert.equal(effect.type, "NONE");
    assert.equal(state.assessmentStatus, "complete");
    ({ state, effect } = reduceAssessmentLifecycle(state, {
      type: "FORGE_CONTENT_QUESTION_ASKED",
    }));
    assert.equal(effect.type, "NONE");
  });

  it("F. FINAL_RESPONSE_DONE transitions to results navigation effect", () => {
    let state = {
      ...startAssessmentLifecycle(),
      consented: true,
      assessmentStatus: "complete",
      finalResponseRequested: true,
      responsesLocked: true,
    };
    const done = reduceAssessmentLifecycle(state, {
      type: "FINAL_RESPONSE_DONE",
    });
    assert.equal(done.effect.type, "NAVIGATE_RESULTS");
  });
});

describe("assessment lifecycle — normal coach untouched", () => {
  it("G. idle/non-assessment state allows open-ended model responses", () => {
    const idle = createIdleAssessmentState();
    assert.equal(canRequestAssessmentModelResponse(idle), true);
    const afterUser = utter(idle, "Can we practice a hard conversation?");
    assert.equal(afterUser.state.assessmentMode, false);
    assert.equal(afterUser.effect.type, "NONE");
  });
});

describe("assessment lifecycle — exit", () => {
  it("H. explicit exit cancels without completing", () => {
    let { state, effect } = reduceAssessmentLifecycle(
      createIdleAssessmentState(),
      { type: "START" }
    );
    ({ state } = utter(state, "yes"));
    ({ state, effect } = utter(state, "I don't want to continue this assessment"));
    assert.equal(state.assessmentStatus, "cancelled");
    assert.equal(effect.type, "EXIT_TO_COACH");
    assert.equal(canRequestAssessmentModelResponse(state), false);
    assert.ok(isExplicitAssessmentExit("stop the assessment"));
    assert.equal(isExplicitAssessmentExit("um maybe?"), false);
  });
});

describe("assessment lifecycle — interruption / VAD safety", () => {
  it("I. interruption-like events do not mark complete", () => {
    let { state } = reduceAssessmentLifecycle(createIdleAssessmentState(), {
      type: "START",
    });
    ({ state } = utter(state, "yes"));
    ({ state } = utter(
      state,
      "I want to improve how I speak up in meetings at work"
    ));
    // No BEGIN_CLOSING from stray forge events without caps.
    assert.equal(state.assessmentStatus, "active");
    assert.equal(state.finalResponseRequested, false);
  });

  it("J. after completion, further speech/VAD-equivalent events do not restart", () => {
    let { state } = reduceAssessmentLifecycle(createIdleAssessmentState(), {
      type: "START",
    });
    ({ state } = utter(state, "sure"));
    for (let i = 0; i < ASSESSMENT_MAX_SUBSTANTIVE_ANSWERS; i++) {
      ({ state } = utter(
        state,
        `I freeze in tough talks at work and want calm clarity path ${i}`
      ));
    }
    assert.equal(state.assessmentStatus, "complete");
    const locked = state;
    const speech = utter(locked, "hello are you still there?");
    assert.equal(speech.state.assessmentStatus, "complete");
    assert.equal(speech.state.assessmentMode, true);
    assert.equal(canRequestAssessmentModelResponse(speech.state), false);
  });

  it("forge question cap can structurally complete", () => {
    let { state, effect } = reduceAssessmentLifecycle(
      createIdleAssessmentState(),
      { type: "START" }
    );
    ({ state } = utter(state, "yes"));
    ({ state } = utter(
      state,
      "I want better conversations with my partner at home"
    ));
    for (let i = 0; i < ASSESSMENT_MAX_FORGE_CONTENT_QUESTIONS; i++) {
      ({ state, effect } = reduceAssessmentLifecycle(state, {
        type: "FORGE_CONTENT_QUESTION_ASKED",
      }));
    }
    assert.equal(state.assessmentStatus, "complete");
    assert.equal(effect.type, "REQUEST_FINAL_RESPONSE");
  });
});

describe("assessment prompt — closing + app ownership", () => {
  it("closing instructions forbid follow-up questions", () => {
    const closing = buildAssessmentClosingSpeechInstructions();
    assert.ok(closing.includes(ASSESSMENT_CLOSING_LINE));
    assert.match(closing, /Zero questions/i);
    assert.match(closing, /structurally completed/i);
  });

  it("system prompt states app owns termination and conversational categories", () => {
    const system = buildAssessmentSystemInstructions();
    assert.match(system, /APPLICATION OWNS TERMINATION/i);
    assert.match(system, /Primary communication goal/i);
    assert.match(system, /Desired communication identity/i);
    assert.ok(system.includes(ASSESSMENT_CLOSING_LINE));
    assert.match(system, /must contain NO question/i);

    const turn = buildAssessmentTurnInstructions();
    assert.match(turn, /application owns when the assessment ends/i);
  });

  it("forgeTextLooksLikeContentQuestion ignores closing", () => {
    assert.equal(
      forgeTextLooksLikeContentQuestion(ASSESSMENT_CLOSING_LINE),
      false
    );
    assert.equal(
      forgeTextLooksLikeContentQuestion("Where does that show up for you?"),
      true
    );
  });
});

describe("assessment coverage helpers", () => {
  it("min covered categories constant is sane", () => {
    assert.ok(ASSESSMENT_MIN_COVERED_CATEGORIES >= 3);
    assert.ok(
      ASSESSMENT_MIN_SUBSTANTIVE_ANSWERS <= ASSESSMENT_MAX_SUBSTANTIVE_ANSWERS
    );
  });
});
