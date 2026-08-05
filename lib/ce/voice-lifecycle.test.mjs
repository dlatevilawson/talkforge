import assert from "node:assert/strict";
import test from "node:test";

import {
  hasRegisteredLocalAudioCleanup,
  isCurrentVoiceLifecycle,
  registerLocalAudioCleanup,
  releaseLocalAudioStream,
} from "./voice-lifecycle.ts";

test("releaseLocalAudioStream stops tracks and runs silent cleanup once", () => {
  let stopCount = 0;
  let cleanupCount = 0;
  const stream = {
    getTracks: () => [
      { stop: () => (stopCount += 1) },
      { stop: () => (stopCount += 1) },
    ],
  };

  registerLocalAudioCleanup(stream, () => {
    cleanupCount += 1;
  });

  assert.equal(hasRegisteredLocalAudioCleanup(stream), true);
  releaseLocalAudioStream(stream);
  releaseLocalAudioStream(stream);

  assert.equal(stopCount, 4);
  assert.equal(cleanupCount, 1);
  assert.equal(hasRegisteredLocalAudioCleanup(stream), false);
});

test("microphone recovery is current only for the mounted matching lifecycle", () => {
  const connection = {};

  assert.equal(
    isCurrentVoiceLifecycle(true, connection, connection, 4, 4),
    true
  );
  assert.equal(
    isCurrentVoiceLifecycle(false, connection, connection, 4, 4),
    false,
    "unmount invalidates recovery"
  );
  assert.equal(
    isCurrentVoiceLifecycle(true, null, connection, 5, 4),
    false,
    "End invalidates recovery"
  );
  assert.equal(
    isCurrentVoiceLifecycle(true, {}, connection, 4, 4),
    false,
    "connection replacement invalidates recovery"
  );
});
