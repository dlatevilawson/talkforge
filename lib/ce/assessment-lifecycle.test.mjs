import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ASSESSMENT_CATEGORIES,
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
  resolveAssessmentTurnSlot,
  startAssessmentLifecycle,
} from "./assessment-lifecycle.ts";
import {
  ASSESSMENT_CLOSING_LINE,
  ASSESSMENT_SLOT_TURN_META,
  buildAssessmentClosingSpeechInstructions,
  buildAssessmentSystemInstructions,
  buildAssessmentTurnInstructions,
} from "./assessment-prompt.ts";

function utter(state, text) {
  return reduceAssessmentLifecycle(state, { type: "USER_UTTERANCE", text });
}

/** Step 5: successful close requires all required slots filled. */
function fillAllRequiredSlots(state) {
  let effect = { type: "NONE" };
  for (const id of ASSESSMENT_REQUIRED_SLOTS) {
    ({ state, effect } = utter(
      state,
      `Substantive diagnostic answer for ${id} with enough detail here.`
    ));
    if (state.assessmentStatus !== "active") break;
  }
  return { state, effect };
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
  it("C. completion sets assessmentStatus = complete when required slots fill", () => {
    let { state, effect } = reduceAssessmentLifecycle(
      createIdleAssessmentState(),
      { type: "START" }
    );
    ({ state } = utter(state, "yes sure"));

    // Step 5: required slots filled → successful close (not answer-count caps).
    ({ state, effect } = fillAllRequiredSlots(state));

    assert.equal(isAssessmentSlotsComplete(state), true);
    assert.equal(state.assessmentStatus, "complete");
    assert.equal(effect.type, "REQUEST_FINAL_RESPONSE");
    assert.equal(state.responsesLocked, true);
    // Covered stays empty — keyword path no longer writes it.
    assert.equal(
      ASSESSMENT_CATEGORIES.every((c) => state.covered[c] === false),
      true
    );
  });

  it("D/E. completion yields exactly one final response privilege then locks", () => {
    let { state, effect } = reduceAssessmentLifecycle(
      createIdleAssessmentState(),
      { type: "START" }
    );
    ({ state } = utter(state, "okay"));
    ({ state, effect } = fillAllRequiredSlots(state));
    assert.equal(state.assessmentStatus, "complete");
    assert.equal(effect.type, "REQUEST_FINAL_RESPONSE");
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
    ({ state } = fillAllRequiredSlots(state));
    assert.equal(state.assessmentStatus, "complete");
    const locked = state;
    const speech = utter(locked, "hello are you still there?");
    assert.equal(speech.state.assessmentStatus, "complete");
    assert.equal(speech.state.assessmentMode, true);
    assert.equal(canRequestAssessmentModelResponse(speech.state), false);
  });

  it("forge question cap hard-aborts instead of successful close", () => {
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
    assert.equal(state.assessmentStatus, "cancelled");
    assert.equal(effect.type, "EXIT_TO_COACH");
    assert.equal(isAssessmentSlotsComplete(state), false);
  });

  it("answer cap hard-aborts when required slots remain unfilled", () => {
    let { state, effect } = reduceAssessmentLifecycle(
      createIdleAssessmentState(),
      { type: "START" }
    );
    ({ state } = utter(state, "yes"));
    // Fill fewer than required, then keep answering until answer cap.
    for (let i = 0; i < ASSESSMENT_MAX_SUBSTANTIVE_ANSWERS; i++) {
      ({ state, effect } = utter(
        state,
        `Another substantive answer that does not finish all slots ${i + 1} xx`
      ));
      if (state.assessmentStatus !== "active") break;
    }
    // With 7 required slots, the 7th fill completes successfully before abort.
    // Force abort by pre-setting answer count near cap with slots incomplete:
    state = {
      ...startAssessmentLifecycle(),
      consented: true,
      currentSlot: "skill_to_improve",
      substantiveUserAnswers: ASSESSMENT_MAX_SUBSTANTIVE_ANSWERS - 1,
      slots: startAssessmentLifecycle().slots,
    };
    state = markSlotAsAsking(state, "skill_to_improve");
    ({ state, effect } = utter(
      state,
      "One more substantive answer that only fills the current slot here."
    ));
    assert.equal(state.slots.skill_to_improve.status, "filled");
    assert.equal(isAssessmentSlotsComplete(state), false);
    assert.equal(state.assessmentStatus, "cancelled");
    assert.equal(effect.type, "EXIT_TO_COACH");
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

    const turn = buildAssessmentTurnInstructions("skill_to_improve");
    assert.match(turn, /app owns when the assessment ends/i);
    assert.match(turn, /Exactly ONE concrete diagnostic question/i);
    assert.match(turn, /id: skill_to_improve/);
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
    // Hard-abort caps must exceed required slot count so success remains possible.
    assert.ok(
      ASSESSMENT_MAX_SUBSTANTIVE_ANSWERS > ASSESSMENT_REQUIRED_SLOTS.length
    );
    assert.ok(
      ASSESSMENT_MAX_FORGE_CONTENT_QUESTIONS > ASSESSMENT_REQUIRED_SLOTS.length
    );
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

  it("maps small-talk improvement into the current slot, not keyword result", () => {
    let { state } = reduceAssessmentLifecycle(createIdleAssessmentState(), {
      type: "START",
    });
    ({ state } = utter(state, "yes"));
    ({ state } = utter(state, "I want to get better with small talks."));
    // Step 4: applyCategories no longer writes result; slot accept owns the value.
    assert.equal(state.result.primaryGoal, null);
    assert.equal(state.slots.skill_to_improve.status, "filled");
    assert.equal(
      state.slots.skill_to_improve.answer,
      "I want to get better with small talks."
    );
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

  it("reducer path writes accepted slot answers; keyword result stays empty", () => {
    let { state } = reduceAssessmentLifecycle(createIdleAssessmentState(), {
      type: "START",
    });
    ({ state } = utter(state, "yes"));
    ({ state } = utter(
      state,
      "I want to get better with small talks in everyday work meetings."
    ));
    // Step 4: accepted slots are authoritative; applyCategories writes nothing.
    assert.equal(state.slots.skill_to_improve.status, "filled");
    assert.equal(
      state.slots.skill_to_improve.answer,
      "I want to get better with small talks in everyday work meetings."
    );
    assert.equal(state.currentSlot, "where_it_shows_up");
    assert.equal(state.result.primaryGoal, null);
    assert.equal(state.covered.primaryGoal, false);
  });
});

describe("assessment slot shadow observation — Step 2", () => {
  it("a–c. substantive answer resolves currentSlot and acceptAnswer fills it", () => {
    let { state } = reduceAssessmentLifecycle(createIdleAssessmentState(), {
      type: "START",
    });
    ({ state } = utter(state, "yes"));
    assert.equal(state.consented, true);
    assert.equal(state.currentSlot, "skill_to_improve");
    assert.equal(resolveAssessmentTurnSlot(state), "skill_to_improve");

    const text =
      "I want to sound calmer and clearer when I present to leadership.";
    ({ state } = utter(state, text));

    assert.equal(state.slots.skill_to_improve.status, "filled");
    assert.equal(state.slots.skill_to_improve.answer, text);
    assert.equal(state.currentSlot, "where_it_shows_up");
    assert.equal(resolveAssessmentTurnSlot(state), "where_it_shows_up");
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

  it("e. applyCategories no longer writes result/covered (Step 4)", () => {
    let { state } = reduceAssessmentLifecycle(createIdleAssessmentState(), {
      type: "START",
    });
    ({ state } = utter(state, "yes"));
    const text =
      "I freeze in executive meetings and usually rush then apologize.";
    ({ state } = utter(state, text));

    // Keyword path is a no-op for result/covered.
    assert.equal(state.result.difficultSituations, null);
    assert.equal(state.result.communicationPatterns, null);
    assert.equal(state.result.realWorldContext, null);
    assert.equal(state.result.primaryGoal, null);
    assert.equal(state.covered.difficultSituations, false);
    assert.equal(state.covered.communicationPatterns, false);
    assert.equal(state.covered.realWorldContext, false);
    assert.equal(state.covered.primaryGoal, false);
    // Accepted slot answer is the structured diagnostic value.
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
    // Step 3 corrective: consent explicitly marks first slot asking.
    assert.equal(state.slots.skill_to_improve.status, "asking");
    assert.equal(state.currentSlot, "skill_to_improve");
    assert.equal(state.result.primaryGoal, null);

    ({ state, effect } = utter(state, "ok"));
    assert.equal(state.substantiveUserAnswers, 0);
    // Non-substantive does not clear the established asking slot.
    assert.equal(state.slots.skill_to_improve.status, "asking");
    assert.equal(state.currentSlot, "skill_to_improve");
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

describe("assessment Forge turn slot injection — Step 3", () => {
  it("after consent, currentSlot is explicitly established via markSlotAsAsking", () => {
    let { state } = reduceAssessmentLifecycle(createIdleAssessmentState(), {
      type: "START",
    });
    assert.equal(state.currentSlot, null);
    assert.equal(resolveAssessmentTurnSlot(state), null);

    ({ state } = utter(state, "yes"));
    assert.equal(state.consented, true);
    assert.equal(state.currentSlot, "skill_to_improve");
    assert.equal(state.slots.skill_to_improve.status, "asking");
    assert.equal(resolveAssessmentTurnSlot(state), "skill_to_improve");

    let given = startAssessmentLifecycle();
    ({ state: given } = reduceAssessmentLifecycle(given, {
      type: "CONSENT_GIVEN",
    }));
    assert.equal(given.currentSlot, "skill_to_improve");
    assert.equal(given.slots.skill_to_improve.status, "asking");
  });

  it("resolveAssessmentTurnSlot returns only currentSlot — never nextSlot fallback", () => {
    const started = startAssessmentLifecycle();
    assert.equal(resolveAssessmentTurnSlot(started), null);

    // Consented but currentSlot left null — must NOT invent skill_to_improve.
    const consentedNoSlot = { ...started, consented: true, currentSlot: null };
    assert.equal(nextSlot(consentedNoSlot), "skill_to_improve");
    assert.equal(resolveAssessmentTurnSlot(consentedNoSlot), null);

    const asking = markSlotAsAsking(consentedNoSlot, "what_goes_wrong");
    assert.equal(resolveAssessmentTurnSlot(asking), "what_goes_wrong");
    assert.equal(resolveAssessmentTurnSlot(asking), asking.currentSlot);
  });

  it("Forge turn instructions receive lifecycle currentSlot; null is ACK-only", () => {
    for (const id of ASSESSMENT_SLOT_ORDER) {
      const turn = buildAssessmentTurnInstructions(id);
      assert.match(turn, /CURRENT ASSESSMENT SLOT/);
      assert.match(turn, new RegExp(`id: ${id}`));
      assert.ok(turn.includes(ASSESSMENT_SLOT_TURN_META[id].intent));
      assert.ok(
        turn.includes(ASSESSMENT_SLOT_TURN_META[id].suggestedWording)
      );
      assert.match(turn, /Ask ONLY this/i);
      assert.match(turn, /Do NOT choose another slot/i);
    }

    const nullTurn = buildAssessmentTurnInstructions(null);
    assert.match(nullTurn, /CURRENT ASSESSMENT SLOT: none provided/i);
    assert.match(nullTurn, /Speak only a brief ACK/i);
    assert.match(nullTurn, /Do NOT invent a diagnostic slot/i);
    assert.doesNotMatch(nullTurn, /id: skill_to_improve/);
  });

  it("prompt no longer authorizes the model to select the next slot", () => {
    const system = buildAssessmentSystemInstructions();
    assert.match(system, /APPLICATION OWNS SLOT SELECTION/i);
    assert.match(system, /Do NOT choose which slot to ask next/i);
    assert.doesNotMatch(system, /Track which of these you still need/i);
    assert.doesNotMatch(system, /Choose the next missing slot/i);
    assert.doesNotMatch(system, /ADAPTIVE DIAGNOSIS/i);

    const turn = buildAssessmentTurnInstructions("practice_time");
    assert.doesNotMatch(turn, /Pick the next uncovered diagnostic slot/i);
    assert.doesNotMatch(turn, /advance to the next missing/i);
    assert.match(turn, /you do not select slots/i);
    assert.match(turn, /id: practice_time/);
  });

  it("slot answers own structured values; completion predicate unchanged (Step 4)", () => {
    let { state, effect } = reduceAssessmentLifecycle(
      createIdleAssessmentState(),
      { type: "START" }
    );
    ({ state } = utter(state, "yes"));
    assert.equal(resolveAssessmentTurnSlot(state), "skill_to_improve");
    assert.equal(resolveAssessmentTurnSlot(state), state.currentSlot);

    ({ state, effect } = utter(
      state,
      "I want to sound calmer when I present to leadership at work"
    ));
    assert.equal(state.slots.skill_to_improve.status, "filled");
    assert.equal(state.result.primaryGoal, null);
    assert.equal(state.covered.primaryGoal, false);
    assert.equal(resolveAssessmentTurnSlot(state), state.currentSlot);
    // Completion predicate unchanged — still structural, not slot-complete.
    if (state.assessmentStatus === "complete") {
      assert.equal(effect.type, "REQUEST_FINAL_RESPONSE");
      assert.equal(isAssessmentSlotsComplete(state), false);
    } else {
      assert.equal(state.assessmentStatus, "active");
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
