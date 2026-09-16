import { isUsableCronTick } from "./cron-auth.ts";
import {
  buildCronTickDetail,
  emitSanitizedTickPersistError,
  hasClaimBatchBudget,
  isTickPersistOk,
  planClaimProcessing,
  queryWithTimeoutAndRetry,
  remainingUntilDeadline,
  nextClaimBatchLimit,
  type AbandonedReconcileResult,
  type CronTickStatus,
  type TickPersistResult,
} from "./cron-guard.ts";
import {
  FORGE_AGENT_CRON_CLAIM_LIMIT,
  FORGE_AGENT_CRON_CONCURRENCY,
  FORGE_AGENT_CRON_FINALIZE_BUDGET_MS,
  FORGE_AGENT_CRON_MAX_DURATION_MS,
  FORGE_AGENT_CRON_MODEL_START_BUDGET_MS,
  FORGE_AGENT_RECOVER_LIST_MAX_ATTEMPTS,
  FORGE_AGENT_RECOVER_LIST_TIMEOUT_MS,
} from "./types.ts";

export type ClaimedCue = {
  action_id: string;
  cue_id: string;
  user_id: string;
  generation_allowed: boolean;
  attempt_id: string | null;
};

export type CronMetrics = {
  recovered: number;
  claimed: number;
  generated: number;
  fallbacks: number;
  inputTokens: number;
  outputTokens: number;
  errorCodes: string[];
};

export type ClaimProcessOptions = {
  callModel: boolean;
};

export function emptyCronMetrics(): CronMetrics {
  return {
    recovered: 0,
    claimed: 0,
    generated: 0,
    fallbacks: 0,
    inputTokens: 0,
    outputTokens: 0,
    errorCodes: [],
  };
}

export type ForgeAgentCronRunnerDeps = {
  now: () => number;
  writeTick: () => Promise<Record<string, unknown> | null>;
  updateTick: (
    id: string,
    status: CronTickStatus,
    detail: Record<string, unknown>
  ) => Promise<TickPersistResult>;
  reconcileAbandoned: (
    currentTickId: string,
    now: number
  ) => Promise<AbandonedReconcileResult>;
  listDrafting: (
    signal: AbortSignal
  ) => Promise<{ data: unknown[] | null; error: unknown | null }>;
  recoverRows: (rows: unknown[], metrics: CronMetrics) => Promise<void>;
  claimDue: (
    tickId: string,
    limit: number
  ) => Promise<{ data: unknown; error: unknown | null }>;
  processClaim: (
    claim: ClaimedCue,
    tickId: string,
    metrics: CronMetrics,
    options: ClaimProcessOptions
  ) => Promise<void>;
};

function metricsFields(metrics: CronMetrics) {
  return {
    recovered: metrics.recovered,
    claimed: metrics.claimed,
    generated: metrics.generated,
    fallbacks: metrics.fallbacks,
    inputTokens: metrics.inputTokens,
    outputTokens: metrics.outputTokens,
  };
}

function pushErrorCode(metrics: CronMetrics, code: string): void {
  if (!metrics.errorCodes.includes(code)) metrics.errorCodes.push(code);
}

export function mapClaimedCue(row: Record<string, unknown>): ClaimedCue {
  return {
    action_id: String(row.action_id),
    cue_id: String(row.cue_id),
    user_id: String(row.user_id),
    generation_allowed: row.generation_allowed === true,
    attempt_id:
      typeof row.attempt_id === "string" && row.attempt_id
        ? row.attempt_id
        : null,
  };
}

async function mapLimit<T>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<void>
): Promise<void> {
  const queue = [...items];
  const workers = Array.from(
    { length: Math.min(concurrency, queue.length) || 0 },
    async () => {
      while (queue.length > 0) {
        const next = queue.shift();
        if (!next) return;
        await worker(next);
      }
    }
  );
  await Promise.all(workers);
}

async function persistTick(
  deps: ForgeAgentCronRunnerDeps,
  tickId: string,
  intended: CronTickStatus,
  detail: Record<string, unknown>,
  metrics: CronMetrics,
  started: number
): Promise<CronTickStatus> {
  const persisted = await deps.updateTick(tickId, intended, detail);
  if (isTickPersistOk(persisted)) return intended;

  pushErrorCode(metrics, "CRON_TICK_UPDATE");
  const persistError =
    persisted && persisted.ok === false ? persisted.error : { code: "CRON_TICK_UPDATE" };
  if (intended !== "failed") {
    const failDetail = buildCronTickDetail({
      stage: "tick_update",
      errorCodes: metrics.errorCodes,
      error: persistError,
      durationMs: deps.now() - started,
      ...metricsFields(metrics),
    });
    const retry = await deps.updateTick(tickId, "failed", failDetail);
    if (isTickPersistOk(retry)) return "failed";
  }
  emitSanitizedTickPersistError(persistError);
  return "failed";
}

