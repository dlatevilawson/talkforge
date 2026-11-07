import test from "node:test";
import assert from "node:assert/strict";
import { attachWakeLockReleaseListener } from "./wake-lock.ts";

test("wake lock release listener is one-shot and observable", () => {
  let listener;
  const lock = { addEventListener(type, next, options) {
    assert.equal(type, "release");
    assert.deepEqual(options, { once: true });
    listener = next;
  }};
  let released = 0;
  attachWakeLockReleaseListener(lock, () => { released += 1; });
  listener();
  assert.equal(released, 1);
});
