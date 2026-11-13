import test from "node:test";
import assert from "node:assert/strict";
import { measureTimestampedSpeech, PAUSE_THRESHOLD_MS } from "./measurement.ts";

test("measures observed words, fillers, pace, and pauses from timestamps", () => {
  const result = measureTimestampedSpeech([
    { word: "I", startOffsetMs: 0, endOffsetMs: 400 },
    { word: "um", startOffsetMs: 2500, endOffsetMs: 2800 },
    { word: "will", startOffsetMs: 3000, endOffsetMs: 3400 },
  ], 6000);
  assert.ok(result);
  assert.equal(PAUSE_THRESHOLD_MS, 2000);
  assert.equal(result.fillerCount, 1);
  assert.equal(result.pauseCount, 1);
  assert.equal(result.pauseTotalMs, 2100);
  assert.equal(result.fillers[0].startOffsetMs, 2500);
  assert.equal(result.memberTalkTimePct, 100);
  assert.equal(result.paceWpm, 30);
});

test("returns null when there is no observed word timing", () => {
  assert.equal(measureTimestampedSpeech([], 5000), null);
});
