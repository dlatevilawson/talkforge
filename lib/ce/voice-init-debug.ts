export type VoiceInitDebugPayload = {
  hypothesisId: "A" | "B" | "C" | "D" | "E";
  location: string;
  message: string;
  data: Record<string, unknown>;
  timestamp: number;
};

/** Temporary DEBUG MODE transport. Never include secrets, user content, or PII. */
export function recordVoiceInitDiagnostic(
  payload: VoiceInitDebugPayload
): void {
  // #region agent log
  void fetch("/api/debug/voice-init", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => undefined);
  // #endregion
}
