import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ASSESSMENT_MAX_FORGE_CONTENT_QUESTIONS,
  ASSESSMENT_MAX_SUBSTANTIVE_ANSWERS,
  ASSESSMENT_MIN_COVERED_CATEGORIES,
  ASSESSMENT_MIN_SUBSTANTIVE_ANSWERS,
  ASSESSMENT_REQUIRED_SLOTS,
  ASSESSMENT_SLOT_ORDER,
  acceptAnswer,
  canRequestAssessmentClosingResponse,
  canRequestAssessmentModelResponse,
  createIdleAssessmentState,
  forgeTextLooksLikeContentQuestion,
  inferAssessmentCategories,
  isAssessmentSlotsComplete,
  isConsentOnlyUtterance,
  isExplicitAssessmentExit,
  isUsableAssessmentResultValue,
  looksLikeForgeAssessmentSoftClose,
  markSlotAsAsking,
  nextSlot,
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
    let sawFinalRequest = false;
    for (const text of answers) {
      ({ state, effect } = utter(state, text));
      if (effect.type === "REQUEST_FINAL_RESPONSE") sawFinalRequest = true;
      if (state.assessmentStatus === "complete") break;
    }

    assert.ok(
      state.substantiveUserAnswers >= ASSESSMENT_MIN_SUBSTANTIVE_ANSWERS
    );
    assert.equal(state.assessmentStatus, "complete");
    assert.equal(sawFinalRequest, true);
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

  it("system prompt states app owns termination and one-question diagnosis", () => {
    const system = buildAssessmentSystemInstructions();
    assert.match(system, /APPLICATION OWNS TERMINATION/i);
    assert.match(system, /ONE QUESTION PER TURN/i);
    assert.match(system, /skill_to_improve/i);
    assert.match(system, /NOT therapy/i);
    assert.ok(system.includes(ASSESSMENT_CLOSING_LINE));
    assert.match(system, /Zero questions/i);

    const turn = buildAssessmentTurnInstructions();
    assert.match(turn, /app owns when the assessment ends/i);
    assert.match(turn, /Exactly ONE concrete diagnostic question/i);
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
    assert.ok(ASSESSMENT_MIN_COVERED_CATEGORIES >= 2);
    assert.ok(
      ASSESSMENT_MIN_SUBSTANTIVE_ANSWERS <= ASSESSMENT_MAX_SUBSTANTIVE_ANSWERS
    );
    assert.ok(ASSESSMENT_MAX_FORGE_CONTENT_QUESTIONS <= 4);
  });
});

describe("assessment result capture quality", () => {
  it("never stores consent filler as primaryGoal", () => {
    for (const phrase of [
      "Yeah, sure, let's do it.",
      "Yeah, sure, let's do this.",
      "Yes",
      "Sure, go ahead",
    ]) {
      assert.equal(isConsentOnlyUtterance(phrase), true, phrase);
      assert.equal(isUsableAssessmentResultValue(phrase), false, phrase);
      let { state } = reduceAssessmentLifecycle(createIdleAssessmentState(), {
        type: "START",
      });
      ({ state } = utter(state, phrase));
      assert.equal(state.consented, true);
      assert.equal(state.result.primaryGoal, null);
      assert.equal(state.substantiveUserAnswers, 0);
    }
  });

  it("does not tag everyday life as practice capacity", () => {
    assert.equal(
      inferAssessmentCategories("Everyday life, every communication").includes(
        "practiceCapacity"
      ),
      false
    );
  });

  it("maps small-talk improvement to primaryGoal, not consent", () => {
    let { state } = reduceAssessmentLifecycle(createIdleAssessmentState(), {
      type: "START",
    });
    ({ state } = utter(state, "yes"));
    ({ state } = utter(state, "I want to get better with small talks."));
    assert.equal(state.result.primaryGoal, "I want to get better with small talks.");
    assert.notEqual(state.result.primaryGoal, "yes");
  });
});

