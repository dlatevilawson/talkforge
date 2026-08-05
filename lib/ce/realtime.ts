import { buildOpeningSpeechInstructions } from "@/lib/coach/philosophy";
import { buildSessionUpdateForTranscription } from "./session-config";
import {
  hasRegisteredLocalAudioCleanup,
  registerLocalAudioCleanup,
  releaseLocalAudioStream,
} from "./voice-lifecycle";
import { recordVoiceInitDiagnostic } from "./voice-init-debug";

/**
 * CE-M1/M2 WebRTC helpers for OpenAI Realtime.
 * Browser-only — do not import from server components.
 */

export type RealtimeConnection = {
  pc: RTCPeerConnection;
  dc: RTCDataChannel;
  localStream: MediaStream;
  remoteAudio: HTMLAudioElement;
  ephemeralKey: string;
  /** True when no physical mic — silent track used so Forge can still speak (CE-M1). */
  usedSilentMicFallback: boolean;
  micFallbackReason: MicFallbackReason | null;
};

export type MicFallbackReason =
  | "permission_denied"
  | "device_unavailable"
  | "device_busy"
  | "unsupported"
  | "unknown";

export type ConnectRealtimeOptions = {
  ephemeralKey: string;
  onServerEvent?: (event: Record<string, unknown>) => void;
  onConnectionState?: (state: RTCPeerConnectionState) => void;
  onMicMode?: (
    mode: "microphone" | "silent_fallback",
    reason: MicFallbackReason | null
  ) => void;
  onRemoteTrack?: () => void;
  onRemotePlayback?: (state: "playing" | "blocked") => void;
};

/**
 * Establish WebRTC peer connection to OpenAI Realtime using an ephemeral key.
 * Prefer real microphone; if unavailable, use a silent track so NPC audio can still play (CE-M1).
 * Call from a user gesture handler.
 */
