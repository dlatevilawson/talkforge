import test from "node:test";
import assert from "node:assert/strict";
import { hasTerminalReflectState, shouldPollSpeechMeasurement } from "./reflect-state.ts";

test("disabled speech measurement is terminal and does not poll", () => {
  assert.equal(shouldPollSpeechMeasurement({ hasAudio: true, measuredAt: null, disabled: true, attempts: 0 }), false);
  assert.equal(hasTerminalReflectState({ report: { coachSummary: "saved" }, memoryMatches: false, attempts: 8 }), true);
});

test("enabled speech measurement polls only within the bounded window", () => {
  assert.equal(shouldPollSpeechMeasurement({ hasAudio: true, measuredAt: null, disabled: false, attempts: 0 }), true);
  assert.equal(shouldPollSpeechMeasurement({ hasAudio: true, measuredAt: null, disabled: false, attempts: 8 }), false);
  assert.equal(shouldPollSpeechMeasurement({ hasAudio: true, measuredAt: "2026-11-17T01:16:00Z", disabled: false, attempts: 0 }), false);
});