describe("assessment slot primitives — Step 1 shadow state", () => {
  function consentedActiveState() {
    const started = startAssessmentLifecycle();
    return { ...started, consented: true };
  }

  function fillAllRequired(state) {
    let next = state;
    for (const id of ASSESSMENT_REQUIRED_SLOTS) {
      const accepted = acceptAnswer(next, `Substantive answer for ${id} slot here.`, {
        slotId: id,
      });
      assert.equal(accepted.ok, true, id);
      next = accepted.state;
    }
    return next;
  }

  it("A. initial state has pending slots and null currentSlot", () => {
    const idle = createIdleAssessmentState();
    assert.equal(idle.currentSlot, null);
    assert.ok(idle.slots);
    for (const id of ASSESSMENT_REQUIRED_SLOTS) {
      assert.equal(idle.slots[id].status, "pending");
      assert.equal(idle.slots[id].answer, null);
      assert.equal(idle.slots[id].id, id);
    }
    assert.deepEqual([...ASSESSMENT_SLOT_ORDER], [...ASSESSMENT_REQUIRED_SLOTS]);

    const started = startAssessmentLifecycle();
    assert.equal(started.currentSlot, null);
    assert.equal(started.slots.skill_to_improve.status, "pending");
  });

  it("B. nextSlot consent/active/current/skip rules", () => {
    const started = startAssessmentLifecycle();
    assert.equal(nextSlot(started), null);

    const consented = consentedActiveState();
    assert.equal(nextSlot(consented), "skill_to_improve");

    const asking = markSlotAsAsking(consented, "where_it_shows_up");
    assert.equal(nextSlot(asking), "where_it_shows_up");

    let filledFirst = {
      ...consented,
      slots: {
        ...consented.slots,
        skill_to_improve: {
          id: "skill_to_improve",
          status: "filled",
          answer: "I want to be clearer in meetings.",
        },
      },
      currentSlot: null,
    };
    assert.equal(nextSlot(filledFirst), "where_it_shows_up");

    filledFirst = {
      ...filledFirst,
      slots: {
        ...filledFirst.slots,
        where_it_shows_up: {
          id: "where_it_shows_up",
          status: "skipped",
          answer: null,
        },
      },
    };
    assert.equal(nextSlot(filledFirst), "what_goes_wrong");

    const allFilled = fillAllRequired(consented);
    assert.equal(nextSlot(allFilled), null);
  });

  it("C. acceptAnswer happy path fills slot and advances currentSlot", () => {
    const base = markSlotAsAsking(consentedActiveState(), "skill_to_improve");
    const beforeSlots = base.slots;
    const beforeResult = base.result;
    const accepted = acceptAnswer(
      base,
      "  I want to get better at small talk in meetings.  "
    );
    assert.equal(accepted.ok, true);
    assert.equal(accepted.slotId, "skill_to_improve");
    assert.equal(
      accepted.answer,
      "I want to get better at small talk in meetings."
    );
    assert.equal(
      accepted.state.slots.skill_to_improve.status,
      "filled"
    );
    assert.equal(
      accepted.state.slots.skill_to_improve.answer,
      "I want to get better at small talk in meetings."
    );
    assert.equal(accepted.state.currentSlot, "where_it_shows_up");
    // Does not write legacy result/covered.
    assert.equal(accepted.state.result.primaryGoal, null);
    assert.equal(accepted.state.covered.primaryGoal, false);
    assert.equal(accepted.state.result, beforeResult);
    // Purity: input slots object not mutated.
    assert.equal(beforeSlots.skill_to_improve.status, "asking");
    assert.equal(beforeSlots.skill_to_improve.answer, null);
  });

  it("D. consent-only utterance is rejected without filling or consenting", () => {
    const base = consentedActiveState();
    const rejected = acceptAnswer(base, "Yeah, sure, let's do this.");
    assert.equal(rejected.ok, false);
    assert.equal(rejected.reason, "consent_only");
    assert.equal(rejected.state.slots.skill_to_improve.status, "pending");
    assert.equal(rejected.state.slots.skill_to_improve.answer, null);

    const unconsented = startAssessmentLifecycle();
    const noConsent = acceptAnswer(
      unconsented,
      "I want to get better at presenting to leadership teams."
    );
    assert.equal(noConsent.ok, false);
    assert.equal(noConsent.reason, "not_consented");
    assert.equal(noConsent.state.consented, false);
  });

  it("E. non-substantive answer is rejected", () => {
    const base = markSlotAsAsking(consentedActiveState(), "skill_to_improve");
    const rejected = acceptAnswer(base, "Not sure");
    assert.equal(rejected.ok, false);
    assert.equal(rejected.reason, "not_substantive");
    assert.equal(rejected.state.slots.skill_to_improve.status, "asking");
    assert.equal(rejected.state.currentSlot, "skill_to_improve");
  });

  it("F. confusion is rejected without filling slot", () => {
    const base = markSlotAsAsking(consentedActiveState(), "skill_to_improve");
    const rejected = acceptAnswer(base, "Why are you asking me all this?");
    assert.equal(rejected.ok, false);
    assert.equal(rejected.reason, "confusion");
    assert.equal(rejected.state.slots.skill_to_improve.status, "asking");
    assert.equal(rejected.state.slots.skill_to_improve.answer, null);
  });

  it("G. isAssessmentSlotsComplete requires consent + all required filled", () => {
    const consented = consentedActiveState();
    assert.equal(isAssessmentSlotsComplete(consented), false);

    const filled = fillAllRequired(consented);
    assert.equal(isAssessmentSlotsComplete(filled), true);

    const filledButNotConsented = { ...filled, consented: false };
    assert.equal(isAssessmentSlotsComplete(filledButNotConsented), false);

    const missingOne = acceptAnswer(
      consented,
      "I want to improve how I hold the floor in meetings.",
      { slotId: "skill_to_improve" }
    );
    assert.equal(missingOne.ok, true);
    assert.equal(isAssessmentSlotsComplete(missingOne.state), false);
  });

  it("H. helpers do not mutate the input state object", () => {
    const base = consentedActiveState();
    const snapshot = structuredClone(base);
    nextSlot(base);
    acceptAnswer(base, "Yeah, sure, let's do this.");
    acceptAnswer(base, "I want to improve how I speak in executive meetings.");
    markSlotAsAsking(base, "skill_to_improve");
    isAssessmentSlotsComplete(base);
    assert.deepEqual(base, snapshot);
  });

  it("reducer shadow path observes substantive answers without owning result", () => {
    let { state } = reduceAssessmentLifecycle(createIdleAssessmentState(), {
      type: "START",
    });
    ({ state } = utter(state, "yes"));
    ({ state } = utter(
      state,
      "I want to get better with small talks in everyday work meetings."
    ));
    // Step 2: shadow slots update; applyCategories still owns result.
    assert.equal(state.slots.skill_to_improve.status, "filled");
    assert.equal(
      state.slots.skill_to_improve.answer,
      "I want to get better with small talks in everyday work meetings."
    );
    assert.equal(state.currentSlot, "where_it_shows_up");
    assert.equal(
      state.result.primaryGoal,
      "I want to get better with small talks in everyday work meetings."
    );
  });
});