export async function connectRealtime(
  options: ConnectRealtimeOptions
): Promise<RealtimeConnection> {
  const pc = new RTCPeerConnection();
  const remoteAudio = document.createElement("audio");
  remoteAudio.autoplay = true;
  remoteAudio.setAttribute("playsinline", "true");

  pc.ontrack = (event) => {
    remoteAudio.srcObject = event.streams[0] ?? null;
    options.onRemoteTrack?.();
    void remoteAudio
      .play()
      .then(
        () => ({ outcome: "played", errorName: null }),
        (error: unknown) => ({
          outcome: "blocked",
          errorName: error instanceof Error ? error.name : "UnknownError",
        })
      )
      .then((playResult) => {
        options.onRemotePlayback?.(
          playResult.outcome === "played" ? "playing" : "blocked"
        );
        // #region agent log
        recordVoiceInitDiagnostic({
          hypothesisId: "D",
          location: "lib/ce/realtime.ts:pc.ontrack",
          message: "Remote audio track and autoplay outcome",
          data: {
            streamCount: event.streams.length,
            audioTrackCount:
              event.streams[0]?.getAudioTracks().length ?? 0,
            autoplay: remoteAudio.autoplay,
            paused: remoteAudio.paused,
            ...playResult,
          },
          timestamp: Date.now(),
        });
        // #endregion
      });
  };

  pc.onconnectionstatechange = () => {
    options.onConnectionState?.(pc.connectionState);
  };

  const { stream: localStream, usedSilentMicFallback, micFallbackReason } =
    await acquireLocalAudioStream();
  options.onMicMode?.(
    usedSilentMicFallback ? "silent_fallback" : "microphone",
    micFallbackReason
  );
  for (const track of localStream.getTracks()) {
    pc.addTrack(track, localStream);
  }

  const dc = pc.createDataChannel("oai-events");
  dc.addEventListener("message", (messageEvent) => {
    try {
      const data = JSON.parse(String(messageEvent.data)) as Record<
        string,
        unknown
      >;
      options.onServerEvent?.(data);
    } catch {
      /* ignore non-JSON */
    }
  });

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  const sdpResponse = await fetch("https://api.openai.com/v1/realtime/calls", {
    method: "POST",
    body: offer.sdp ?? "",
    headers: {
      Authorization: `Bearer ${options.ephemeralKey}`,
      "Content-Type": "application/sdp",
    },
  });

  // #region agent log
  recordVoiceInitDiagnostic({
    hypothesisId: "C",
    location: "lib/ce/realtime.ts:connectRealtime:sdpResponse",
    message: "OpenAI SDP exchange response",
    data: {
      ok: sdpResponse.ok,
      status: sdpResponse.status,
      offerType: offer.type,
      offerLength: offer.sdp?.length ?? 0,
      signalingState: pc.signalingState,
      iceGatheringState: pc.iceGatheringState,
    },
    timestamp: Date.now(),
  });
  // #endregion

  if (!sdpResponse.ok) {
    const errText = await sdpResponse.text();
    cleanupPartial(pc, localStream, remoteAudio);
    throw new Error(
      `Realtime SDP exchange failed (${sdpResponse.status}): ${errText.slice(0, 200)}`
    );
  }

  const answerSdp = await sdpResponse.text();
  await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

  let dataChannelOutcome = "open";
  let dataChannelErrorName: string | null = null;
  try {
    await waitForDataChannelOpen(dc, 10_000);
  } catch (error) {
    dataChannelOutcome =
      error instanceof Error &&
      error.message === "Timed out waiting for Realtime data channel."
        ? "timeout"
        : "error";
    dataChannelErrorName =
      error instanceof Error ? error.name : "UnknownError";
    throw error;
  } finally {
    // #region agent log
    recordVoiceInitDiagnostic({
      hypothesisId: "B",
      location: "lib/ce/realtime.ts:connectRealtime:dataChannel",
      message: "Realtime peer and data channel outcome",
      data: {
        outcome: dataChannelOutcome,
        errorName: dataChannelErrorName,
        dataChannelState: dc.readyState,
        connectionState: pc.connectionState,
        iceConnectionState: pc.iceConnectionState,
        signalingState: pc.signalingState,
      },
      timestamp: Date.now(),
    });
    // #endregion
  }

  // CE-M2: reinforce input transcription on the live session
  try {
    dc.send(JSON.stringify(buildSessionUpdateForTranscription()));
  } catch {
    /* non-fatal — client_secrets already requested transcription */
  }

  return {
    pc,
    dc,
    localStream,
    remoteAudio,
    ephemeralKey: options.ephemeralKey,
    usedSilentMicFallback,
    micFallbackReason,
  };
}

/** Retry remote audio from an explicit member gesture after autoplay blocking. */
export async function resumeRemoteAudio(
  connection: RealtimeConnection
): Promise<boolean> {
  try {
    await connection.remoteAudio.play();
    return true;
  } catch {
    return false;
  }
}

/**
 * Prefer getUserMedia. If no device (common in CI/cloud VMs), create a muted
 * oscillator track so WebRTC + Forge audio-out still work for CE-M1 hello.
 */
async function acquireLocalAudioStream(): Promise<{
  stream: MediaStream;
  usedSilentMicFallback: boolean;
  micFallbackReason: MicFallbackReason | null;
}> {
  // #region agent log
  recordVoiceInitDiagnostic({
    hypothesisId: "A",
    location: "lib/ce/realtime.ts:acquireLocalAudioStream:entry",
    message: "Before microphone permission and capture request",
    data: {
      secureContext: window.isSecureContext,
      hasMediaDevices: Boolean(navigator.mediaDevices),
      hasGetUserMedia: Boolean(navigator.mediaDevices?.getUserMedia),
      visibilityState: document.visibilityState,
    },
    timestamp: Date.now(),
  });
  // #endregion

  let mediaOutcome: Record<string, unknown> = { outcome: "not_started" };
  try {
    const stream = await requestMicrophoneStream();
    const audioTracks = stream.getAudioTracks();
    mediaOutcome = {
      outcome: "microphone",
      trackCount: audioTracks.length,
      trackReadyStates: audioTracks.map((track) => track.readyState),
      tracksEnabled: audioTracks.map((track) => track.enabled),
      tracksMuted: audioTracks.map((track) => track.muted),
    };
    return {
      stream,
      usedSilentMicFallback: false,
      micFallbackReason: null,
    };
  } catch (err) {
    const name = err instanceof DOMException ? err.name : "";
    const micFallbackReason = classifyMicCaptureError(err);
    const retriable = micFallbackReason !== "unknown";
    mediaOutcome = {
      outcome: retriable ? "silent_fallback" : "rejected",
      errorName: name || (err instanceof Error ? err.name : "UnknownError"),
      retriable,
      reason: micFallbackReason,
    };
    if (!retriable) throw err;
    return {
      stream: createSilentAudioStream(),
      usedSilentMicFallback: true,
      micFallbackReason,
    };
  } finally {
    // #region agent log
    recordVoiceInitDiagnostic({
      hypothesisId: "A",
      location: "lib/ce/realtime.ts:acquireLocalAudioStream:outcome",
      message: "Microphone permission and capture outcome",
      data: mediaOutcome,
      timestamp: Date.now(),
    });
    // #endregion
  }
}

