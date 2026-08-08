import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  envelopeCorrelation,
  isConfirmedTalkOverBargeIn,
  isLikelyForgeEcho,
} from "./echo-reference.ts";

describe("echo reference barge-in", () => {
  it("treats mic matching Forge speaker playback as echo, not barge-in", () => {
    const remoteHistory = [0.2, 0.35, 0.4, 0.38, 0.42, 0.36, 0.33, 0.4];
    const micHistory = remoteHistory.map((v) => v * 0.95);
    assert.equal(
      isLikelyForgeEcho({
        micLevel: 0.38,
        remoteLevel: 0.4,
        micHistory,
        remoteHistory,
      }),
      true
    );
    assert.equal(
      isConfirmedTalkOverBargeIn({
        micLevel: 0.38,
        remoteLevel: 0.4,
        sustainedMs: 400,
        modulation: 0.08,
        speechBandRatio: 0.5,
        micHistory,
        remoteHistory,
      }),
      false,
      "Forge hearing himself must not cancel"
    );
  });

  it("allows barge-in only when mic clearly talks over remote playback", () => {
    // Divergent envelopes: Forge steady/quiet-ish, user rises independently.
    const remoteHistory = [0.2, 0.22, 0.25, 0.21, 0.24, 0.23, 0.22, 0.2];
    const micHistory = [0.2, 0.25, 0.45, 0.55, 0.62, 0.58, 0.6, 0.59];
    assert.equal(
      isConfirmedTalkOverBargeIn({
        micLevel: 0.6,
        remoteLevel: 0.22,
        sustainedMs: 320,
        modulation: 0.09,
        speechBandRatio: 0.48,
        micHistory,
        remoteHistory,
      }),
      true
    );
  });

  it("never barges in while remote is silent (forge_thinking)", () => {
    assert.equal(
      isConfirmedTalkOverBargeIn({
        micLevel: 0.7,
        remoteLevel: 0.01,
        sustainedMs: 500,
        modulation: 0.1,
        speechBandRatio: 0.5,
        micHistory: [0.5, 0.6, 0.7, 0.65, 0.7, 0.68],
        remoteHistory: [0, 0, 0.01, 0, 0, 0],
      }),
      false
    );
  });

  it("rejects high-correlation bleed even when mic is relatively loud", () => {
    const remoteHistory = [0.3, 0.45, 0.5, 0.48, 0.52, 0.44, 0.4, 0.5];
    // Louder coupling, same shape — still echo on a loud speakerphone.
    const micHistory = remoteHistory.map((v) => Math.min(1, v * 1.2 + 0.05));
    assert.equal(
      isLikelyForgeEcho({
        micLevel: 0.65,
        remoteLevel: 0.5,
        micHistory,
        remoteHistory,
      }),
      true
    );
    assert.equal(
      isConfirmedTalkOverBargeIn({
        micLevel: 0.65,
        remoteLevel: 0.5,
        sustainedMs: 400,
        modulation: 0.08,
        speechBandRatio: 0.5,
        micHistory,
        remoteHistory,
      }),
      false
    );
  });

  it("correlation is high for scaled twin envelopes", () => {
    const a = [0.1, 0.2, 0.3, 0.25, 0.35, 0.4, 0.3, 0.2];
    const b = a.map((v) => v * 0.9);
    assert.ok(envelopeCorrelation(a, b) > 0.95);
  });
});
