import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ASSESSMENT_REQUIRED_SLOTS,
  assessmentCompletionCancelIsBenign,
  canRequestAssessmentModelResponse,
  decideAssessmentAfterUserUtterance,
  decideAssessmentClosingStrategy,
  decideAssessmentNavigate,
  decideAssessmentResponseCreated,
  decideAssessmentResponseDone,
  decideAssessmentUserTurnEnd,
  decideAssessmentVadEvent,
  isAssessmentTerminal,
  reduceAssessmentLifecycle,
  resolveRealtimeTurnDetection,
  startAssessmentLifecycle,
} from "./assessment-lifecycle.ts";
import {
  isBenignRealtimeError,
  shouldSurfaceRealtimeError,
} from "./handsfree-turntaking.ts";

function completeAssessment() {
  let { state, effect } = reduceAssessmentLifecycle(startAssessmentLifecycle(), {
    type: "START",
  });
  ({ state } = reduceAssessmentLifecycle(state, {
    type: "USER_UTTERANCE",
    text: "yes",
  }));
  // Step 5: successful close requires all required slots filled.
  for (const id of ASSESSMENT_REQUIRED_SLOTS) {
    ({ state, effect } = reduceAssessmentLifecycle(state, {
      type: "USER_UTTERANCE",
      text: `Substantive diagnostic answer for ${id} with enough detail here.`,
    }));
    if (state.assessmentStatus === "complete") break;
  }
  return { state, effect };
}

describe("TEST 1 — Normal assessment completion", () => {
  it("final answer completes, closing once, navigate once", () => {
    const { state, effect } = completeAssessment();
    assert.equal(state.assessmentStatus, "complete");
    assert.equal(state.responsesLocked, true);
    assert.equal(effect.type, "REQUEST_FINAL_RESPONSE");
    assert.equal(canRequestAssessmentModelResponse(state), false);

    assert.equal(
      decideAssessmentClosingStrategy({ closingSent: false, forgeBusy: false }),
      "send_now"
    );
    assert.equal(
      decideAssessmentClosingStrategy({ closingSent: true, forgeBusy: false }),
      "noop"
    );

    const done = decideAssessmentResponseDone(state, {
      closingSent: true,
      pendingClosingAfterDone: false,
      navigated: false,
    });
    assert.equal(done.action, "finalize");

    const { state: afterDone, effect: navEffect } = reduceAssessmentLifecycle(
      state,
      { type: "FINAL_RESPONSE_DONE" }
    );
    assert.equal(navEffect.type, "NAVIGATE_RESULTS");
    assert.equal(
      decideAssessmentNavigate({ navigated: false }, navEffect),
      "navigate"
    );
    assert.equal(
      decideAssessmentNavigate({ navigated: true }, navEffect),
      "none"
    );
    assert.equal(afterDone.finalResponseDelivered, true);
  });
});

describe("TEST 2 — Hands-free race", () => {
  it("turn-end after completion does not request a mid-turn", () => {
    const { state } = completeAssessment();
    const decision = decideAssessmentUserTurnEnd(state, { closingSent: false });
    assert.equal(decision.action, "request_closing");
    assert.notEqual(decision.action, "await_transcript");
  });

  it("deferred transcript path does not create mid-turn once complete", () => {
    const { state, effect } = completeAssessment();
    const after = decideAssessmentAfterUserUtterance(state, effect, {
      awaitingTranscriptForTurn: true,
      closingSent: false,
    });
    // REQUEST_FINAL_RESPONSE is owned by effect handler — no second create.
    assert.equal(after.action, "none");
  });
});

describe("TEST 3 — Background noise after completion", () => {
  it("speech_started / speech_stopped ignored when locked", () => {
    const { state } = completeAssessment();
    assert.equal(isAssessmentTerminal(state), true);
    assert.equal(decideAssessmentVadEvent(state), "ignore");
    assert.equal(canRequestAssessmentModelResponse(state), false);
  });
});

describe("soft-close coherence", () => {
  it("Forge soft-close locks responses so UI cannot stay on Your turn", () => {
    let { state, effect } = reduceAssessmentLifecycle(startAssessmentLifecycle(), {
      type: "START",
    });
    ({ state } = reduceAssessmentLifecycle(state, {
      type: "USER_UTTERANCE",
      text: "yes",
    }));
    ({ state, effect } = reduceAssessmentLifecycle(state, {
      type: "FORGE_SOFT_CLOSE",
      text: "Thanks—that's all I need for now. If you want, we can pick this up later.",
    }));
    assert.equal(effect.type, "ADOPT_IN_FLIGHT_CLOSING");
    assert.equal(state.assessmentStatus, "complete");
    assert.equal(decideAssessmentVadEvent(state), "ignore");
    assert.equal(
      decideAssessmentUserTurnEnd(state, { closingSent: true }).action,
      "ignore_terminal"
    );
  });
});

