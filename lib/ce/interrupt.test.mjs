import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  canRecoverLivePeer,
  liveMicrophoneEnded,
  shouldReconnectAfterInterrupt,
  shouldSurfaceCallInterrupt,
} from "./interrupt.ts";

describe("Forge call interrupt detection", () => {
  it("ignores guest preview so the failed → error path stays intact", () => {
    assert.equal(
      shouldSurfaceCallInterrupt({
        isGuestPreview: true,
        phase: "speaking",
        peerState: "failed",
        micTrackEnded: true,
        watchdogExpired: true,
      }),
      null
    );
  });

  it("does not overlay idle, wrap, or error phases", () => {
    for (const phase of ["idle", "momentum", "error"]) {
      assert.equal(
        shouldSurfaceCallInterrupt({
          isGuestPreview: false,
          phase,
          peerState: "failed",
          micTrackEnded: true,
        }),
        null
      );
    }
  });

  it("surfaces continue for ended mic, failed peer, and watchdog", () => {
    assert.equal(
      shouldSurfaceCallInterrupt({
        isGuestPreview: false,
        phase: "speaking",
        micTrackEnded: true,
      }),
      "mic_ended"
    );
    assert.equal(
      shouldSurfaceCallInterrupt({
        isGuestPreview: false,
        phase: "listening",
        peerState: "failed",
        micTrackEnded: false,
      }),
      "peer_failed"
    );
    assert.equal(
      shouldSurfaceCallInterrupt({
        isGuestPreview: false,
        phase: "speaking",
        peerState: "connected",
        micTrackEnded: false,
        watchdogExpired: true,
      }),
      "watchdog"
    );
  });

  it("surfaces continue for disconnected peers without treating them as a hard error", () => {
    assert.equal(
      shouldSurfaceCallInterrupt({
        isGuestPreview: false,
        phase: "speaking",
        peerState: "disconnected",
        micTrackEnded: false,
      }),
      "peer_disconnected"
    );
    assert.equal(
      shouldSurfaceCallInterrupt({
        isGuestPreview: false,
        phase: "listening",
        peerState: "closed",
        micTrackEnded: false,
      }),
      "peer_closed"
    );
  });

  it("treats disconnected as recoverable and failed/closed as reconnect", () => {
    assert.equal(canRecoverLivePeer("disconnected"), true);
    assert.equal(canRecoverLivePeer("connected"), true);
    assert.equal(canRecoverLivePeer("failed"), false);
    assert.equal(shouldReconnectAfterInterrupt("failed"), true);
    assert.equal(shouldReconnectAfterInterrupt("closed"), true);
    assert.equal(shouldReconnectAfterInterrupt("disconnected"), false);
  });

  it("treats missing or ended mic tracks as dead", () => {
    assert.equal(liveMicrophoneEnded(null), true);
    assert.equal(liveMicrophoneEnded({ getAudioTracks: () => [] }), true);
    assert.equal(
      liveMicrophoneEnded({
        getAudioTracks: () => [{ readyState: "ended" }],
      }),
      true
    );
    assert.equal(
      liveMicrophoneEnded({
        getAudioTracks: () => [{ readyState: "live" }],
      }),
      false
    );
  });
});