describe("assessment slot shadow observation — Step 2", () => {
  it("a–c. substantive answer resolves currentSlot and acceptAnswer fills it", () => {
    let { state } = reduceAssessmentLifecycle(createIdleAssessmentState(), {
      type: "START",
    });
    ({ state } = utter(state, "yes"));
    assert.equal(state.consented, true);
    assert.equal(nextSlot(state), "skill_to_improve");

    const text =
      "I want to sound calmer and clearer when I present to leadership.";
    ({ state } = utter(state, text));

    assert.equal(state.slots.skill_to_improve.status, "filled");
    assert.equal(state.slots.skill_to_improve.answer, text);
    assert.equal(state.currentSlot, "where_it_shows_up");
    assert.equal(nextSlot(state), "where_it_shows_up");
  });

  it("d. rejected shadow answers do not mutate authoritative result/covered", () => {
    let { state } = reduceAssessmentLifecycle(createIdleAssessmentState(), {
      type: "START",
    });
    ({ state } = utter(state, "yes"));
    ({ state } = utter(
      state,
      "I want to get better at holding the floor in meetings at work."
    ));
    const resultSnapshot = structuredClone(state.result);
    const coveredSnapshot = structuredClone(state.covered);
    const slotsSnapshot = structuredClone(state.slots);

    // Confusion: authoritative path may still treat as substantive + applyCategories,
    // but shadow acceptAnswer rejects and must not change slots.
    ({ state } = utter(state, "Why are you asking me all of this right now?"));
    assert.deepEqual(state.slots, slotsSnapshot);
    // result/covered only change if applyCategories wrote — confusion has no
    // category keywords, so authoritative fields stay equal too.
    assert.deepEqual(state.result, resultSnapshot);
    assert.deepEqual(state.covered, coveredSnapshot);
  });

  it("d2. consent-only after consent does not advance shadow slots or result", () => {
    let { state } = reduceAssessmentLifecycle(createIdleAssessmentState(), {
      type: "START",
    });
    ({ state } = utter(state, "yes"));
    ({ state } = utter(
      state,
      "I want to improve how I speak up in difficult conversations."
    ));
    const afterFirst = structuredClone(state);

    ({ state } = utter(state, "Yeah, sure, let's do this."));
    assert.deepEqual(state.slots, afterFirst.slots);
    assert.deepEqual(state.result, afterFirst.result);
    assert.deepEqual(state.covered, afterFirst.covered);
    assert.equal(state.substantiveUserAnswers, afterFirst.substantiveUserAnswers);
  });

  it("e. applyCategories remains authoritative for result/covered", () => {
    let { state } = reduceAssessmentLifecycle(createIdleAssessmentState(), {
      type: "START",
    });
    ({ state } = utter(state, "yes"));
    const text =
      "I freeze in executive meetings and usually rush then apologize.";
    ({ state } = utter(state, text));

    // Keyword path still writes result (authoritative).
    assert.ok(
      state.result.difficultSituations === text ||
        state.result.communicationPatterns === text ||
        state.result.realWorldContext === text ||
        state.result.primaryGoal === text
    );
    assert.ok(
      state.covered.difficultSituations ||
        state.covered.communicationPatterns ||
        state.covered.realWorldContext ||
        state.covered.primaryGoal
    );
    // Shadow filled first slot in catalog order, independent of keyword hits.
    assert.equal(state.slots.skill_to_improve.status, "filled");
    assert.equal(state.slots.skill_to_improve.answer, text);
  });

  it("f. consent / confusion / non-substantive reducer behavior unchanged", () => {
    let { state, effect } = reduceAssessmentLifecycle(
      createIdleAssessmentState(),
      { type: "START" }
    );
    ({ state, effect } = utter(state, "yes"));
    assert.equal(state.consented, true);
    assert.equal(state.assessmentStatus, "active");
    assert.equal(effect.type, "NONE");
    assert.equal(state.slots.skill_to_improve.status, "pending");
    assert.equal(state.result.primaryGoal, null);

    ({ state, effect } = utter(state, "ok"));
    assert.equal(state.substantiveUserAnswers, 0);
    assert.equal(state.slots.skill_to_improve.status, "pending");
    assert.equal(effect.type, "NONE");

    ({ state } = utter(
      state,
      "I want to get better at finishing my point in tense meetings."
    ));
    assert.ok(state.substantiveUserAnswers >= 1);

    // Explicit exit still cancels (unchanged).
    ({ state, effect } = utter(state, "stop the assessment"));
    assert.equal(state.assessmentStatus, "cancelled");
    assert.equal(effect.type, "EXIT_TO_COACH");
  });

  it("shadow fills advance across turns while completion stays structural", () => {
    let { state, effect } = reduceAssessmentLifecycle(
      createIdleAssessmentState(),
      { type: "START" }
    );
    ({ state } = utter(state, "yes"));
    ({ state } = utter(
      state,
      "I want to be clearer when I speak with my leadership team."
    ));
    assert.equal(state.slots.skill_to_improve.status, "filled");
    assert.equal(state.currentSlot, "where_it_shows_up");

    ({ state, effect } = utter(
      state,
      "This shows up most in weekly executive meetings at work."
    ));
    assert.equal(state.slots.where_it_shows_up.status, "filled");
    assert.equal(state.currentSlot, "what_goes_wrong");
    // Completion still driven by structural predicate / counters, not slots.
    if (state.assessmentStatus === "complete") {
      assert.equal(effect.type, "REQUEST_FINAL_RESPONSE");
    } else {
      assert.equal(state.assessmentStatus, "active");
      assert.equal(isAssessmentSlotsComplete(state), false);
    }
  });
});

