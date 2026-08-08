import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isBenignRealtimeError,
  isConfirmedBargeInLevel,
  isForgeOutputEventType,
  outboundMicOpenForState,
  reduceTurnState,
} from "./handsfree-turntaking.ts";

describe("hands-free turn-taking regression", () => {
  it("1) Forge speaks without being cut off by server VAD / echo", () => {
    let s = /** @type {import('./handsfree-turntaking.ts').TurnState} */ (
      "listening"
    );
    s = reduceTurnState(s, {
      type: "FORGE_RESPONSE_CREATED",
    }).to;
    assert.equal(s, "forge_thinking");
    assert.equal(outboundMicOpenForState(s), false);

    s = reduceTurnState(s, { type: "FORGE_AUDIO_DELTA" }).to;
    assert.equal(s, "forge_speaking");
    assert.equal(outboundMicOpenForState(s), false);

    // Speaker echo often looks like speech_started — must NOT cancel.
    const echo = reduceTurnState(s, {
      type: "USER_SPEECH_STARTED",
      source: "server_vad",
    });
    assert.equal(echo.to, "forge_speaking");
    assert.equal(echo.cancelForge, false);
    assert.equal(echo.ignoreServerSpeechAsBargeIn, true);
  });

  it("2) Forge finishes and does NOT automatically respond again", () => {
    let s = /** @type {import('./handsfree-turntaking.ts').TurnState} */ (
      "forge_speaking"
    );
    const done = reduceTurnState(s, { type: "FORGE_RESPONSE_DONE" });
    assert.equal(done.to, "listening");
    assert.equal(done.cancelForge, false);
    assert.match(done.reason, /wait_for_new_member_utterance/);

    // Silence after Forge finishes does nothing (no synthetic response).
    const silence = reduceTurnState(done.to, { type: "LONG_SILENCE" });
    assert.equal(silence.to, "listening");
    assert.equal(silence.cancelForge, false);
    assert.match(silence.reason, /silence_after_forge_noop/);
  });

  it("3) User interrupts Forge → cancel once → listen → respond once", () => {
    let s = /** @type {import('./handsfree-turntaking.ts').TurnState} */ (
      "forge_speaking"
    );

    // Unconfirmed local energy (echo-like) must not cancel.
    const weak = isConfirmedBargeInLevel({
      level: 0.15,
      echoFloor: 0.12,
      sustainedMs: 50,
    });
    assert.equal(weak, false);

    const strong = isConfirmedBargeInLevel({
      level: 0.45,
      echoFloor: 0.12,
      sustainedMs: 200,
    });
    assert.equal(strong, true);

    const barge = reduceTurnState(s, {
      type: "CONFIRMED_BARGE_IN",
      level: 0.45,
    });
    assert.equal(barge.to, "interrupted");
    assert.equal(barge.cancelForge, true);
    assert.equal(barge.openOutboundMic, true);

    s = barge.to;
    // Member continues speaking after interrupt.
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
    assert.equal(stopped.cancelForge, false);

    // One Forge response cycle.
    s = reduceTurnState(stopped.to, { type: "FORGE_RESPONSE_CREATED" }).to;
    s = reduceTurnState(s, { type: "FORGE_AUDIO_DELTA" }).to;
    s = reduceTurnState(s, { type: "FORGE_RESPONSE_DONE" }).to;
    assert.equal(s, "listening");
  });

  it("4) Silence after Forge finishes does nothing", () => {
    const silence = reduceTurnState("listening", { type: "LONG_SILENCE" });
    assert.equal(silence.to, "listening");
    assert.equal(silence.cancelForge, false);
  });

  it("never treats input mic events as Forge output", () => {
    assert.equal(isForgeOutputEventType("input_audio_buffer.speech_started"), false);
    assert.equal(
      isForgeOutputEventType("conversation.item.input_audio_transcription.delta"),
      false
    );
    assert.equal(isForgeOutputEventType("response.output_audio.delta"), true);
    assert.equal(isForgeOutputEventType("response.created"), true);
  });

  it("treats response cancellation errors as benign", () => {
    assert.equal(
      isBenignRealtimeError({
        error: { code: "response_cancel_not_active", message: "Cancellation failed" },
      }),
      true
    );
    assert.equal(
      isBenignRealtimeError({
        error: { message: "WebRTC ice failed" },
      }),
      false
    );
  });
});