async function requestMicrophoneStream(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new DOMException(
      "Microphone capture is unavailable in this browser.",
      "NotSupportedError"
    );
  }
  return navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
    },
  });
}

export function classifyMicCaptureError(error: unknown): MicFallbackReason {
  const name =
    error instanceof DOMException
      ? error.name
      : error instanceof Error
        ? error.name
        : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "permission_denied";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "device_unavailable";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "device_busy";
  }
  if (
    name === "NotSupportedError" ||
    name === "SecurityError" ||
    name === "TypeError"
  ) {
    return "unsupported";
  }
  return "unknown";
}

export async function recoverMicrophone(
  connection: RealtimeConnection,
  isCurrent: () => boolean = () => true
): Promise<{
  recovered: boolean;
  reason: MicFallbackReason | null;
}> {
  let replacementStream: MediaStream | null = null;
  try {
    const candidate = await acquireLocalAudioStream();
    replacementStream = candidate.stream;
    // #region agent log
    recordVoiceInitDiagnostic({
      hypothesisId: "H",
      location: "lib/ce/realtime.ts:recoverMicrophone:candidate",
      message: "Microphone recovery candidate acquired",
      data: {
        current: isCurrent(),
        usedSilentMicFallback: candidate.usedSilentMicFallback,
        reason: candidate.micFallbackReason,
      },
      timestamp: Date.now(),
    });
    // #endregion
    if (!isCurrent()) {
      releaseLocalAudioStream(replacementStream);
      return { recovered: false, reason: connection.micFallbackReason };
    }
    if (candidate.usedSilentMicFallback) {
      releaseLocalAudioStream(replacementStream);
      connection.micFallbackReason = candidate.micFallbackReason;
      return {
        recovered: false,
        reason: candidate.micFallbackReason,
      };
    }

    const replacementTrack = replacementStream.getAudioTracks()[0];
    const sender = connection.pc
      .getSenders()
      .find((candidate) => candidate.track?.kind === "audio");
    if (!replacementTrack || !sender) {
      throw new DOMException(
        "No microphone track is available for this session.",
        "NotFoundError"
      );
    }

    replacementTrack.enabled = false;
    await sender.replaceTrack(replacementTrack);
    if (!isCurrent()) {
      releaseLocalAudioStream(replacementStream);
      return { recovered: false, reason: connection.micFallbackReason };
    }
    releaseLocalAudioStream(connection.localStream);
    connection.localStream = replacementStream;
    connection.usedSilentMicFallback = false;
    connection.micFallbackReason = null;
    return { recovered: true, reason: null };
  } catch (error) {
    if (replacementStream) releaseLocalAudioStream(replacementStream);
    const reason = classifyMicCaptureError(error);
    if (isCurrent()) connection.micFallbackReason = reason;
    return { recovered: false, reason };
  }
}

