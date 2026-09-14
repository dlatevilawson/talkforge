import { isUsableCronTick } from "./cron-auth.ts";
import {
  buildCronTickDetail,
  hasFinalizeBudget,
  queryWithTimeoutAndRetry,
  type CronTickStatus,
} from "./cron-guard.ts";
import {
  FORGE_AGENT_CRON_CONCURRENCY,
  FORGE_AGENT_CRON_FINALIZE_BUDGET_MS,
  FORGE_AGENT_CRON_MAX_DURATION_MS,
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
  ) => Promise<void>;
  reconcileAbandoned: (currentTickId: string, now: number) => Promise<void>;
  listDrafting: (
    signal: AbortSignal
  ) => Promise<{ data: unknown[] | null; error: unknown | null }>;
  recoverRows: (rows: unknown[], metrics: CronMetrics) => Promise<void>;
  claimDue: (
    tickId: string
  ) => Promise<{ data: unknown; error: unknown | null }>;
  processClaim: (
    claim: ClaimedCue,
    tickId: string,
    metrics: CronMetrics
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

export async function runForgeAgentCronWithDeps(
  deps: ForgeAgentCronRunnerDeps
): Promise<{ status: CronTickStatus; metrics: CronMetrics }> {
  const started = deps.now();
  const metrics = emptyCronMetrics();
  const tick = await deps.writeTick();

  if (!isUsableCronTick(tick)) {
    metrics.errorCodes.push("CRON_TICK_FAILED");
    return { status: "failed", metrics };
  }

  const budgetOk = () =>
    hasFinalizeBudget(
      started,
      deps.now(),
      FORGE_AGENT_CRON_MAX_DURATION_MS,
      FORGE_AGENT_CRON_FINALIZE_BUDGET_MS
    );

  try {
    await deps.reconcileAbandoned(tick.id, deps.now());

    const listed = await queryWithTimeoutAndRetry(deps.listDrafting, {
      timeoutMs: FORGE_AGENT_RECOVER_LIST_TIMEOUT_MS,
      maxAttempts: FORGE_AGENT_RECOVER_LIST_MAX_ATTEMPTS,
    });
    if (!listed.ok) {
      metrics.errorCodes.push("RECOVER_LIST");
      await deps.updateTick(
        tick.id,
        "failed",
        buildCronTickDetail({
          stage: "recover_list",
          errorCodes: metrics.errorCodes,
          error: listed.error,
          timedOut: listed.timedOut,
          durationMs: deps.now() - started,
          ...metricsFields(metrics),
        })
      );
      return { status: "failed", metrics };
    }

    await deps.recoverRows(listed.data ?? [], metrics);

    if (!budgetOk()) {
      metrics.errorCodes.push("CRON_TIME_BUDGET");
      await deps.updateTick(
        tick.id,
        "failed",
        buildCronTickDetail({
          stage: "time_budget",
          errorCodes: metrics.errorCodes,
          durationMs: deps.now() - started,
          ...metricsFields(metrics),
        })
      );
      return { status: "failed", metrics };
    }

    const claimed = await deps.claimDue(tick.id);
    if (claimed.error) {
      metrics.errorCodes.push("CLAIM_RPC");
      await deps.updateTick(
        tick.id,
        "failed",
        buildCronTickDetail({
          stage: "claim_rpc",
          errorCodes: metrics.errorCodes,
          error: claimed.error,
          durationMs: deps.now() - started,
          ...metricsFields(metrics),
        })
      );
      return { status: "failed", metrics };
    }

    const claims = ((claimed.data ?? []) as Record<string, unknown>[]).map(
      mapClaimedCue
    );
    metrics.claimed = claims.length;

    let skippedForBudget = false;
    await mapLimit(claims, FORGE_AGENT_CRON_CONCURRENCY, async (claim) => {
      if (!budgetOk()) {
        skippedForBudget = true;
        return;
      }
      await deps.processClaim(claim, tick.id, metrics);
      if (!budgetOk()) skippedForBudget = true;
    });

    if (skippedForBudget) metrics.errorCodes.push("CRON_TIME_BUDGET");

    const status: CronTickStatus =
      metrics.errorCodes.length === 0
        ? "completed"
        : skippedForBudget && metrics.errorCodes.every((code) => code === "CRON_TIME_BUDGET")
          ? "partial"
          : "partial";
    await deps.updateTick(
      tick.id,
      status,
      buildCronTickDetail({
        stage: skippedForBudget ? "time_budget" : undefined,
        errorCodes: metrics.errorCodes,
        durationMs: deps.now() - started,
        ...metricsFields(metrics),
      })
    );
    return { status, metrics };
  } catch {
    metrics.errorCodes.push("CRON_UNHANDLED");
    await deps.updateTick(
      tick.id,
      "failed",
      buildCronTickDetail({
        stage: "unhandled",
        errorCodes: metrics.errorCodes,
        durationMs: deps.now() - started,
        ...metricsFields(metrics),
      })
    );
    return { status: "failed", metrics };
  }
}
