export type SpeechRecorder = {
  stop: () => Promise<Blob | null>;
};

/**
 * Records the member stream only. The caller must stop this before releasing
 * the realtime connection. If MediaRecorder or a supported mime type is not
 * available, the result is null and the session remains valid with no audio.
 */
export function startSpeechRecorder(stream: MediaStream): SpeechRecorder | null {
  if (typeof MediaRecorder === "undefined") return null;
  const mimeType = ["audio/webm;codecs=opus", "audio/mp4", "audio/ogg"]
    .find((candidate) => MediaRecorder.isTypeSupported(candidate));
  let recorder: MediaRecorder;
  try {
    recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
  } catch {
    return null;
  }

  const chunks: BlobPart[] = [];
  recorder.addEventListener("dataavailable", (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  });
  recorder.start(500);

  return {
    stop: () =>
      new Promise((resolve) => {
        if (recorder.state === "inactive") {
          resolve(chunks.length ? new Blob(chunks, { type: recorder.mimeType }) : null);
          return;
        }
        recorder.addEventListener(
          "stop",
          () => resolve(chunks.length ? new Blob(chunks, { type: recorder.mimeType }) : null),
          { once: true }
        );
        try {
          recorder.stop();
        } catch {
          resolve(null);
        }
      }),
  };
}
