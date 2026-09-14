export type CronTickStage =
  | "recover_list"
  | "claim_rpc"
  | "time_budget"
  | "abandoned"
  | "unhandled"
  | "tick_insert";

export type CronTickStatus = "completed" | "partial" | "failed";

export type SanitizedPostgrestFailure = {
  postgrestCode: string | null;
  postgrestStatus: number | null;
};

export class CronQueryTimeoutError extends Error {
  readonly timedOut = true;

  constructor(message = "RECOVER_LIST_TIMEOUT") {
    super(message);
    this.name = "CronQueryTimeoutError";
  }
}

export function isTimeoutError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const record = error as { name?: unknown; timedOut?: unknown };
  return (
    record.timedOut === true ||
    record.name === "CronQueryTimeoutError" ||
    record.name === "AbortError" ||
    record.name === "TimeoutError"
  );
}

export function sanitizePostgrestFailure(
  error: unknown
): SanitizedPostgrestFailure {
  if (!error || typeof error !== "object") {
    return { postgrestCode: null, postgrestStatus: null };
  }
  const record = error as Record<string, unknown>;
  const postgrestCode =
    typeof record.code === "string" && record.code ? record.code : null;
  const postgrestStatus =
    typeof record.status === "number"
      ? record.status
      : typeof record.statusCode === "number"
        ? record.statusCode
        : null;
  return { postgrestCode, postgrestStatus };
}

export function buildCronTickDetail(input: {
  stage?: CronTickStage;
  errorCodes?: string[];
  error?: unknown;
  timedOut?: boolean;
  durationMs: number;
  recovered?: number;
  claimed?: number;
  generated?: number;
  fallbacks?: number;
  inputTokens?: number;
  outputTokens?: number;
}): Record<string, unknown> {
  const failure = sanitizePostgrestFailure(input.error);
  const errorCodes = [...(input.errorCodes ?? [])];
  if (input.timedOut && !errorCodes.includes("RECOVER_LIST_TIMEOUT")) {
    errorCodes.push("RECOVER_LIST_TIMEOUT");
  }
  if (failure.postgrestCode && !errorCodes.includes(failure.postgrestCode)) {
    errorCodes.push(failure.postgrestCode);
  }
  const detail: Record<string, unknown> = {
    durationMs: input.durationMs,
    errorCodes,
    postgrestCode: failure.postgrestCode,
    postgrestStatus: failure.postgrestStatus,
  };
  if (input.stage) detail.stage = input.stage;
  if (typeof input.recovered === "number") detail.recovered = input.recovered;
  if (typeof input.claimed === "number") detail.claimed = input.claimed;
  if (typeof input.generated === "number") detail.generated = input.generated;
  if (typeof input.fallbacks === "number") detail.fallbacks = input.fallbacks;
  if (typeof input.inputTokens === "number") {
    detail.inputTokens = input.inputTokens;
  }
  if (typeof input.outputTokens === "number") {
    detail.outputTokens = input.outputTokens;
  }
  return detail;
}

export function isAbandonedCronTick(
  createdAt: string,
  now: number,
  timeoutMs: number
): boolean {
  const at = new Date(createdAt).getTime();
  if (Number.isNaN(at)) return false;
  return now - at >= timeoutMs;
}

export function selectAbandonedTickIds(
  rows: readonly { id: string; created_at: string }[],
  currentTickId: string,
  now: number,
  timeoutMs: number
): string[] {
  return rows
    .filter(
      (row) =>
        row.id !== currentTickId &&
        isAbandonedCronTick(row.created_at, now, timeoutMs)
    )
    .map((row) => row.id);
}

export function hasFinalizeBudget(
  startedAt: number,
  now: number,
  maxDurationMs: number,
  budgetMs: number
): boolean {
  return now < startedAt + maxDurationMs - budgetMs;
}

export async function withTimeout<T>(
  run: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await Promise.race([
      run(controller.signal),
      new Promise<never>((_, reject) => {
        const fail = () => reject(new CronQueryTimeoutError());
        if (controller.signal.aborted) {
          fail();
          return;
        }
        controller.signal.addEventListener("abort", fail, { once: true });
      }),
    ]);
  } finally {
    clearTimeout(timer);
    if (!controller.signal.aborted) controller.abort();
  }
}

export async function queryWithTimeoutAndRetry<T>(
  run: (
    signal: AbortSignal
  ) => Promise<{ data: T | null; error: unknown | null }>,
  options: { timeoutMs: number; maxAttempts: number }
): Promise<
  | { ok: true; data: T | null }
  | { ok: false; error: unknown; timedOut: boolean }
> {
  let lastError: unknown = null;
  let timedOut = false;
  const attempts = Math.max(1, options.maxAttempts);
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const result = await withTimeout(run, options.timeoutMs);
      if (result.error) {
        lastError = result.error;
        timedOut = false;
        continue;
      }
      return { ok: true, data: result.data };
    } catch (error) {
      lastError = error;
      timedOut = isTimeoutError(error);
    }
  }
  return { ok: false, error: lastError, timedOut };
}
