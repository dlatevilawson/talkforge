export function evaluateBlockCompletion(statuses: string[]): {
  completedDays: number;
  totalDays: number;
  blockComplete: boolean;
} {
  const completedDays = statuses.filter((status) => status === "done").length;
  return {
    completedDays,
    totalDays: statuses.length,
    blockComplete: statuses.length > 0 && completedDays === statuses.length,
  };
}

export function nextBlockStartDate(endsOn: string): string {
  const date = new Date(`${endsOn}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

export function resolveCompletedBlockRetry<T>(status: string, nextBlock: T | null):
  | { kind: "continue" }
  | { kind: "reuse"; nextBlock: T }
  | { kind: "already-complete" } {
  if (status !== "completed") return { kind: "continue" };
  return nextBlock ? { kind: "reuse", nextBlock } : { kind: "already-complete" };
}

export type SafeJourneyActionResult<T> =
  | { ok: true; value: T }
  | { ok: false; message: string };

export async function safeJourneyAction<T>(
  operation: () => Promise<T>,
  fallbackMessage: string,
): Promise<SafeJourneyActionResult<T>> {
  try {
    return { ok: true, value: await operation() };
  } catch {
    return { ok: false, message: fallbackMessage };
  }
}
