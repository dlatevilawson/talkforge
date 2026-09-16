import {
  FORGE_AGENT_ABANDON_MAX_ATTEMPTS,
  FORGE_AGENT_ABANDON_TIMEOUT_MS,
  FORGE_AGENT_CRON_TICK_UPDATE_TIMEOUT_MS,
} from "./types.ts";

export type CronTickStage =
  | "recover_list"
  | "claim_rpc"
  | "time_budget"
  | "abandoned"
  | "tick_update"
  | "unhandled"
  | "tick_insert";

export type CronTickStatus = "completed" | "partial" | "failed";

export type SanitizedPostgrestFailure = {
  postgrestCode: string | null;
  postgrestStatus: number | null;
};

export type TickPersistResult =
  | { ok: true }
  | { ok: false; error: unknown };

export type AbandonedReconcileResult =
  | { ok: true; marked: number }
  | { ok: false; error: unknown };

export type ClaimProcessPlan = {
  callModel: boolean;
  errorCode: string | null;
};

export class CronQueryTimeoutError extends Error {
  readonly timedOut = true;

  constructor(message = "RECOVER_LIST_TIMEOUT") {
    super(message);
    this.name = "CronQueryTimeoutError";
  }
}

export class CronTickPersistError extends Error {
  readonly postgrestCode: string | null;
  readonly postgrestStatus: number | null;