describe("assessment soft-close adoption", () => {
  it("detects Forge improvising an end line", () => {
    assert.equal(
      looksLikeForgeAssessmentSoftClose(
        "Thanks—that's all I need for now. If you want, we can pick this up later and decide what to focus on first."
      ),
      true
    );
    assert.equal(
      looksLikeForgeAssessmentSoftClose("Where does that show up at work?"),
      false
    );
  });

  it("soft-close completes and adopts in-flight closing — no second create", () => {
    let { state, effect } = reduceAssessmentLifecycle(
      createIdleAssessmentState(),
      { type: "START" }
    );
    ({ state } = utter(state, "yes"));
    ({ state } = utter(
      state,
      "I freeze in meetings at work and want to sound calmer"
    ));
    ({ state, effect } = reduceAssessmentLifecycle(state, {
      type: "FORGE_SOFT_CLOSE",
      text: "Thanks—that's all I need for now. We can pick this up later.",
    }));
    assert.equal(state.assessmentStatus, "complete");
    assert.equal(state.responsesLocked, true);
    assert.equal(effect.type, "ADOPT_IN_FLIGHT_CLOSING");
    assert.equal(canRequestAssessmentModelResponse(state), false);

    // Must not request another privileged closing create.
    ({ state, effect } = reduceAssessmentLifecycle(state, {
      type: "BEGIN_CLOSING",
    }));
    assert.equal(effect.type, "NONE");
  });
});
