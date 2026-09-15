import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { compactCoachContext, readApprovedCoachingContext } from "./context.ts";
import {
  buildCronTickDetail,
  reconcileAbandonedTickRows,
  updateCurrentTickRow,
  type AbandonedReconcileResult,
  type TickPersistResult,
} from "./cron-guard.ts";
import { buildCheckInCopy } from "./copy.ts";
import { draftCheckInPayload } from "./draft.ts";
import {
  attemptMatchesAction,
  isStaleDraftingTimestamp,
  sanitizeAttemptDetail,
} from "./draft-validate.ts";
import { assertForgeAgentServiceWriteTarget } from "./policy.ts";
import {
  runForgeAgentCronWithDeps,
  type ClaimedCue,
  type ClaimProcessOptions,
  type CronMetrics,
  type ForgeAgentCronRunnerDeps,
} from "./cron-runner.ts";
import {
  FORGE_AGENT_CRON_ABANDONED_MS,
  FORGE_AGENT_STALE_DRAFT_MS,
  type ForgeCheckInPayload,
  type ForgeCueKind,
} from "./types.ts";

export type { ClaimedCue, CronMetrics } from "./cron-runner.ts";

export type ForgeAgentCronDeps = Partial<
  Pick<
    ForgeAgentCronRunnerDeps,
    | "now"
    | "writeTick"
    | "updateTick"
    | "reconcileAbandoned"
    | "listDrafting"
    | "recoverRows"
    | "claimDue"
    | "processClaim"
  >
>;

function logCron(code: string, extra?: Record<string, unknown>): void {
  const safe = extra ? { ...extra } : {};
  delete safe.prompt;
  delete safe.body;
  delete safe.title;
  delete safe.context;
  delete safe.stack;
  console.info("[forge-agent-cron]", code, safe);
}

async function writeRun(
  admin: SupabaseClient,
  table: "forge_agent_runs",
  payload: Record<string, unknown>
): Promise<Record<string, unknown> | null> {
  assertForgeAgentServiceWriteTarget(table);
  const { data, error } = await admin
    .from(table)
    .insert(payload)
    .select("*")
    .single();
  if (error) {
    logCron("RUN_INSERT_FAILED", { errorCode: error.code ?? "RUN_INSERT" });
    return null;
  }
  return (data ?? null) as Record<string, unknown> | null;
}

async function finalizeAction(
  admin: SupabaseClient,
  actionId: string,
  payload: ForgeCheckInPayload
): Promise<boolean> {
  assertForgeAgentServiceWriteTarget("forge_agent_actions");
  const { data, error } = await admin
    .from("forge_agent_actions")
    .update({
      status: "pending_approval",
      payload,
    })
    .eq("id", actionId)
    .eq("status", "drafting")
    .select("id")
    .maybeSingle();
  if (error) {
    logCron("FINALIZE_FAILED", { errorCode: error.code ?? "FINALIZE" });
    return false;
  }
  return Boolean(data);
}

async function markAttempt(
  admin: SupabaseClient,
  attemptId: string | null,
  status: "generated" | "fallback",
  extra: Record<string, unknown>
): Promise<void> {
  if (!attemptId) return;
  assertForgeAgentServiceWriteTarget("forge_agent_runs");
  const { error } = await admin
    .from("forge_agent_runs")
    .update({
      status,
      detail: extra,
    })
    .eq("id", attemptId)
    .eq("kind", "draft_attempt")
    .eq("status", "started");
  if (error) {
    logCron("ATTEMPT_UPDATE_FAILED", { errorCode: error.code ?? "ATTEMPT" });
  }
}

async function loadStartedAttempt(
  admin: SupabaseClient,
  actionId: string,
  cueId: string
): Promise<{ id: string; detail: unknown } | null> {
  const { data, error } = await admin
    .from("forge_agent_runs")
    .select("id, detail")
    .eq("kind", "draft_attempt")
    .eq("status", "started");
  if (error) return null;
  const match = (data ?? []).find((row) =>
    attemptMatchesAction(row.detail, actionId, cueId)
  );
  return match ? { id: String(match.id), detail: match.detail } : null;
}