describe("TEST 4 — Cancel/closing race", () => {
  it("queues closing when forge busy instead of overlapping creates", () => {
    assert.equal(
      decideAssessmentClosingStrategy({ closingSent: false, forgeBusy: true }),
      "queue_after_done"
    );
    const { state } = completeAssessment();
    const done = decideAssessmentResponseDone(state, {
      closingSent: false,
      pendingClosingAfterDone: true,
      navigated: false,
    });
    assert.equal(done.action, "send_closing");

    // Second done after closing sent → finalize, not another closing.
    const finalize = decideAssessmentResponseDone(state, {
      closingSent: true,
      pendingClosingAfterDone: false,
      navigated: false,
    });
    assert.equal(finalize.action, "finalize");
  });

  it("stray response.created while locked is cancelled", () => {
    const { state } = completeAssessment();
    assert.equal(
      decideAssessmentResponseCreated(state, {
        closingSent: false,
        pendingClosingAfterDone: true,
      }).action,
      "cancel_stray"
    );
    assert.equal(
      decideAssessmentResponseCreated(state, {
        closingSent: true,
        pendingClosingAfterDone: false,
      }).action,
      "allow"
    );
  });
});

describe("TEST 5 — Echo after Forge speaks", () => {
  it("VAD after closing still ignored; no mid-turn reopen", () => {
    let { state } = completeAssessment();
    ({ state } = reduceAssessmentLifecycle(state, {
      type: "FINAL_RESPONSE_DONE",
    }));
    assert.equal(decideAssessmentVadEvent(state), "ignore");
    assert.equal(
      decideAssessmentUserTurnEnd(state, { closingSent: true }).action,
      "ignore_terminal"
    );
    assert.equal(
      decideAssessmentResponseCreated(state, {
        closingSent: true,
        pendingClosingAfterDone: false,
      }).action,
      "allow"
    );
  });
});

describe("TEST 6 — FINAL_RESPONSE_DONE navigates once", () => {
  it("duplicate FINAL_RESPONSE_DONE does not re-navigate", () => {
    let { state, effect } = completeAssessment();
    ({ state, effect } = reduceAssessmentLifecycle(state, {
      type: "FINAL_RESPONSE_DONE",
    }));
    assert.equal(effect.type, "NAVIGATE_RESULTS");
    assert.equal(
      decideAssessmentNavigate({ navigated: false }, effect),
      "navigate"
    );

    const second = reduceAssessmentLifecycle(state, {
      type: "FINAL_RESPONSE_DONE",
    });
    assert.equal(second.effect.type, "NONE");
    assert.equal(
      decideAssessmentNavigate({ navigated: true }, second.effect),
      "none"
    );
  });
});

describe("TEST 7 — Already locked", () => {
  it("later user/VAD events cannot reopen response path", () => {
    const { state } = completeAssessment();
    const utter = reduceAssessmentLifecycle(state, {
      type: "USER_UTTERANCE",
      text: "one more thing about my boss at work please",
    });
    assert.equal(utter.effect.type, "NONE");
    assert.equal(utter.state.assessmentStatus, "complete");
    assert.equal(decideAssessmentVadEvent(utter.state), "ignore");
    assert.equal(canRequestAssessmentModelResponse(utter.state), false);
  });
});

describe("TEST 8 — No false connection hitch from completion cancel", () => {
  it("cancel / active-response errors stay benign", () => {
    assert.equal(assessmentCompletionCancelIsBenign(), true);
    assert.equal(
      isBenignRealtimeError({
        error: { code: "response_cancel_not_active", message: "Cancellation failed" },
      }),
      true
    );
    assert.equal(
      shouldSurfaceRealtimeError(
        {
          error: {
            code: "conversation_already_has_active_response",
            message: "already has active response",
          },
        },
        "listening",
        "connected"
      ),
      false
    );
  });
});

describe("assessment mint — create_response ownership", () => {
  it("assessment mode forces create_response false even when handsFree", () => {
    assert.equal(
      resolveRealtimeTurnDetection({ mode: "assessment", handsFree: false })
        .create_response,
      false
    );
    assert.equal(
      resolveRealtimeTurnDetection({ mode: "assessment", handsFree: true })
        .create_response,
      false
    );
    assert.equal(
      resolveRealtimeTurnDetection({ mode: "practice", handsFree: true })
        .create_response,
      true
    );
  });
});

describe("active assessment still gathers turns", () => {
  it("user turn-end while active defers create until transcript", () => {
    let { state } = reduceAssessmentLifecycle(startAssessmentLifecycle(), {
      type: "START",
    });
    ({ state } = reduceAssessmentLifecycle(state, {
      type: "USER_UTTERANCE",
      text: "yes",
    }));
    assert.equal(
      decideAssessmentUserTurnEnd(state, { closingSent: false }).action,
      "await_transcript"
    );
    const after = decideAssessmentAfterUserUtterance(
      state,
      { type: "NONE" },
      { awaitingTranscriptForTurn: true, closingSent: false }
    );
    assert.equal(after.action, "request_mid_turn");
  });
});
