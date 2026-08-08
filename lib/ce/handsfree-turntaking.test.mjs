import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  floorOwner,
  isBenignRealtimeError,
  isConfirmedBargeInLevel,
  isForgeOutputEventType,
  looksLikeEnvironmentalAudio,
  memberOwnsFloor,
  outboundMicOpenForState,
  reduceTurnState,
  shouldSurfaceRealtimeError,
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

    const silence = reduceTurnState(done.to, { type: "LONG_SILENCE" });
    assert.equal(silence.to, "listening");
    assert.equal(silence.cancelForge, false);
    assert.match(silence.reason, /silence_after_forge_noop/);
  });

  it("3) User interrupts Forge → cancel once → listen → respond once", () => {
    let s = /** @type {import('./handsfree-turntaking.ts').TurnState} */ (
      "forge_speaking"
    );

    const weak = isConfirmedBargeInLevel({
      level: 0.15,
      echoFloor: 0.12,
      sustainedMs: 50,
    });
    assert.equal(weak, false);

    const strong = isConfirmedBargeInLevel({
      level: 0.55,
      echoFloor: 0.12,
      sustainedMs: 240,
    });
    assert.equal(strong, true);

    const barge = reduceTurnState(s, {
      type: "CONFIRMED_BARGE_IN",
      level: 0.55,
    });
    assert.equal(barge.to, "interrupted");
    assert.equal(barge.cancelForge, true);
    assert.equal(barge.duckForgeAudio, true);
    assert.equal(barge.openOutboundMic, true);
    assert.equal(floorOwner(barge.to), "member");

    s = barge.to;
    // Cancelled response.done must NOT steal the floor back.
    const staleDone = reduceTurnState(s, { type: "FORGE_RESPONSE_DONE" });
    assert.equal(staleDone.to, "interrupted");
    assert.match(staleDone.reason, /member_owns_floor/);

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

  it("NATURAL OVERLAP ×10: yield once, no loop, one reply, never error-like", () => {
    for (let i = 0; i < 10; i += 1) {
      let s = /** @type {import('./handsfree-turntaking.ts').TurnState} */ (
        "listening"
      );
      s = reduceTurnState(s, { type: "FORGE_RESPONSE_CREATED" }).to;
      s = reduceTurnState(s, { type: "FORGE_AUDIO_DELTA" }).to;
      assert.equal(floorOwner(s), "forge");

      // Ambient / TV / cough — no yield.
      assert.equal(
        looksLikeEnvironmentalAudio({
          level: 0.14,
          echoFloor: 0.11,
          sustainedMs: 80,
        }),
        true
      );
      const ambient = reduceTurnState(s, {
        type: "USER_SPEECH_STARTED",
        source: "server_vad",
      });
      assert.equal(ambient.cancelForge, false);
      assert.equal(ambient.to, "forge_speaking");

      // Intentional overlap: "Wait, I want to explain something."
      const yieldFloor = reduceTurnState(s, {
        type: "CONFIRMED_BARGE_IN",
        level: 0.6,
      });
      assert.equal(yieldFloor.cancelForge, true);
      assert.equal(yieldFloor.duckForgeAudio, true);
      assert.equal(yieldFloor.to, "interrupted");
      assert.equal(memberOwnsFloor(yieldFloor.to), true);

      s = yieldFloor.to;
      // Stale forge events after cancel must not restart Forge.
      assert.equal(
        reduceTurnState(s, { type: "FORGE_AUDIO_DELTA" }).to,
        "interrupted"
      );
      assert.equal(
        reduceTurnState(s, { type: "FORGE_RESPONSE_CREATED" }).cancelForge,
        false
      );
      assert.equal(
        reduceTurnState(s, { type: "FORGE_RESPONSE_DONE" }).to,
        "interrupted"
      );

      s = reduceTurnState(s, {
        type: "USER_SPEECH_STARTED",
        source: "local_energy",
      }).to;
      assert.equal(s, "user_speaking");

      // Hesitation / short pause mid-thought is still member turn until speech_stopped.
      assert.equal(floorOwner(s), "member");

      const afterStop = reduceTurnState(s, {
        type: "USER_SPEECH_STOPPED",
        source: "server_vad",
      });
      assert.equal(afterStop.to, "forge_thinking");
      assert.equal(afterStop.cancelForge, false);

      s = afterStop.to;
      s = reduceTurnState(s, { type: "FORGE_RESPONSE_CREATED" }).to;
      s = reduceTurnState(s, { type: "FORGE_AUDIO_DELTA" }).to;
      s = reduceTurnState(s, { type: "FORGE_RESPONSE_DONE" }).to;
      assert.equal(s, "listening");
      assert.equal(floorOwner(s), "none");

      // Cancel errors must never look like connection failures.
      assert.equal(
        shouldSurfaceRealtimeError(
          { error: { code: "response_cancel_not_active", message: "cancelled" } },
          "interrupted",
          "connected"
        ),
        false
      );
      assert.equal(
        shouldSurfaceRealtimeError(
          { error: { message: "something odd" } },
          "user_speaking",
          "connected"
        ),
        false
      );
    }
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

  it("treats response cancellation as conversational, not a hitch", () => {
    assert.equal(
      isBenignRealtimeError({
        error: { code: "response_cancel_not_active", message: "Cancellation failed" },
      }),
      true
    );
    assert.equal(
      shouldSurfaceRealtimeError(
        { error: { message: "Cancellation failed" } },
        "forge_speaking",
        "connected"
      ),
      false
    );
    // Even unknown errors with healthy/unknown peer must never surface hitch UI.
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
    assert.equal(
      isBenignRealtimeError({
        error: { message: "WebRTC ice failed catastrophically" },
      }),
      false
    );
  });
});
