import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  handsFreeStateLabel,
  reduceHandsFreeState,
} from "./handsfree-fsm.ts";

describe("hands-free FSM", () => {
  it("moves idle → listening → user_speaking → processing → forge → listening", () => {
    let s = "idle";
    s = reduceHandsFreeState(s, { type: "SESSION_READY" });
    assert.equal(s, "listening");
    s = reduceHandsFreeState(s, { type: "USER_SPEECH_STARTED" });
    assert.equal(s, "user_speaking");
    s = reduceHandsFreeState(s, { type: "USER_SPEECH_STOPPED" });
    assert.equal(s, "processing");
    s = reduceHandsFreeState(s, { type: "FORGE_RESPONSE_STARTED" });
    assert.equal(s, "forge_speaking");
    s = reduceHandsFreeState(s, { type: "FORGE_RESPONSE_DONE" });
    assert.equal(s, "listening");
  });

  it("supports barge-in from forge_speaking", () => {
    let s = "forge_speaking";
    s = reduceHandsFreeState(s, { type: "BARGE_IN" });
    assert.equal(s, "user_speaking");
  });

  it("pauses on long silence and resumes on speech", () => {
    let s = "listening";
    s = reduceHandsFreeState(s, { type: "LONG_SILENCE" });
    assert.equal(s, "paused");
    s = reduceHandsFreeState(s, { type: "USER_SPEECH_STARTED" });
    assert.equal(s, "user_speaking");
  });

  it("labels are product-safe (no token language)", () => {
    for (const state of [
      "listening",
      "user_speaking",
      "processing",
      "forge_speaking",
      "paused",
      "ending",
    ]) {
      const label = handsFreeStateLabel(state);
      assert.ok(label);
      assert.doesNotMatch(label, /token|budget|meter|AI usage/i);
    }
  });
});