export async function runForgeAgentCronWithDeps(
  deps: ForgeAgentCronRunnerDeps
): Promise<{ status: CronTickStatus; metrics: CronMetrics }> {
  const started = deps.now();
  const metrics = emptyCronMetrics();
  const tick = await deps.writeTick();

  if (!isUsableCronTick(tick)) {
    pushErrorCode(metrics, "CRON_TICK_FAILED");
    return { status: "failed", metrics };
  }

  const budgetOk = () =>
    hasClaimBatchBudget(
      started,
      deps.now(),
      FORGE_AGENT_CRON_MAX_DURATION_MS,
      FORGE_AGENT_CRON_FINALIZE_BUDGET_MS
    );

  try {
    const abandoned = await deps.reconcileAbandoned(tick.id, deps.now());
    if (!abandoned.ok) {
      pushErrorCode(metrics, "CRON_ABANDONED");
      const status = await persistTick(
        deps,
        tick.id,
        "failed",
        buildCronTickDetail({
          stage: "abandoned",
          errorCodes: metrics.errorCodes,
          error: abandoned.error,
          durationMs: deps.now() - started,
          ...metricsFields(metrics),
        }),
        metrics,
        started
      );
      return { status, metrics };
    }

    const listed = await queryWithTimeoutAndRetry(deps.listDrafting, {
      timeoutMs: FORGE_AGENT_RECOVER_LIST_TIMEOUT_MS,
      maxAttempts: FORGE_AGENT_RECOVER_LIST_MAX_ATTEMPTS,
    });
    if (!listed.ok) {
      pushErrorCode(metrics, "RECOVER_LIST");
      const status = await persistTick(
        deps,
        tick.id,
        "failed",
        buildCronTickDetail({
          stage: "recover_list",
          errorCodes: metrics.errorCodes,
          error: listed.error,
          timedOut: listed.timedOut,
          durationMs: deps.now() - started,
          ...metricsFields(metrics),
        }),
        metrics,
        started
      );
      return { status, metrics };
    }

    await deps.recoverRows(listed.data ?? [], metrics);

    if (!budgetOk()) {
      pushErrorCode(metrics, "CRON_TIME_BUDGET");
      const status = await persistTick(
        deps,
        tick.id,
        "failed",
        buildCronTickDetail({
          stage: "time_budget",
          errorCodes: metrics.errorCodes,
          durationMs: deps.now() - started,
          ...metricsFields(metrics),
        }),
        metrics,
        started
      );
      return { status, metrics };
    }

    let skippedForBudget = false;
    while (metrics.claimed < FORGE_AGENT_CRON_CLAIM_LIMIT) {
      if (!budgetOk()) {
        skippedForBudget = true;
        pushErrorCode(metrics, "CRON_TIME_BUDGET");
        break;
      }

      const limit = nextClaimBatchLimit(
        metrics.claimed,
        FORGE_AGENT_CRON_CLAIM_LIMIT,
        FORGE_AGENT_CRON_CONCURRENCY
      );
      if (limit <= 0) break;

      const claimed = await deps.claimDue(tick.id, limit);
      if (claimed.error) {
        pushErrorCode(metrics, "CLAIM_RPC");
        const status = await persistTick(
          deps,
          tick.id,
          "failed",
          buildCronTickDetail({
            stage: "claim_rpc",
            errorCodes: metrics.errorCodes,
            error: claimed.error,
            durationMs: deps.now() - started,
            ...metricsFields(metrics),
          }),
          metrics,
          started
        );
        return { status, metrics };
      }

      const claims = ((claimed.data ?? []) as Record<string, unknown>[]).map(
        mapClaimedCue
      );
      if (claims.length === 0) break;
      metrics.claimed += claims.length;

      await mapLimit(claims, FORGE_AGENT_CRON_CONCURRENCY, async (claim) => {
        const remaining = remainingUntilDeadline(
          started,
          deps.now(),
          FORGE_AGENT_CRON_MAX_DURATION_MS
        );
        const plan = planClaimProcessing(
          claim.generation_allowed,
          remaining,
          FORGE_AGENT_CRON_MODEL_START_BUDGET_MS
        );
        if (plan.errorCode) pushErrorCode(metrics, plan.errorCode);
        await deps.processClaim(claim, tick.id, metrics, {
          callModel: plan.callModel,
        });
      });
    }

    const status: CronTickStatus =
      metrics.errorCodes.length === 0 ? "completed" : "partial";
    const timeBudgetAffected =
      skippedForBudget || metrics.errorCodes.includes("CRON_TIME_BUDGET");
    const persisted = await persistTick(
      deps,
      tick.id,
      status,
      buildCronTickDetail({
        stage: timeBudgetAffected ? "time_budget" : undefined,
        errorCodes: metrics.errorCodes,
        durationMs: deps.now() - started,
        ...metricsFields(metrics),
      }),
      metrics,
      started
    );
    return { status: persisted, metrics };
  } catch {
    pushErrorCode(metrics, "CRON_UNHANDLED");
    const status = await persistTick(
      deps,
      tick.id,
      "failed",
      buildCronTickDetail({
        stage: "unhandled",
        errorCodes: metrics.errorCodes,
        durationMs: deps.now() - started,
        ...metricsFields(metrics),
      }),
      metrics,
      started
    );
    return { status, metrics };
  }
}