async function recoverStaleDrafts(
  admin: SupabaseClient,
  rows: unknown[],
  metrics: CronMetrics
): Promise<void> {
  const stale = rows.filter((row) => {
    const record = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
    return isStaleDraftingTimestamp(
      String(record.updated_at ?? record.created_at),
      new Date(),
      FORGE_AGENT_STALE_DRAFT_MS
    );
  }) as Record<string, unknown>[];
  if (stale.length === 0) return;

  const cueIds = stale.map((row) => String(row.cue_id));
  const { data: cues } = await admin
    .from("forge_cues")
    .select("id, kind, title, success_criteria")
    .in("id", cueIds);
  const cueById = new Map(
    (cues ?? []).map((cue) => [String(cue.id), cue] as const)
  );

  for (const row of stale) {
    const cue = cueById.get(String(row.cue_id));
    const payload = buildCheckInCopy({
      kind: (cue?.kind as ForgeCueKind) || "homework",
      title: typeof cue?.title === "string" ? cue.title : "Declared cue",
      successCriteria:
        typeof cue?.success_criteria === "string" ? cue.success_criteria : null,
    });
    const finalized = await finalizeAction(admin, String(row.id), payload);
    if (!finalized) continue;
    metrics.recovered += 1;
    metrics.fallbacks += 1;
    const attempt = await loadStartedAttempt(
      admin,
      String(row.id),
      String(row.cue_id)
    );
    const existing =
      attempt?.detail && typeof attempt.detail === "object"
        ? (attempt.detail as Record<string, unknown>)
        : {};
    await markAttempt(
      admin,
      attempt?.id ?? null,
      "fallback",
      sanitizeAttemptDetail({
        action_id: existing.action_id ?? row.id,
        cue_id: existing.cue_id ?? row.cue_id,
        cron_run_id: existing.cron_run_id,
        errorCode: "STALE_DRAFT",
      })
    );
  }
}

async function loadCue(
  admin: SupabaseClient,
  cueId: string
): Promise<{
  kind: ForgeCueKind;
  title: string;
  successCriteria: string | null;
} | null> {
  const { data } = await admin
    .from("forge_cues")
    .select("kind, title, success_criteria")
    .eq("id", cueId)
    .maybeSingle();
  if (!data || typeof data.title !== "string") return null;
  return {
    kind: data.kind as ForgeCueKind,
    title: data.title,
    successCriteria:
      typeof data.success_criteria === "string" ? data.success_criteria : null,
  };
}

async function processClaim(
  admin: SupabaseClient,
  claim: ClaimedCue,
  cronRunId: string,
  metrics: CronMetrics,
  options: ClaimProcessOptions
): Promise<void> {
  const cue = await loadCue(admin, claim.cue_id);
  if (!cue) {
    metrics.errorCodes.push("CUE_MISSING");
    return;
  }

  const callModel = options.callModel && claim.generation_allowed;
  if (!callModel) {
    const finalized = await finalizeAction(
      admin,
      claim.action_id,
      buildCheckInCopy(cue)
    );
    if (finalized) metrics.fallbacks += 1;
    return;
  }

  const context = await readApprovedCoachingContext(admin, claim.user_id);
  const contextText = compactCoachContext(context, 800);
  const drafted = await draftCheckInPayload({
    ...cue,
    contextText,
  });
  metrics.inputTokens += drafted.usage.inputTokens;
  metrics.outputTokens += drafted.usage.outputTokens;
  if (drafted.errorCode) metrics.errorCodes.push(drafted.errorCode);

  const finalized = await finalizeAction(
    admin,
    claim.action_id,
    drafted.payload
  );
  if (!finalized) {
    metrics.errorCodes.push("FINALIZE");
    return;
  }
  if (drafted.source === "model") metrics.generated += 1;
  else metrics.fallbacks += 1;

  await markAttempt(
    admin,
    claim.attempt_id,
    drafted.source === "model" ? "generated" : "fallback",
    sanitizeAttemptDetail({
      action_id: claim.action_id,
      cue_id: claim.cue_id,
      cron_run_id: cronRunId,
      inputTokens: drafted.usage.inputTokens,
      outputTokens: drafted.usage.outputTokens,
      errorCode: drafted.errorCode,
    })
  );
}

