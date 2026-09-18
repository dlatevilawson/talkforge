import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  admittedHandsFreeBargeLevel,
  HANDS_FREE_CONTINUATION_GRACE_MS,
  HANDS_FREE_LISTENING_ABSOLUTE_FLOOR,
  HANDS_FREE_LISTENING_AMBIENT_MULTIPLIER,
  HANDS_FREE_LISTENING_MIN_SUSTAIN_MS,
  HANDS_FREE_PLAYBACK_DRAIN_FALLBACK_MS,
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
  shouldAdmitHandsFreeTranscript,
  shouldOpenHandsFreeOutbound,
  shouldWaitForHandsFreePlaybackDrain,
  shouldSurfaceRealtimeError,
  speechBandRatioFromSpectrum,
} from "./handsfree-turntaking.ts";

describe("hands-free turn-taking regression", () => {
  it("uses bounded continuation and playback-drain windows", () => {
    assert.equal(HANDS_FREE_CONTINUATION_GRACE_MS, 1_800);
    assert.equal(HANDS_FREE_PLAYBACK_DRAIN_FALLBACK_MS, 600);
    assert.ok(
      HANDS_FREE_PLAYBACK_DRAIN_FALLBACK_MS <
        HANDS_FREE_CONTINUATION_GRACE_MS
    );
  });

  it("uses a sustained near-field gate before room audio can own a turn", () => {
    assert.equal(HANDS_FREE_LISTENING_ABSOLUTE_FLOOR, 0.28);
    assert.equal(HANDS_FREE_LISTENING_AMBIENT_MULTIPLIER, 3.8);
    assert.equal(HANDS_FREE_LISTENING_MIN_SUSTAIN_MS, 620);
  });

  it("rejects stray room-audio transcripts but preserves intentional replies", () => {
    assert.equal(
      shouldAdmitHandsFreeTranscript({
        text: "No shot.",
        locallyConfirmed: true,
      }),
      false
    );
    assert.equal(
      shouldAdmitHandsFreeTranscript({
        text: "Emocion",
        locallyConfirmed: true,
      }),
      false
    );
    assert.equal(
      shouldAdmitHandsFreeTranscript({
        text: "I want to explain the book",
        locallyConfirmed: true,
      }),
      true
    );
    assert.equal(
      shouldAdmitHandsFreeTranscript({ text: "yes", locallyConfirmed: true }),
      true
    );
    assert.equal(
      shouldAdmitHandsFreeTranscript({
        text: "I want to explain the book",
        locallyConfirmed: false,
      }),
      false
    );

    assert.equal(
      isIntentionalSpeechSignal({
        level: 0.62,
        ambientFloor: 0.08,
        sustainedMs: 320,
        modulation: 0.1,
        speechBandRatio: 0.54,
      }),
      true,
      "a close-mic short reply can still confirm the local turn"
    );
  });

  it("never cancels Forge from acoustics alone; admitted transcript is required", () => {
    assert.equal(
      admittedHandsFreeBargeLevel({
        state: "forge_speaking",
        pendingLevel: 0.72,
        transcriptAdmitted: false,
      }),
      null
    );
    assert.equal(
      admittedHandsFreeBargeLevel({
        state: "forge_speaking",
        pendingLevel: 0.72,
        transcriptAdmitted: true,
      }),
      0.72
    );
    assert.equal(
      admittedHandsFreeBargeLevel({
        state: "listening",
        pendingLevel: 0.72,
        transcriptAdmitted: true,
      }),
      null
    );
  });

  it("waits for speaker playout only on hands-free practice audio", () => {
    const base = {
      handsFree: true,
      isAssessment: false,
      sawForgeAudio: true,
      playbackStopped: false,
      state: "forge_speaking",
    };
    assert.equal(shouldWaitForHandsFreePlaybackDrain(base), true);
    assert.equal(
      shouldWaitForHandsFreePlaybackDrain({ ...base, playbackStopped: true }),
      false
    );
    assert.equal(
      shouldWaitForHandsFreePlaybackDrain({ ...base, isAssessment: true }),
      false
    );
    assert.equal(
      shouldWaitForHandsFreePlaybackDrain({ ...base, handsFree: false }),
      false
    );
    assert.equal(
      shouldWaitForHandsFreePlaybackDrain({ ...base, state: "listening" }),
      false
    );
  });

  it("1) Forge speaks without being cut off by server VAD / echo", () => {
    let s = /** @type {import('./handsfree-turntaking.ts').TurnState} */ (
      "listening"
    );
    assert.equal(outboundMicOpenForState(s), true);

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
    assert.equal(outboundMicOpenForState(done.to), true);
    assert.equal(
      done.openOutboundMic,
      true,
      "Listening must stream the next turn's opening words; auto-response is disabled"
    );
    assert.equal(
      reduceTurnState(done.to, { type: "LONG_SILENCE" }).cancelForge,
      false
    );
  });

  it("keeps outbound closed while Forge owns the phase even if state lags", () => {
    assert.equal(
      shouldOpenHandsFreeOutbound({
        muted: false,
        forgeOwnsFloor: true,
        state: "listening",
      }),
      false
    );
    assert.equal(
      shouldOpenHandsFreeOutbound({
        muted: false,
        forgeOwnsFloor: false,
        state: "listening",
      }),
      true
    );
    assert.equal(
      shouldOpenHandsFreeOutbound({
        muted: true,
        forgeOwnsFloor: false,
        state: "listening",
      }),
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

  it("4) Listening preserves the speech prefix without giving server VAD floor ownership", () => {
    assert.equal(outboundMicOpenForState("listening"), true);

    const serverNoise = reduceTurnState("listening", {
      type: "USER_SPEECH_STARTED",
      source: "server_vad",
    });
    assert.equal(serverNoise.to, "listening");
    assert.equal(serverNoise.openOutboundMic, true);
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
        sustainedMs: 700,
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
      assert.equal(outboundMicOpenForState(s), true);
    }
  });

  it("waits through a continuation grace and resumes the same member turn", () => {
    assert.equal(HANDS_FREE_CONTINUATION_GRACE_MS, 1_800);

    const paused = reduceTurnState("user_speaking", {
      type: "USER_SPEECH_PAUSED",
      source: "server_vad",
    });
    assert.equal(paused.to, "listening");
    assert.equal(paused.openOutboundMic, true);
    assert.match(paused.reason, /waiting_for_continuation/);

    const resumed = reduceTurnState(paused.to, {
      type: "USER_SPEECH_STARTED",
      source: "local_energy",
    });
    assert.equal(resumed.to, "user_speaking");
    assert.equal(resumed.openOutboundMic, true);

    const pausedAgain = reduceTurnState(resumed.to, {
      type: "USER_SPEECH_PAUSED",
      source: "server_vad",
    });
    const elapsed = reduceTurnState(pausedAgain.to, {
      type: "CONTINUATION_GRACE_ELAPSED",
    });
    assert.equal(elapsed.to, "forge_thinking");
    assert.equal(elapsed.openOutboundMic, false);
    assert.match(elapsed.reason, /after_continuation_grace/);
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
