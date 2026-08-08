import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  PRO_HANDSFREE_ENABLED,
  resolveArenaVoiceMode,
} from "./voice-mode.ts";

describe("arena voice mode gate", () => {
  it("forces hold-to-talk while hands-free is gated off", () => {
    assert.equal(PRO_HANDSFREE_ENABLED, false);
    assert.equal(resolveArenaVoiceMode({ planIsPro: true }), "hold");
    assert.equal(resolveArenaVoiceMode({ planIsPro: false }), "hold");
  });
});
