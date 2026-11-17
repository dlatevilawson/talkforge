export function shouldPollSpeechMeasurement(input: {
  hasAudio: boolean;
  measuredAt: string | null | undefined;
  disabled: boolean;
  attempts: number;
  maxAttempts?: number;
}): boolean {
  const maxAttempts = input.maxAttempts ?? 8;
  return Boolean(input.hasAudio && !input.measuredAt && !input.disabled && input.attempts < maxAttempts);
}

export function hasTerminalReflectState(input: {
  report: unknown;
  memoryMatches: boolean;
  attempts: number;
  maxAttempts?: number;
}): boolean {
  const maxAttempts = input.maxAttempts ?? 8;
  return Boolean(input.report && (input.memoryMatches || input.attempts >= maxAttempts));
}
