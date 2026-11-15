export function reflectDataIsReady(input: {
  sessionId: string;
  modality: string;
  report: unknown;
  speechMetrics: unknown;
  memorySessionId: string | null;
}): boolean {
  if (!input.report || input.memorySessionId !== input.sessionId) return false;
  return input.modality !== "voice" || Boolean(input.speechMetrics);
}

