import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  floorOwner,
  isBenignRealtimeError,
  isConfirmedBargeInLevel,
  isForgeOutputEventType,
  isIntentionalSpeechSignal,
  levelModulation,
  looksLikeEnvironmentalAudio,
  memberOwnsFloor,
  outboundMicOpenForState,
  reduceTurnState,
  shouldSurfaceRealtimeError,
  speechBandRatioFromSpectrum,
} from "./handsfree-turntaking.ts";

describe("hands-free turn-taking regression", () => {
  it("1) Forge speaks without being cut off by server VAD / echo", () => {
    let s = /** @type {import('./handsfree-turntaking.ts').TurnState} */ (
      "listening"
    );
    assert.equal(outboundMicOpenForState(s), false);

    s = reduceTurnState(s, { type: "FORGE_RESPONSE_CREATED" }).to;
    s = reduceTurnState(s, { type: "FORGE_AUDIO_DELTA" }).to;
    assert.equal(s, "forge_speaking");
    assert.equal(outboundMicOpenForState(s), false);

    const echo = reduceTurnState(s, {
      type: "USER_SPEECH_STARTED",
      source: "server_vad",
    });
    assert.equal(echo.to, "forge_speaking");
    assert.equal(echo.cancelForge, false);
  });

  it("2) Forge finishes and does NOT automatically respond again", () => {
    let s = /** @type {import('./handsfree-turntaking.ts').TurnState} */ (
      "forge_speaking"
    );
    const done = reduceTurnState(s, { type: "FORGE_RESPONSE_DONE" });
    assert.equal(done.to, "listening");
    assert.equal(outboundMicOpenForState(done.to), false);
    assert.equal(
      done.openOutboundMic,
      false,
      "Listening must stay outbound-muted — opening here feeds ambient into server VAD"
    );
    assert.equal(
      reduceTurnState(done.to, { type: "LONG_SILENCE" }).cancelForge,
      false
    );
  });

  it("2b) Ambient barge-in ignored while Listening; thinking allows intentional yield", () => {
    const ignored = reduceTurnState("listening", {
      type: "CONFIRMED_BARGE_IN",
      level: 0.9,
    });
    assert.equal(ignored.to, "listening");
    assert.equal(ignored.cancelForge, false);

    const pending = reduceTurnState("forge_thinking", {
      type: "CONFIRMED_BARGE_IN",
      level: 0.5,
    });
    assert.equal(pending.to, "interrupted");
    assert.equal(pending.cancelForge, true);
    assert.match(pending.reason, /pending_response_yield/);
  });

  it("3) User interrupts Forge → cancel once → listen → respond once", () => {
    let s = /** @type {import('./handsfree-turntaking.ts').TurnState} */ (
      "forge_speaking"
    );

    assert.equal(
      isConfirmedBargeInLevel({
        level: 0.15,
        echoFloor: 0.12,
        sustainedMs: 50,
        modulation: 0.01,
        speechBandRatio: 0.1,
      }),
      false
    );

    assert.equal(
      isConfirmedBargeInLevel({
        level: 0.55,
        echoFloor: 0.12,
        sustainedMs: 420,
        modulation: 0.08,
        speechBandRatio: 0.45,
      }),
      true
    );

    const barge = reduceTurnState(s, {
      type: "CONFIRMED_BARGE_IN",
      level: 0.55,
    });
    assert.equal(barge.to, "interrupted");
    assert.equal(barge.cancelForge, true);
    assert.equal(outboundMicOpenForState(barge.to), true);

    s = barge.to;
    assert.equal(
      reduceTurnState(s, { type: "FORGE_RESPONSE_DONE" }).to,
      "interrupted"
    );

    s = reduceTurnState(s, {
      type: "USER_SPEECH_STARTED",
      source: "local_energy",
    }).to;
    assert.equal(s, "user_speaking");

    const stopped = reduceTurnState(s, {
      type: "USER_SPEECH_STOPPED",
      source: "server_vad",
    });
    assert.equal(stopped.to, "forge_thinking");
    assert.equal(outboundMicOpenForState(stopped.to), false);

    s = reduceTurnState(stopped.to, { type: "FORGE_RESPONSE_CREATED" }).to;
    s = reduceTurnState(s, { type: "FORGE_AUDIO_DELTA" }).to;
    s = reduceTurnState(s, { type: "FORGE_RESPONSE_DONE" }).to;
    assert.equal(s, "listening");
  });

  it("4) Silence / ambient while listening does not open outbound", () => {
    assert.equal(outboundMicOpenForState("listening"), false);

    const serverNoise = reduceTurnState("listening", {
      type: "USER_SPEECH_STARTED",
      source: "server_vad",
    });
    assert.equal(serverNoise.to, "listening");
    assert.equal(serverNoise.openOutboundMic, false);
    assert.match(serverNoise.reason, /await_local_confirm/);

    assert.equal(
      isIntentionalSpeechSignal({
        level: 0.12,
        ambientFloor: 0.08,
        sustainedMs: 100,
        modulation: 0.01,
        speechBandRatio: 0.15,
      }),
      false,
      "steady ambient must not open a turn"
    );

    assert.equal(
      isIntentionalSpeechSignal({
        level: 0.45,
        ambientFloor: 0.08,
        sustainedMs: 500,
        modulation: 0.09,
        speechBandRatio: 0.5,
      }),
      true,
      "modulated voice-band energy opens a turn"
    );

    const opened = reduceTurnState("listening", {
      type: "USER_SPEECH_STARTED",
      source: "local_energy",
    });
    assert.equal(opened.to, "user_speaking");
    assert.equal(opened.openOutboundMic, true);
  });

  it("NATURAL OVERLAP ×10: yield once, no loop, one reply", () => {
    for (let i = 0; i < 10; i += 1) {
      let s = /** @type {import('./handsfree-turntaking.ts').TurnState} */ (
        "listening"
      );
      s = reduceTurnState(s, { type: "FORGE_RESPONSE_CREATED" }).to;
      s = reduceTurnState(s, { type: "FORGE_AUDIO_DELTA" }).to;

      assert.equal(
        looksLikeEnvironmentalAudio({
          level: 0.14,
          echoFloor: 0.11,
          sustainedMs: 80,
          modulation: 0.01,
          speechBandRatio: 0.12,
        }),
        true
      );

      const yieldFloor = reduceTurnState(s, {
        type: "CONFIRMED_BARGE_IN",
        level: 0.6,
      });
      assert.equal(yieldFloor.cancelForge, true);
      s = yieldFloor.to;
      assert.equal(memberOwnsFloor(s), true);
      assert.equal(
        reduceTurnState(s, { type: "FORGE_RESPONSE_DONE" }).to,
        "interrupted"
      );

      s = reduceTurnState(s, {
        type: "USER_SPEECH_STARTED",
        source: "local_energy",
      }).to;
      s = reduceTurnState(s, {
        type: "USER_SPEECH_STOPPED",
        source: "server_vad",
      }).to;
      s = reduceTurnState(s, { type: "FORGE_RESPONSE_CREATED" }).to;
      s = reduceTurnState(s, { type: "FORGE_AUDIO_DELTA" }).to;
      s = reduceTurnState(s, { type: "FORGE_RESPONSE_DONE" }).to;
      assert.equal(s, "listening");
      assert.equal(floorOwner(s), "none");
      assert.equal(outboundMicOpenForState(s), false);
    }
  });

  it("speech-shape helpers reject flat noise and accept voice-like energy", () => {
    assert.ok(levelModulation([0.1, 0.4, 0.2, 0.5, 0.15]) > 0.05);
    assert.ok(levelModulation([0.2, 0.2, 0.21, 0.19, 0.2]) < 0.02);

    const voiceish = new Array(128).fill(10);
    for (let i = 2; i <= 18; i += 1) voiceish[i] = 80;
    assert.ok(speechBandRatioFromSpectrum(voiceish) > 0.4);

    const hiss = new Array(128).fill(40);
    assert.ok(speechBandRatioFromSpectrum(hiss) < 0.25);
  });

  it("never treats input mic events as Forge output", () => {
    assert.equal(isForgeOutputEventType("input_audio_buffer.speech_started"), false);
    assert.equal(isForgeOutputEventType("response.output_audio.delta"), true);
  });

  it("never surfaces hitch UI from realtime API errors", () => {
    assert.equal(
      isBenignRealtimeError({
        error: { code: "response_cancel_not_active", message: "Cancellation failed" },
      }),
      true
    );
    assert.equal(
      shouldSurfaceRealtimeError(
        { error: { message: "mysterious realtime fault" } },
        "listening",
        "connected"
      ),
      false
    );
    assert.equal(
      shouldSurfaceRealtimeError(
        { error: { message: "mysterious realtime fault" } },
        "listening",
        null
      ),
      false
    );
  });
});