  constructor(failure: SanitizedPostgrestFailure) {
    super("CRON_TICK_UPDATE");
    this.name = "CronTickPersistError";
    this.postgrestCode = failure.postgrestCode;
    this.postgrestStatus = failure.postgrestStatus;
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

export function isNetworkError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const record = error as {
    name?: unknown;
    message?: unknown;
    code?: unknown;
    cause?: unknown;
  };
  const code = typeof record.code === "string" ? record.code : "";
  if (
    code === "ECONNRESET" ||
    code === "ETIMEDOUT" ||
    code === "ENOTFOUND" ||
    code === "EAI_AGAIN" ||
    code === "UND_ERR_CONNECT_TIMEOUT"
  ) {
    return true;
  }
  if (record.name === "FetchError") return true;
  const message = typeof record.message === "string" ? record.message : "";
  if (record.name === "TypeError" && /fetch failed|network/i.test(message)) {
    return true;
  }
  if (/fetch failed|network|ECONNRESET|ETIMEDOUT/i.test(message)) return true;
  return isNetworkError(record.cause);
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

export function isTransientQueryFailure(
  error: unknown,
  timedOut = false
): boolean {
  if (timedOut || isTimeoutError(error) || isNetworkError(error)) return true;
  const { postgrestStatus } = sanitizePostgrestFailure(error);
  if (postgrestStatus === 408 || postgrestStatus === 429) return true;
  if (postgrestStatus !== null && postgrestStatus >= 500) return true;
  return false;
}

export function emitSanitizedTickPersistError(error: unknown): void {
  const failure = sanitizePostgrestFailure(error);
  console.error(
    "[forge-agent-cron]",
    "CRON_TICK_UPDATE",
    new CronTickPersistError(failure)
  );
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

export async function reconcileAbandonedTickRows(input: {
  currentTickId: string;
  now: number;
  timeoutMs: number;
  queryTimeoutMs?: number;
  maxAttempts?: number;
  list: (signal: AbortSignal) => Promise<{
    data: readonly { id: string; created_at: string }[] | null;
    error: unknown | null;
  }>;
  update: (
    id: string,
    durationMs: number,
    signal: AbortSignal
  ) => Promise<{ error: unknown | null }>;
}): Promise<AbandonedReconcileResult> {
  const queryTimeoutMs =
    input.queryTimeoutMs ?? FORGE_AGENT_ABANDON_TIMEOUT_MS;
  const maxAttempts =
    input.maxAttempts ?? FORGE_AGENT_ABANDON_MAX_ATTEMPTS;

  const listed = await queryWithTimeoutAndRetry(
    (signal) => input.list(signal),
    {
      timeoutMs: queryTimeoutMs,
      maxAttempts,
    }
  );
  if (!listed.ok) {
    return { ok: false, error: listed.error };
  }

  const ids = selectAbandonedTickIds(
    listed.data ?? [],
    input.currentTickId,
    input.now,
    input.timeoutMs
  );
  let marked = 0;
  for (const id of ids) {
    if (id === input.currentTickId) continue;
    const createdAt = (listed.data ?? []).find((row) => row.id === id)
      ?.created_at;
    const createdMs = createdAt ? new Date(createdAt).getTime() : input.now;
    const durationMs = Number.isFinite(createdMs) ? input.now - createdMs : 0;
    const updated = await queryWithTimeoutAndRetry(
      async (signal) => {
        const res = await input.update(id, durationMs, signal);
        return { data: res, error: res?.error ?? null };
      },
      {
        timeoutMs: queryTimeoutMs,
        maxAttempts,
      }
    );
    if (!updated.ok) {
      return { ok: false, error: updated.error };
    }
    marked += 1;
  }
  return { ok: true, marked };
}

export function remainingUntilDeadline(
  startedAt: number,
  now: number,
  maxDurationMs: number
): number {
  return startedAt + maxDurationMs - now;
}

export function hasFinalizeBudget(
  startedAt: number,
  now: number,
  maxDurationMs: number,
  budgetMs: number
): boolean {
  return remainingUntilDeadline(startedAt, now, maxDurationMs) > budgetMs;
}

export function hasClaimBatchBudget(
  startedAt: number,
  now: number,
  maxDurationMs: number,
  finalizeBudgetMs: number
): boolean {
  return hasFinalizeBudget(startedAt, now, maxDurationMs, finalizeBudgetMs);
}

export function hasModelStartBudget(
  startedAt: number,
  now: number,
  maxDurationMs: number,
  modelStartBudgetMs: number
): boolean {
  return (
    remainingUntilDeadline(startedAt, now, maxDurationMs) >= modelStartBudgetMs
  );
}

export function nextClaimBatchLimit(
  claimedSoFar: number,
  maxClaims: number,
  batchSize: number
): number {
  if (batchSize <= 0 || claimedSoFar >= maxClaims) return 0;
  return Math.min(batchSize, maxClaims - claimedSoFar);
}

export function planClaimProcessing(
  generationAllowed: boolean,
  remainingMs: number,
  modelStartBudgetMs: number
): ClaimProcessPlan {
  if (!generationAllowed) {
    return { callModel: false, errorCode: null };
  }
  if (remainingMs < modelStartBudgetMs) {
    return { callModel: false, errorCode: "CRON_TIME_BUDGET" };
  }
  return { callModel: true, errorCode: null };
}

export type TickUpdateSingleResult = {
  data?: unknown;
  error?: unknown | null;
};

export type TickUpdateClient = {
  from: (table: string) => {
    update: (values: Record<string, unknown>) => {
      eq: (
        column: string,
        value: string
      ) => {
        select: (columns: string) => {
          single: () => PromiseLike<TickUpdateSingleResult>;
          abortSignal?: (signal: AbortSignal) => {
            single: () => PromiseLike<TickUpdateSingleResult>;
          };
        };
        abortSignal?: (signal: AbortSignal) => {
          select: (columns: string) => {
            single: () => PromiseLike<TickUpdateSingleResult>;
            abortSignal?: (signal: AbortSignal) => {
              single: () => PromiseLike<TickUpdateSingleResult>;
            };
          };
        };
      };
    };
  };
};

export function inspectTickUpdateResult(
  result: TickUpdateSingleResult | null | undefined,
  expectedId: string,
  expectedStatus: CronTickStatus
): TickPersistResult {
  if (!result || typeof result !== "object") {
    return { ok: false, error: { code: "CRON_TICK_UPDATE" } };
  }
  if (result.error) return { ok: false, error: result.error };
  const data = result.data;
  const row = Array.isArray(data)
    ? data.length === 1
      ? data[0]
      : null
    : data;
  if (!row || typeof row !== "object") {
    return { ok: false, error: { code: "CRON_TICK_UPDATE" } };
  }
  const record = row as Record<string, unknown>;
  if (typeof record.id !== "string" || record.id !== expectedId) {
    return { ok: false, error: { code: "CRON_TICK_UPDATE" } };
  }
  if (record.status !== expectedStatus) {
    return { ok: false, error: { code: "CRON_TICK_STATUS" } };
  }
  return { ok: true };
}

export async function persistCurrentTick(
  performUpdate: () => Promise<TickUpdateSingleResult | null | undefined>,
  expected: { id: string; status: CronTickStatus }
): Promise<TickPersistResult> {
  try {
    const result = await performUpdate();
    return inspectTickUpdateResult(result, expected.id, expected.status);
  } catch (error) {
    return { ok: false, error };
  }
}

export async function updateCurrentTickRow(
  client: TickUpdateClient,
  id: string,
  status: CronTickStatus,
  detail: Record<string, unknown>,
  signal?: AbortSignal
): Promise<TickPersistResult> {
  return persistCurrentTick(async () => {
    let query: any = client
      .from("forge_agent_runs")
      .update({ status, detail })
      .eq("id", id);
    if (signal && typeof query.abortSignal === "function") {
      query = query.abortSignal(signal);
    }
    query = query.select("id, status");
    if (signal && typeof query.abortSignal === "function") {
      query = query.abortSignal(signal);
    }
    return query.single();
  }, { id, status });
}

export async function updateCurrentTickRowWithTimeout(
  client: TickUpdateClient,
  id: string,
  status: CronTickStatus,
  detail: Record<string, unknown>,
  timeoutMs: number = FORGE_AGENT_CRON_TICK_UPDATE_TIMEOUT_MS
): Promise<TickPersistResult> {
  try {
    return await withTimeout(async (signal) => {
      return updateCurrentTickRow(client, id, status, detail, signal);
    }, timeoutMs);
  } catch (error) {
    return { ok: false, error };
  }
}

export function isTickPersistOk(
  result: TickPersistResult | void | undefined | null
): boolean {
  return result?.ok === true;
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
  | { ok: false; error: unknown; timedOut: boolean; attempts: number }
> {
  let lastError: unknown = null;
  let timedOut = false;
  const attempts = Math.max(1, options.maxAttempts);
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      const result = await withTimeout(run, options.timeoutMs);
      if (!result.error) return { ok: true, data: result.data };
      lastError = result.error;
      timedOut = false;
      const retry =
        attempt + 1 < attempts && isTransientQueryFailure(result.error, false);
      if (!retry) {
        return {
          ok: false,
          error: lastError,
          timedOut,
          attempts: attempt + 1,
        };
      }
    } catch (error) {
      lastError = error;
      timedOut = isTimeoutError(error);
      const retry =
        attempt + 1 < attempts && isTransientQueryFailure(error, timedOut);
      if (!retry) {
        return {
          ok: false,
          error: lastError,
          timedOut,
          attempts: attempt + 1,
        };
      }
    }
  }
  return { ok: false, error: lastError, timedOut, attempts };
}