function createSilentAudioStream(): MediaStream {
  const AudioCtx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;
  const ctx = new AudioCtx();
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  const dest = ctx.createMediaStreamDestination();
  gain.gain.value = 0;
  oscillator.connect(gain);
  gain.connect(dest);
  oscillator.start();
  const stream = dest.stream;
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    try {
      oscillator.stop();
    } catch {
      /* already stopped */
    }
    oscillator.disconnect();
    gain.disconnect();
    const stateBeforeClose = ctx.state;
    void ctx.close().then(
      () => {
        // #region agent log
        recordVoiceInitDiagnostic({
          hypothesisId: "F",
          location: "lib/ce/realtime.ts:createSilentAudioStream:cleanup",
          message: "Silent AudioContext cleanup completed",
          data: {
            outcome: "closed",
            stateBeforeClose,
            stateAfterClose: ctx.state,
          },
          timestamp: Date.now(),
        });
        // #endregion
      },
      (error: unknown) => {
        // #region agent log
        recordVoiceInitDiagnostic({
          hypothesisId: "F",
          location: "lib/ce/realtime.ts:createSilentAudioStream:cleanup",
          message: "Silent AudioContext cleanup completed",
          data: {
            outcome: "failed",
            stateBeforeClose,
            stateAfterClose: ctx.state,
            errorName: error instanceof Error ? error.name : "UnknownError",
          },
          timestamp: Date.now(),
        });
        // #endregion
      }
    );
  };
  registerLocalAudioCleanup(stream, cleanup);
  stream.getAudioTracks().forEach((track) => {
    track.addEventListener("ended", cleanup, { once: true });
  });
  return stream;
}

/** Ask Forge to open with mentor pacing — understand first, never a topic menu. */
export function requestOpeningSpeech(
  dc: RTCDataChannel,
  welcomeHint?: string
): void {
  if (dc.readyState !== "open") {
    throw new Error("Data channel not open — cannot request opening speech.");
  }

  dc.send(
    JSON.stringify({
      type: "response.create",
      response: {
        output_modalities: ["audio"],
        instructions: buildOpeningSpeechInstructions(welcomeHint),
      },
    })
  );
}

/** Mute/unmute local mic tracks (push-to-talk). */
export function setMicrophoneEnabled(
  connection: RealtimeConnection | null,
  enabled: boolean
): void {
  if (!connection || connection.usedSilentMicFallback) return;
  for (const track of connection.localStream.getAudioTracks()) {
    track.enabled = enabled;
  }
}

export function disconnectRealtime(connection: RealtimeConnection | null): void {
  if (!connection) return;
  try {
    connection.dc.close();
  } catch {
    /* ignore */
  }
  try {
    connection.pc.close();
  } catch {
    /* ignore */
  }
  const hadSilentAudioCleanup = hasRegisteredLocalAudioCleanup(
    connection.localStream
  );
  releaseLocalAudioStream(connection.localStream);
  // #region agent log
  recordVoiceInitDiagnostic({
    hypothesisId: "F",
    location: "lib/ce/realtime.ts:disconnectRealtime:localAudio",
    message: "Local audio resources released",
    data: {
      hadSilentAudioCleanup,
      cleanupStillRegistered: hasRegisteredLocalAudioCleanup(
        connection.localStream
      ),
      trackStates: connection.localStream
        .getTracks()
        .map((track) => track.readyState),
    },
    timestamp: Date.now(),
  });
  // #endregion
  connection.remoteAudio.pause();
  connection.remoteAudio.srcObject = null;
}

function cleanupPartial(
  pc: RTCPeerConnection,
  localStream: MediaStream,
  remoteAudio: HTMLAudioElement
): void {
  try {
    pc.close();
  } catch {
    /* ignore */
  }
  releaseLocalAudioStream(localStream);
  remoteAudio.srcObject = null;
}

function waitForDataChannelOpen(
  dc: RTCDataChannel,
  timeoutMs: number
): Promise<void> {
  if (dc.readyState === "open") return Promise.resolve();

  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error("Timed out waiting for Realtime data channel."));
    }, timeoutMs);

    dc.addEventListener(
      "open",
      () => {
        window.clearTimeout(timer);
        resolve();
      },
      { once: true }
    );

    dc.addEventListener(
      "error",
      () => {
        window.clearTimeout(timer);
        reject(new Error("Realtime data channel error."));
      },
      { once: true }
    );
  });
}