async function listDraftingActions(
  admin: SupabaseClient,
  signal: AbortSignal
): Promise<{ data: unknown[] | null; error: unknown | null }> {
  const { data, error } = await admin
    .from("forge_agent_actions")
    .select("id, user_id, cue_id, updated_at, created_at")
    .eq("status", "drafting")
    .abortSignal(signal);
  return { data: (data ?? null) as unknown[] | null, error };
}

async function reconcileAbandonedTicks(
  admin: SupabaseClient,
  currentTickId: string,
  now: number
): Promise<AbandonedReconcileResult> {
  return reconcileAbandonedTickRows({
    currentTickId,
    now,
    timeoutMs: FORGE_AGENT_CRON_ABANDONED_MS,
    list: async () => {
      const { data, error } = await admin
        .from("forge_agent_runs")
        .select("id, created_at")
        .eq("kind", "cron_tick")
        .eq("status", "started")
        .neq("id", currentTickId);
      return {
        data: (data ?? []).map((row) => ({
          id: String(row.id),
          created_at: String(row.created_at),
        })),
        error,
      };
    },
    update: async (id, durationMs) => {
      const { error } = await admin
        .from("forge_agent_runs")
        .update({
          status: "failed",
          detail: buildCronTickDetail({
            stage: "abandoned",
            errorCodes: ["CRON_ABANDONED"],
            durationMs,
          }),
        })
        .eq("id", id)
        .eq("kind", "cron_tick")
        .eq("status", "started")
        .neq("id", currentTickId);
      return { error };
    },
  });
}

export async function runForgeAgentCron(
  admin: SupabaseClient,
  deps: ForgeAgentCronDeps = {}
): Promise<{
  status: "completed" | "partial" | "failed";
  metrics: CronMetrics;
}> {
  const now = deps.now ?? Date.now;
  const result = await runForgeAgentCronWithDeps({
    now,
    writeTick:
      deps.writeTick ??
      (() =>
        writeRun(admin, "forge_agent_runs", {
          kind: "cron_tick",
          status: "started",
          detail: {},
        })),
    updateTick:
      deps.updateTick ??
      (async (id, status, detail): Promise<TickPersistResult> => {
        assertForgeAgentServiceWriteTarget("forge_agent_runs");
        const persisted = await updateCurrentTickRow(admin, id, status, detail);
        if (persisted.ok) {
          logCron("TICK", {
            status,
            recovered: detail.recovered,
            claimed: detail.claimed,
            generated: detail.generated,
            fallbacks: detail.fallbacks,
          });
        }
        return persisted;
      }),
    reconcileAbandoned:
      deps.reconcileAbandoned ??
      ((currentTickId, at) =>
        reconcileAbandonedTicks(admin, currentTickId, at)),
    listDrafting:
      deps.listDrafting ?? ((signal) => listDraftingActions(admin, signal)),
    recoverRows:
      deps.recoverRows ??
      ((rows, metrics) => recoverStaleDrafts(admin, rows, metrics)),
    claimDue:
      deps.claimDue ??
      (async (tickId, limit) => {
        const { data, error } = await admin.rpc("claim_due_forge_cues", {
          p_limit: limit,
          p_cron_run_id: tickId,
        });
        return { data, error };
      }),
    processClaim:
      deps.processClaim ??
      ((claim, tickId, metrics, options) =>
        processClaim(admin, claim, tickId, metrics, options)),
  });
  return result;
}
