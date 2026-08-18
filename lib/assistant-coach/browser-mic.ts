/**
 * Smallest browser mic recorder for public /coach.
 * Inspired by CE arena getUserMedia hardening, but intentionally
 * decoupled from VoiceArena / Realtime (Forge-only duplex path).
 */

export type CoachMicErrorCode =
  | "unsupported"
  | "permission_denied"
  | "not_found"
  | "in_use"
  | "unknown";

export class CoachMicError extends Error {
  readonly code: CoachMicErrorCode;

  constructor(code: CoachMicErrorCode, message: string) {
    super(message);
    this.name = "CoachMicError";
    this.code = code;
  }
}

const BASE_AUDIO: MediaTrackConstraints = {
  echoCancellation: true,
  noiseSuppression: true,
  autoGainControl: true,
};

export function classifyCoachMicError(error: unknown): CoachMicErrorCode {
  const name =
    error && typeof error === "object" && "name" in error
      ? String((error as { name?: string }).name)
      : "";
  if (name === "NotAllowedError" || name === "PermissionDeniedError") {
    return "permission_denied";
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError") {
    return "not_found";
  }
  if (name === "NotReadableError" || name === "TrackStartError") {
    return "in_use";
  }
  if (name === "SecurityError") return "permission_denied";
  return "unknown";
}

export async function requestCoachMicrophoneStream(): Promise<MediaStream> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new CoachMicError(
      "unsupported",
      "Microphone recording is not supported in this browser."
    );
  }
  try {
    return await navigator.mediaDevices.getUserMedia({ audio: BASE_AUDIO });
  } catch (err) {
    const code = classifyCoachMicError(err);
    const messages: Record<CoachMicErrorCode, string> = {
      unsupported: "Microphone recording is not supported in this browser.",
      permission_denied: "Microphone permission is required to speak with Coach.",
      not_found: "No microphone was found.",
      in_use: "Microphone is in use by another application.",
      unknown: "Unable to access the microphone.",
    };
    throw new CoachMicError(code, messages[code]);
  }
}

export type CoachRecordingSession = {
  stop: () => Promise<Blob>;
  cancel: () => void;
};

/**
 * Start MediaRecorder on a live stream. Caller owns stopping tracks after stop/cancel.
 */
export function startCoachRecording(
  stream: MediaStream,
  mimeType?: string
): CoachRecordingSession {
  const preferred =
    mimeType ||
    (typeof MediaRecorder !== "undefined" &&
    MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus"
      : typeof MediaRecorder !== "undefined" &&
          MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "");

  if (typeof MediaRecorder === "undefined") {
    throw new CoachMicError(
      "unsupported",
      "Microphone recording is not supported in this browser."
    );
  }

  const recorder = preferred
    ? new MediaRecorder(stream, { mimeType: preferred })
    : new MediaRecorder(stream);
  const chunks: BlobPart[] = [];
  let resolveStop: ((blob: Blob) => void) | null = null;
  let rejectStop: ((err: Error) => void) | null = null;
  let stopped = false;

  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) chunks.push(event.data);
  };
  recorder.onerror = () => {
    rejectStop?.(new CoachMicError("unknown", "Recording failed."));
  };
  recorder.onstop = () => {
    const type = recorder.mimeType || preferred || "audio/webm";
    resolveStop?.(new Blob(chunks, { type }));
  };

  recorder.start(250);

  return {
    stop: () => {
      if (stopped) {
        return Promise.resolve(new Blob([], { type: preferred || "audio/webm" }));
      }
      stopped = true;
      return new Promise<Blob>((resolve, reject) => {
        resolveStop = resolve;
        rejectStop = reject;
        try {
          if (recorder.state !== "inactive") recorder.stop();
          else resolve(new Blob(chunks, { type: preferred || "audio/webm" }));
        } catch (err) {
          reject(
            err instanceof Error
              ? err
              : new CoachMicError("unknown", "Unable to stop recording.")
          );
        }
      });
    },
    cancel: () => {
      if (stopped) return;
      stopped = true;
      resolveStop = null;
      rejectStop = null;
      try {
        if (recorder.state !== "inactive") recorder.stop();
      } catch {
        /* ignore */
      }
      for (const track of stream.getTracks()) track.stop();
    },
  };
}

export function stopMediaStream(stream: MediaStream | null | undefined): void {
  if (!stream) return;
  for (const track of stream.getTracks()) {
    try {
      track.stop();
    } catch {
      /* ignore */
    }
  }
}
