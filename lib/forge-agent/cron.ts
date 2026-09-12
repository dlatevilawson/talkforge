import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { compactCoachContext, readApprovedCoachingContext } from "./context.ts";
import { isUsableCronTick } from "./cron-auth.ts";
import { buildCheckInCopy } from "./copy.ts";
import { draftCheckInPayload } from "./draft.ts";
import {
  attemptMatchesAction,
  isStaleDraftingTimestamp,
  sanitizeAttemptDetail,
} from "./draft-validate.ts";
import { assertForgeAgentServiceWriteTarget } from "./policy.ts";
import {
  FORGE_AGENT_CRON_CLAIM_LIMIT,
  FORGE_AGENT_CRON_CONCURRENCY,
  FORGE_AGENT_STALE_DRAFT_MS,
  type ForgeCheckInPayload,
  type ForgeCueKind,
} from "./types.ts";

export type ClaimedCue = {
  action_id: string;
  cue_id: string;
  user_id: string;
  generation_allowed: boolean;
  attempt_id: string | null;
};

type CronMetrics = {
  recovered: number;
  claimed: number;
  generated: number;
  fallbacks: number;
  inputTokens: number;
  outputTokens: number;
  errorCodes: string[];
};

function emptyMetrics(): CronMetrics {
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
  metrics: CronMetrics
): Promise<void> {
  const { data, error } = await admin
    .from("forge_agent_actions")
    .select("id, user_id, cue_id, updated_at, created_at")
    .eq("status", "drafting");
  if (error) {
    metrics.errorCodes.push(error.code ?? "RECOVER_LIST");
    return;
  }

  const stale = (data ?? []).filter((row) =>
    isStaleDraftingTimestamp(
      String(row.updated_at ?? row.created_at),
      new Date(),
      FORGE_AGENT_STALE_DRAFT_MS
    )
  );
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
  metrics: CronMetrics
): Promise<void> {
  const cue = await loadCue(admin, claim.cue_id);
  if (!cue) {
    metrics.errorCodes.push("CUE_MISSING");
    return;
  }

  if (!claim.generation_allowed) {
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

function mapClaimedCue(row: Record<string, unknown>): ClaimedCue {
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

export async function runForgeAgentCron(admin: SupabaseClient): Promise<{
  status: "completed" | "partial" | "failed";
  metrics: CronMetrics;
}> {
  const started = Date.now();
  const metrics = emptyMetrics();
  const tick = await writeRun(admin, "forge_agent_runs", {
    kind: "cron_tick",
    status: "started",
    detail: {},
  });

  if (!isUsableCronTick(tick)) {
    metrics.errorCodes.push("CRON_TICK_FAILED");
    return { status: "failed", metrics };
  }

  try {
    await recoverStaleDrafts(admin, metrics);

    const { data: claimed, error } = await admin.rpc("claim_due_forge_cues", {
      p_limit: FORGE_AGENT_CRON_CLAIM_LIMIT,
      p_cron_run_id: tick.id,
    });
    if (error) {
      metrics.errorCodes.push(error.code ?? "CLAIM_RPC");
      await admin
        .from("forge_agent_runs")
        .update({
          status: "failed",
          detail: {
            recovered: metrics.recovered,
            errorCodes: metrics.errorCodes,
            durationMs: Date.now() - started,
          },
        })
        .eq("id", tick.id);
      return { status: "failed", metrics };
    }

    const claims = ((claimed ?? []) as Record<string, unknown>[]).map(
      mapClaimedCue
    );
    metrics.claimed = claims.length;
    await mapLimit(claims, FORGE_AGENT_CRON_CONCURRENCY, (claim) =>
      processClaim(admin, claim, tick.id, metrics)
    );

    const status =
      metrics.errorCodes.length === 0 ? "completed" : "partial";
    await admin
      .from("forge_agent_runs")
      .update({
        status,
        detail: {
          recovered: metrics.recovered,
          claimed: metrics.claimed,
          generated: metrics.generated,
          fallbacks: metrics.fallbacks,
          inputTokens: metrics.inputTokens,
          outputTokens: metrics.outputTokens,
          errorCodes: metrics.errorCodes,
          durationMs: Date.now() - started,
        },
      })
      .eq("id", tick.id);
    logCron("TICK", {
      status,
      recovered: metrics.recovered,
      claimed: metrics.claimed,
      generated: metrics.generated,
      fallbacks: metrics.fallbacks,
    });
    return { status, metrics };
  } catch {
    metrics.errorCodes.push("CRON_UNHANDLED");
    await admin
      .from("forge_agent_runs")
      .update({
        status: "failed",
        detail: {
          errorCodes: metrics.errorCodes,
          durationMs: Date.now() - started,
        },
      })
      .eq("id", tick.id);
    return { status: "failed", metrics };
  }
}
