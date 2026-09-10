/**
 * Phone-call / OS audio interruption detection for signed-in Forge.
 * Guest preview keeps its own failed → error path and does not use this overlay.
 */

export const FORGE_INTERRUPT_DISCONNECT_GRACE_MS = 2_000;
export const FORGE_INTERRUPT_WATCHDOG_MS = 4_000;

export type ArenaInterruptReason =
  | "mic_ended"
  | "peer_disconnected"
  | "peer_failed"
  | "peer_closed"
  | "watchdog"
  | "visibility";

export function liveMicrophoneEnded(
  stream: Pick<MediaStream, "getAudioTracks"> | null | undefined
): boolean {
  if (!stream) return true;
  const tracks = stream.getAudioTracks();
  if (tracks.length === 0) return true;
  return tracks.every((track) => track.readyState === "ended");
}

export function shouldSurfaceCallInterrupt(input: {
  isGuestPreview: boolean;
  phase: string;
  peerState?: string | null;
  micTrackEnded: boolean;
  watchdogExpired?: boolean;
}): ArenaInterruptReason | null {
  if (input.isGuestPreview) return null;
  if (
    input.phase === "idle" ||
    input.phase === "momentum" ||
    input.phase === "error"
  ) {
    return null;
  }
  if (input.micTrackEnded) return "mic_ended";
  if (input.peerState === "failed") return "peer_failed";
  if (input.peerState === "closed") return "peer_closed";
  if (input.peerState === "disconnected") return "peer_disconnected";
  if (input.watchdogExpired) return "watchdog";
  return null;
}

/** Peer may still accept replaceTrack / resume audio. */
export function canRecoverLivePeer(peerState?: string | null): boolean {
  return (
    peerState === "connected" ||
    peerState === "connecting" ||
    peerState === "disconnected"
  );
}

export function shouldReconnectAfterInterrupt(peerState?: string | null): boolean {
  return (
    peerState === "failed" ||
    peerState === "closed" ||
    peerState == null
  );
}
