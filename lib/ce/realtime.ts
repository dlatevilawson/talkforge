import { buildSessionUpdateForTranscription } from "./session-config";

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
};

export type ConnectRealtimeOptions = {
  ephemeralKey: string;
  onServerEvent?: (event: Record<string, unknown>) => void;
  onConnectionState?: (state: RTCPeerConnectionState) => void;
  onMicMode?: (mode: "microphone" | "silent_fallback") => void;
  onRemoteTrack?: () => void;
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
    void remoteAudio.play().catch(() => {
      /* autoplay may require prior gesture — Start button provides it */
    });
  };

  pc.onconnectionstatechange = () => {
    options.onConnectionState?.(pc.connectionState);
  };

  const { stream: localStream, usedSilentMicFallback } =
    await acquireLocalAudioStream();
  options.onMicMode?.(usedSilentMicFallback ? "silent_fallback" : "microphone");
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

  if (!sdpResponse.ok) {
    const errText = await sdpResponse.text();
    cleanupPartial(pc, localStream, remoteAudio);
    throw new Error(
      `Realtime SDP exchange failed (${sdpResponse.status}): ${errText.slice(0, 200)}`
    );
  }

  const answerSdp = await sdpResponse.text();
  await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

  await waitForDataChannelOpen(dc, 10_000);

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
  };
}

/**
 * Prefer getUserMedia. If no device (common in CI/cloud VMs), create a muted
 * oscillator track so WebRTC + Forge audio-out still work for CE-M1 hello.
 */
async function acquireLocalAudioStream(): Promise<{
  stream: MediaStream;
  usedSilentMicFallback: boolean;
}> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
      },
    });
    return { stream, usedSilentMicFallback: false };
  } catch (err) {
    const name = err instanceof DOMException ? err.name : "";
    const retriable =
      name === "NotFoundError" ||
      name === "DevicesNotFoundError" ||
      name === "NotReadableError";
    if (!retriable) throw err;
    return {
      stream: createSilentAudioStream(),
      usedSilentMicFallback: true,
    };
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
  // Keep ctx alive for track lifetime; stopped in disconnect via track.stop().
  const stream = dest.stream;
  stream.getAudioTracks().forEach((track) => {
    track.addEventListener("ended", () => {
      void ctx.close().catch(() => undefined);
    });
  });
  return stream;
}

/** Ask the model to produce the opening interviewer turn (Forge speaks first). */
export function requestOpeningSpeech(dc: RTCDataChannel): void {
  if (dc.readyState !== "open") {
    throw new Error("Data channel not open — cannot request opening speech.");
  }

  dc.send(
    JSON.stringify({
      type: "response.create",
      response: {
        output_modalities: ["audio"],
        instructions:
          "Speak now as the interviewer. Greet the candidate briefly, say this is practice, and ask one short opening question. Do not coach.",
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
  for (const track of connection.localStream.getTracks()) {
    track.stop();
  }
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
  for (const track of localStream.getTracks()) {
    track.stop();
  }
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
