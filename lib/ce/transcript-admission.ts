export const HANDS_FREE_ADMISSION_HOLD_MS = 1_500;

export function isSubstantiveTranscript(text: string): boolean {
  const normalized = text.trim();
  if (!normalized) return false;
  const words = normalized.match(/[a-z0-9']+/gi) ?? [];
  const letters = normalized.replace(/[^a-z]/gi, "").length;
  return words.length >= 3 && letters >= 8;
}

export type TranscriptAdmissionDecision = "admit" | "hold" | "drop";

export function decideTranscriptAdmission(input: {
  text: string;
  locallyConfirmed: boolean;
}): TranscriptAdmissionDecision {
  if (input.locallyConfirmed) return "admit";
  return isSubstantiveTranscript(input.text) ? "hold" : "drop";
}

