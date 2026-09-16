import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCheckInCopy } from "./copy.ts";
import { forgeAgentCronHttpStatus } from "./cron-auth.ts";
import { reconcileAbandonedTickRows } from "./cron-guard.ts";
import { runForgeAgentCronWithDeps } from "./cron-runner.ts";
import {
  FORGE_AGENT_CRON_ABANDONED_MS,
  FORGE_AGENT_CRON_CLAIM_LIMIT,
  FORGE_AGENT_CRON_CONCURRENCY,
  FORGE_AGENT_CRON_FINALIZE_BUDGET_MS,
  FORGE_AGENT_CRON_MAX_DURATION_MS,
  FORGE_AGENT_CRON_MODEL_START_BUDGET_MS,
  FORGE_AGENT_CRON_SHUTDOWN_MARGIN_MS,
  FORGE_AGENT_CRON_TICK_UPDATE_TIMEOUT_MS,
} from "./types.ts";

function claimRow(n, extras = {}) {
  return {
    action_id: `a${n}`,
    cue_id: `c${n}`,
    user_id: `u${n}`,
    generation_allowed: true,
    attempt_id: `att-${n}`,
    ...extras,
  };
}

function createHarness(overrides = {}) {
  const ticks = new Map();
  const calls = {
    claim: 0,
    claimLimits: [],
    draft: 0,
    model: 0,
    template: 0,
    recover: 0,
    abandoned: [],
    payloads: [],
    processed: [],
    drafting: [],
    attempts: [],
  };
  let now = 0;
  const harness = {
    now: () => now,
    advance(ms) {
      now += ms;
    },
    ticks,
    calls,
    setNow(value) {
      now = value;
    },
    deps: {
      now: () => now,
      writeTick: async () => {
        ticks.set("tick-current", { status: "started", detail: {} });
        return { id: "tick-current" };
      },
      updateTick: async (id, status, detail) => {
        ticks.set(id, { status, detail });
        return { ok: true };
      },
      reconcileAbandoned: async (currentTickId) => {
        calls.abandoned.push(currentTickId);
        return { ok: true, marked: 0 };
      },
      listDrafting: async () => ({ data: [], error: null }),
      recoverRows: async () => {
        calls.recover += 1;
      },
      claimDue: async (_tickId, limit) => {
        calls.claim += 1;
        calls.claimLimits.push(limit);
        return { data: [], error: null };
      },
      processClaim: async (claim, _tickId, metrics, options) => {
        calls.draft += 1;
        calls.processed.push({ claim, options });
        const idx = calls.drafting.indexOf(claim.action_id);
        if (idx >= 0) calls.drafting.splice(idx, 1);
        if (options?.callModel) {
          calls.model += 1;
          calls.payloads.push({ source: "model" });
        } else {
          calls.template += 1;
          metrics.fallbacks += 1;
          calls.payloads.push(
            buildCheckInCopy({
              kind: "homework",
              title: "Declared cue",
              successCriteria: null,
            })
          );
          if (claim.generation_allowed && claim.attempt_id) {
            calls.attempts.push({
              id: claim.attempt_id,
              status: "fallback",
              detail: {
                errorCode: "CRON_TIME_BUDGET",
                inputTokens: 0,
                outputTokens: 0,
                action_id: claim.action_id,
                cue_id: claim.cue_id,
              },
            });
          }
        }
      },
      ...overrides,
    },
  };
  if (overrides.listDrafting) harness.deps.listDrafting = overrides.listDrafting;
  if (overrides.claimDue) harness.deps.claimDue = overrides.claimDue;
  if (overrides.processClaim) harness.deps.processClaim = overrides.processClaim;
  if (overrides.recoverRows) harness.deps.recoverRows = overrides.recoverRows;
  if (overrides.reconcileAbandoned) {
    harness.deps.reconcileAbandoned = overrides.reconcileAbandoned;
  }
  if (overrides.updateTick) harness.deps.updateTick = overrides.updateTick;
  if (overrides.now) harness.deps.now = overrides.now;
  return harness;
}

describe("Forge Agent cron runner fail-closed recovery", () => {
  it("does not claim or draft when the recovery list returns PostgREST error", async () => {
    const harness = createHarness({
      listDrafting: async () => ({
        data: null,
        error: { code: "PGRST301", status: 503, message: "secret cue title" },
      }),
    });
    const result = await runForgeAgentCronWithDeps(harness.deps);
    assert.equal(result.status, "failed");
    assert.equal(forgeAgentCronHttpStatus(result.status), 500);
    assert.equal(harness.calls.claim, 0);
    assert.equal(harness.calls.draft, 0);
    const tick = harness.ticks.get("tick-current");
    assert.equal(tick.status, "failed");
    assert.equal(tick.detail.stage, "recover_list");
    assert.deepEqual(tick.detail.errorCodes, ["RECOVER_LIST", "PGRST301"]);
    assert.equal(tick.detail.postgrestCode, "PGRST301");
    assert.equal(tick.detail.postgrestStatus, 503);
    assert.ok(!JSON.stringify(tick.detail).includes("secret"));
  });

  it("does not claim or draft when the recovery list hangs past timeout and retry", async () => {
    const harness = createHarness({
      listDrafting: (signal) =>
        new Promise((_, reject) => {
          signal.addEventListener(
            "abort",
            () =>
              reject(Object.assign(new Error("aborted"), { name: "AbortError" })),
            { once: true }
          );
        }),
    });
    const result = await runForgeAgentCronWithDeps(harness.deps);
    assert.equal(result.status, "failed");
    assert.equal(forgeAgentCronHttpStatus(result.status), 500);
    assert.equal(harness.calls.claim, 0);
    assert.equal(harness.calls.draft, 0);
    const tick = harness.ticks.get("tick-current");
    assert.equal(tick.status, "failed");
    assert.equal(tick.detail.stage, "recover_list");
    assert.ok(tick.detail.errorCodes.includes("RECOVER_LIST"));
    assert.ok(tick.detail.errorCodes.includes("RECOVER_LIST_TIMEOUT"));
  });

  it("claims after a successful recovery list", async () => {
    const harness = createHarness();
    const result = await runForgeAgentCronWithDeps(harness.deps);
    assert.equal(result.status, "completed");
    assert.equal(harness.calls.recover, 1);
    assert.equal(harness.calls.claim, 1);
    assert.deepEqual(harness.calls.claimLimits, [FORGE_AGENT_CRON_CONCURRENCY]);
    assert.equal(harness.ticks.get("tick-current").status, "completed");
  });

  it("marks abandoned started ticks failed without touching the current tick", async () => {
    const abandoned = [];
    const harness = createHarness({
      reconcileAbandoned: async (currentTickId) => {
        abandoned.push(currentTickId);
        return { ok: true, marked: 1 };
      },
    });
    await runForgeAgentCronWithDeps(harness.deps);
    assert.deepEqual(abandoned, ["tick-current"]);
    assert.equal(harness.ticks.get("tick-current").status, "completed");
  });

  it("does not claim or call the model when abandoned-tick listing fails", async () => {
    let contextLoads = 0;
    const harness = createHarness({
      reconcileAbandoned: async () => ({
        ok: false,
        error: { code: "PGRST301", status: 503, message: "secret abandoned title" },
      }),
      recoverRows: async () => {
        contextLoads += 1;
      },
    });
    const result = await runForgeAgentCronWithDeps(harness.deps);
    assert.equal(result.status, "failed");
    assert.equal(forgeAgentCronHttpStatus(result.status), 500);
    assert.equal(harness.calls.claim, 0);
    assert.equal(harness.calls.draft, 0);
    assert.equal(harness.calls.model, 0);
    assert.equal(contextLoads, 0);
    const tick = harness.ticks.get("tick-current");
    assert.equal(tick.status, "failed");
    assert.equal(tick.detail.stage, "abandoned");
    assert.ok(tick.detail.errorCodes.includes("CRON_ABANDONED"));
    assert.equal(tick.detail.postgrestCode, "PGRST301");
    assert.equal(tick.detail.postgrestStatus, 503);
    assert.ok(!JSON.stringify(tick.detail).includes("secret"));
  });

  it("does not claim or call the model when abandoned-tick updating fails", async () => {
    const harness = createHarness({
      reconcileAbandoned: async () => ({
        ok: false,
        error: { code: "42501", status: 403 },
      }),
    });
    const result = await runForgeAgentCronWithDeps(harness.deps);
    assert.equal(result.status, "failed");
    assert.equal(forgeAgentCronHttpStatus(result.status), 500);
    assert.equal(harness.calls.claim, 0);
    assert.equal(harness.calls.model, 0);
    const tick = harness.ticks.get("tick-current");
    assert.equal(tick.status, "failed");
    assert.equal(tick.detail.stage, "abandoned");
    assert.equal(tick.detail.postgrestCode, "42501");
    assert.equal(tick.detail.postgrestStatus, 403);
  });

  it("writes a failed audit row when finalize budget is exhausted before claim", async () => {
    let now = 0;
    const harness = createHarness({
      now: () => now,
      listDrafting: async () => {
        now = FORGE_AGENT_CRON_MAX_DURATION_MS - FORGE_AGENT_CRON_FINALIZE_BUDGET_MS;
        return { data: [], error: null };
      },
    });
    const result = await runForgeAgentCronWithDeps(harness.deps);
    assert.equal(result.status, "failed");
    assert.equal(harness.calls.claim, 0);
    assert.equal(harness.calls.draft, 0);
    const tick = harness.ticks.get("tick-current");
    assert.equal(tick.status, "failed");
    assert.equal(tick.detail.stage, "time_budget");
    assert.ok(tick.detail.errorCodes.includes("CRON_TIME_BUDGET"));
  });

  it("claims in batches of at most 3 and never exceeds 12 total", async () => {
    const pool = Array.from({ length: 20 }, (_, index) => claimRow(index + 1));
    const harness = createHarness({
      claimDue: async (_tickId, limit) => {
        harness.calls.claim += 1;
        harness.calls.claimLimits.push(limit);
        assert.ok(limit <= FORGE_AGENT_CRON_CONCURRENCY);
        return { data: pool.splice(0, limit), error: null };
      },
    });
    const result = await runForgeAgentCronWithDeps(harness.deps);
    assert.equal(result.metrics.claimed, FORGE_AGENT_CRON_CLAIM_LIMIT);
    assert.ok(harness.calls.claimLimits.every((limit) => limit <= 3));
    assert.equal(harness.calls.claim, 4);
    assert.deepEqual(harness.calls.claimLimits, [3, 3, 3, 3]);
    assert.equal(result.metrics.claimed, 12);
    assert.equal(harness.calls.draft, 12);
  });

  it("finalizes every claimed action when the budget expires and does not leave drafting", async () => {
    let now = 0;
    const pool = Array.from({ length: 6 }, (_, index) => claimRow(index + 1));
    const harness = createHarness({
      now: () => now,
      claimDue: async (_tickId, limit) => {
        harness.calls.claim += 1;
        harness.calls.claimLimits.push(limit);
        const batch = pool.splice(0, limit);
        harness.calls.drafting.push(...batch.map((row) => row.action_id));
        return { data: batch, error: null };
      },
      processClaim: async (claim, _tickId, metrics, options) => {
        const idx = harness.calls.drafting.indexOf(claim.action_id);
        if (idx >= 0) harness.calls.drafting.splice(idx, 1);
        harness.calls.processed.push(claim.action_id);
        if (!options?.callModel) {
          metrics.fallbacks += 1;
          harness.calls.template += 1;
        }
        now =
          FORGE_AGENT_CRON_MAX_DURATION_MS - FORGE_AGENT_CRON_FINALIZE_BUDGET_MS;
      },
    });
    const result = await runForgeAgentCronWithDeps(harness.deps);
    assert.equal(harness.calls.claim, 1);
    assert.deepEqual(harness.calls.claimLimits, [3]);
    assert.equal(harness.calls.processed.length, 3);
    assert.deepEqual(harness.calls.drafting, []);
    assert.ok(result.metrics.errorCodes.includes("CRON_TIME_BUDGET"));
    assert.equal(result.status, "partial");
    assert.notEqual(harness.ticks.get("tick-current").status, "started");
  });

  it("does not start a model call with fewer than 15 seconds remaining", async () => {
    let now = 0;
    const pool = [claimRow(1)];
    const harness = createHarness({
      now: () => now,
      listDrafting: async () => {
        now =
          FORGE_AGENT_CRON_MAX_DURATION_MS -
          (FORGE_AGENT_CRON_MODEL_START_BUDGET_MS - 1);
        return { data: [], error: null };
      },
      claimDue: async (_tickId, limit) => {
        harness.calls.claim += 1;
        harness.calls.claimLimits.push(limit);
        return { data: pool.splice(0, limit), error: null };
      },
    });
    const result = await runForgeAgentCronWithDeps(harness.deps);
    assert.equal(harness.calls.model, 0);
    assert.equal(harness.calls.template, 1);
    assert.equal(harness.calls.processed[0].options.callModel, false);
    assert.ok(result.metrics.errorCodes.includes("CRON_TIME_BUDGET"));
    assert.deepEqual(
      harness.calls.payloads[0],
      buildCheckInCopy({
        kind: "homework",
        title: "Declared cue",
        successCriteria: null,
      })
    );
  });

  it("cannot report completed when current-tick persistence is not confirmed", async () => {
    const harness = createHarness({
      updateTick: async (id, status, detail) => {
        harness.ticks.set(id, { status: "started", detail });
        return { ok: false, error: { code: "42501", status: 403 } };
      },
    });
    const result = await runForgeAgentCronWithDeps(harness.deps);
    assert.equal(result.status, "failed");
    assert.equal(forgeAgentCronHttpStatus(result.status), 500);
    assert.notEqual(result.status, "completed");
    assert.notEqual(result.status, "partial");
    assert.ok(result.metrics.errorCodes.includes("CRON_TICK_UPDATE"));
  });

  it("cannot report success when current-tick update affects zero rows", async () => {
    const harness = createHarness({
      updateTick: async (id, status, detail) => {
        harness.ticks.set(id, { status: "started", detail });
        return {
          ok: false,
          error: { code: "PGRST116", details: "The result contains 0 rows" },
        };
      },
    });
    const result = await runForgeAgentCronWithDeps(harness.deps);
    assert.equal(result.status, "failed");
    assert.equal(forgeAgentCronHttpStatus(result.status), 500);
    assert.equal(harness.ticks.get("tick-current").status, "started");
  });

  it("cannot report success when current-tick update returns undefined or null", async () => {
    const harnessNull = createHarness({
      updateTick: async (id, status, detail) => {
        harnessNull.ticks.set(id, { status: "started", detail });
        return null;
      },
    });
    const resultNull = await runForgeAgentCronWithDeps(harnessNull.deps);
    assert.equal(resultNull.status, "failed");
    assert.equal(forgeAgentCronHttpStatus(resultNull.status), 500);

    const harnessUndef = createHarness({
      updateTick: async (id, status, detail) => {
        harnessUndef.ticks.set(id, { status: "started", detail });
        return undefined;
      },
    });
    const resultUndef = await runForgeAgentCronWithDeps(harnessUndef.deps);
    assert.equal(resultUndef.status, "failed");
    assert.equal(forgeAgentCronHttpStatus(resultUndef.status), 500);
  });

  it("persists stage = 'time_budget' whenever CRON_TIME_BUDGET affects processing", async () => {
    let now = 0;
    const pool = [claimRow(1)];
    const harness = createHarness({
      now: () => now,
      listDrafting: async () => {
        now =
          FORGE_AGENT_CRON_MAX_DURATION_MS -
          (FORGE_AGENT_CRON_MODEL_START_BUDGET_MS - 1);
        return { data: [], error: null };
      },
      claimDue: async (_tickId, limit) => {
        return { data: pool.splice(0, limit), error: null };
      },
    });
    const result = await runForgeAgentCronWithDeps(harness.deps);
    assert.equal(result.status, "partial");
    const tick = harness.ticks.get("tick-current");
    assert.equal(tick.detail.stage, "time_budget");
    assert.ok(tick.detail.errorCodes.includes("CRON_TIME_BUDGET"));
  });

  it("budget-skipped generation-allowed claim template-finalizes and marks attempt fallback with zero tokens and CRON_TIME_BUDGET", async () => {
    let now = 0;
    const claim = claimRow(1, { generation_allowed: true, attempt_id: "att-1" });
    const pool = [claim];
    const harness = createHarness({
      now: () => now,
      listDrafting: async () => {
        now =
          FORGE_AGENT_CRON_MAX_DURATION_MS -
          (FORGE_AGENT_CRON_MODEL_START_BUDGET_MS - 1);
        return { data: [], error: null };
      },
      claimDue: async (_tickId, limit) => {
        return { data: pool.splice(0, limit), error: null };
      },
    });
    const result = await runForgeAgentCronWithDeps(harness.deps);
    assert.equal(harness.calls.model, 0);
    assert.equal(harness.calls.template, 1);
    assert.equal(harness.calls.attempts.length, 1);
    assert.equal(harness.calls.attempts[0].id, "att-1");
    assert.equal(harness.calls.attempts[0].status, "fallback");
    assert.equal(harness.calls.attempts[0].detail.errorCode, "CRON_TIME_BUDGET");
    assert.equal(harness.calls.attempts[0].detail.inputTokens, 0);
    assert.equal(harness.calls.attempts[0].detail.outputTokens, 0);
    assert.ok(result.metrics.errorCodes.includes("CRON_TIME_BUDGET"));
    assert.equal(result.status, "partial");
    assert.equal(harness.ticks.get("tick-current").detail.stage, "time_budget");
  });

  it("failure to template-finalize records FINALIZE and cannot produce a completed tick", async () => {
    const claim = claimRow(1, { generation_allowed: true, attempt_id: "att-1" });
    const harness = createHarness({
      claimDue: async () => ({ data: [claim], error: null }),
      processClaim: async (_c, _t, cronMetrics) => {
        cronMetrics.errorCodes.push("FINALIZE");
      },
    });
    const result = await runForgeAgentCronWithDeps(harness.deps);
    assert.notEqual(result.status, "completed");
    assert.ok(result.metrics.errorCodes.includes("FINALIZE"));
  });

  it("failure to update the reserved attempt is surfaced and cannot produce a completed tick", async () => {
    const claim = claimRow(1, { generation_allowed: true, attempt_id: "att-1" });
    const harness = createHarness({
      claimDue: async () => ({ data: [claim], error: null }),
      processClaim: async (_c, _t, cronMetrics) => {
        cronMetrics.errorCodes.push("ATTEMPT");
      },
    });
    const result = await runForgeAgentCronWithDeps(harness.deps);
    assert.notEqual(result.status, "completed");
    assert.ok(result.metrics.errorCodes.includes("ATTEMPT"));
  });

  it("aborts a hanging abandoned-tick list query and fails closed before claim/model work", async () => {
    let recovered = 0;
    let claimed = 0;
    let modelCalled = 0;
    const harness = createHarness({
      reconcileAbandoned: async (currentTickId, now) => {
        return reconcileAbandonedTickRows({
          currentTickId,
          now,
          timeoutMs: FORGE_AGENT_CRON_ABANDONED_MS,
          queryTimeoutMs: 20,
          maxAttempts: 1,
          list: (signal) =>
            new Promise((_, reject) => {
              signal.addEventListener(
                "abort",
                () =>
                  reject(
                    Object.assign(new Error("aborted"), { name: "AbortError" })
                  ),
                { once: true }
              );
            }),
          update: async () => ({ error: null }),
        });
      },
      recoverRows: async () => {
        recovered += 1;
      },
      claimDue: async () => {
        claimed += 1;
        return { data: [], error: null };
      },
      processClaim: async () => {
        modelCalled += 1;
      },
    });
    const result = await runForgeAgentCronWithDeps(harness.deps);
    assert.equal(result.status, "failed");
    assert.equal(forgeAgentCronHttpStatus(result.status), 500);
    assert.equal(recovered, 0);
    assert.equal(claimed, 0);
    assert.equal(modelCalled, 0);
    const tick = harness.ticks.get("tick-current");
    assert.equal(tick.status, "failed");
    assert.equal(tick.detail.stage, "abandoned");
    assert.ok(tick.detail.errorCodes.includes("CRON_ABANDONED"));
  });

  it("aborts a hanging abandoned-tick update and fails closed before claim/model work", async () => {
    let recovered = 0;
    let claimed = 0;
    let modelCalled = 0;
    const nowMs = Date.parse("2026-09-13T16:00:00.000Z");
    const harness = createHarness({
      now: () => nowMs,
      reconcileAbandoned: async (currentTickId, now) => {
        return reconcileAbandonedTickRows({
          currentTickId,
          now: nowMs,
          timeoutMs: FORGE_AGENT_CRON_ABANDONED_MS,
          queryTimeoutMs: 20,
          maxAttempts: 1,
          list: async () => ({
            data: [
              { id: "tick-current", created_at: "2026-09-13T15:58:00.000Z" },
              { id: "tick-old", created_at: "2026-09-13T15:58:00.000Z" },
            ],
            error: null,
          }),
          update: (_id, _duration, signal) =>
            new Promise((_, reject) => {
              signal.addEventListener(
                "abort",
                () =>
                  reject(
                    Object.assign(new Error("aborted"), { name: "AbortError" })
                  ),
                { once: true }
              );
            }),
        });
      },
      recoverRows: async () => {
        recovered += 1;
      },
      claimDue: async () => {
        claimed += 1;
        return { data: [], error: null };
      },
      processClaim: async () => {
        modelCalled += 1;
      },
    });
    const result = await runForgeAgentCronWithDeps(harness.deps);
    assert.equal(result.status, "failed");
    assert.equal(forgeAgentCronHttpStatus(result.status), 500);
    assert.equal(recovered, 0);
    assert.equal(claimed, 0);
    assert.equal(modelCalled, 0);
    const tick = harness.ticks.get("tick-current");
    assert.equal(tick.status, "failed");
    assert.equal(tick.detail.stage, "abandoned");
    assert.ok(tick.detail.errorCodes.includes("CRON_ABANDONED"));
  });

  it("aborts a hanging intended tick update and cannot report success", async () => {
    let fallbackAttempted = false;
    const harness = createHarness({
      updateTick: async (id, status, detail) => {
        if (status === "completed") {
          return { ok: false, error: new Error("abort timeout") };
        }
        if (status === "failed") {
          fallbackAttempted = true;
          return { ok: false, error: new Error("fallback error") };
        }
        return { ok: true };
      },
    });
    const result = await runForgeAgentCronWithDeps(harness.deps);
    assert.equal(result.status, "failed");
    assert.equal(forgeAgentCronHttpStatus(result.status), 500);
    assert.equal(fallbackAttempted, true);
    assert.notEqual(result.status, "completed");
    assert.notEqual(result.status, "partial");
    assert.ok(result.metrics.errorCodes.includes("CRON_TICK_UPDATE"));
  });

  it("aborts a hanging fallback-to-failed update and fails closed", async () => {
    let fallbackCalls = 0;
    const harness = createHarness({
      updateTick: async (id, status, detail) => {
        if (status === "completed") {
          return { ok: false, error: new Error("intended update timed out") };
        }
        if (status === "failed") {
          fallbackCalls += 1;
          return { ok: false, error: new Error("fallback update timed out") };
        }
        return { ok: true };
      },
    });
    const result = await runForgeAgentCronWithDeps(harness.deps);
    assert.equal(result.status, "failed");
    assert.equal(forgeAgentCronHttpStatus(result.status), 500);
    assert.equal(fallbackCalls, 1);
    assert.ok(result.metrics.errorCodes.includes("CRON_TICK_UPDATE"));
  });

  it("timed-out completed/partial update followed by confirmed failed update returns failed", async () => {
    let fallbackConfirmed = false;
    const harness = createHarness({
      updateTick: async (id, status, detail) => {
        if (status === "completed" || status === "partial") {
          return { ok: false, error: new Error("intended update timed out") };
        }
        if (status === "failed") {
          fallbackConfirmed = true;
          harness.ticks.set(id, { status, detail });
          return { ok: true };
        }
        return { ok: true };
      },
    });
    const result = await runForgeAgentCronWithDeps(harness.deps);
    assert.equal(result.status, "failed");
    assert.equal(forgeAgentCronHttpStatus(result.status), 500);
    assert.equal(fallbackConfirmed, true);
    assert.equal(harness.ticks.get("tick-current").status, "failed");
    assert.ok(result.metrics.errorCodes.includes("CRON_TICK_UPDATE"));
  });

  it("if both bounded updates fail the runner returns failed and never reports completed or partial", async () => {
    const harness = createHarness({
      updateTick: async (id, status, detail) => {
        return { ok: false, error: { code: "57014", message: "statement timeout" } };
      },
    });
    const result = await runForgeAgentCronWithDeps(harness.deps);
    assert.equal(result.status, "failed");
    assert.equal(forgeAgentCronHttpStatus(result.status), 500);
    assert.notEqual(result.status, "completed");
    assert.notEqual(result.status, "partial");
    assert.ok(result.metrics.errorCodes.includes("CRON_TICK_UPDATE"));
  });

  it("skips fallback update to failed if no time remaining in cron budget", async () => {
    let fallbackAttempted = false;
    let now = 0;
    const harness = createHarness({
      now: () => now,
      updateTick: async (id, status, detail) => {
        if (status === "completed" || status === "partial") {
          now = FORGE_AGENT_CRON_MAX_DURATION_MS + 1000;
          return { ok: false, error: new Error("timed out") };
        }
        if (status === "failed") {
          fallbackAttempted = true;
          return { ok: true };
        }
        return { ok: true };
      },
    });
    const result = await runForgeAgentCronWithDeps(harness.deps);
    assert.equal(result.status, "failed");
    assert.equal(fallbackAttempted, false);
    assert.ok(result.metrics.errorCodes.includes("CRON_TICK_UPDATE"));
  });

  it("first update times out after 4 seconds leaving less than 4 seconds: fallback is not started", async () => {
    let fallbackAttempted = false;
    let now = 0;
    const harness = createHarness({
      now: () => now,
      updateTick: async (id, status, detail) => {
        if (status === "completed" || status === "partial") {
          now =
            FORGE_AGENT_CRON_MAX_DURATION_MS -
            (FORGE_AGENT_CRON_TICK_UPDATE_TIMEOUT_MS - 1000);
          return { ok: false, error: new Error("intended update timed out") };
        }
        if (status === "failed") {
          fallbackAttempted = true;
          return { ok: true };
        }
        return { ok: true };
      },
    });
    const result = await runForgeAgentCronWithDeps(harness.deps);
    assert.equal(result.status, "failed");
    assert.equal(fallbackAttempted, false);
    assert.ok(result.metrics.errorCodes.includes("CRON_TICK_UPDATE"));
  });

  it("first update fails quickly with at least 4 seconds remaining: bounded fallback is attempted", async () => {
    let fallbackAttempted = false;
    let now = 0;
    const harness = createHarness({
      now: () => now,
      updateTick: async (id, status, detail) => {
        if (status === "completed" || status === "partial") {
          now =
            FORGE_AGENT_CRON_MAX_DURATION_MS -
            (FORGE_AGENT_CRON_TICK_UPDATE_TIMEOUT_MS +
              FORGE_AGENT_CRON_SHUTDOWN_MARGIN_MS +
              1000);
          return { ok: false, error: { code: "42501" } };
        }
        if (status === "failed") {
          fallbackAttempted = true;
          harness.ticks.set(id, { status, detail });
          return { ok: true };
        }
        return { ok: true };
      },
    });
    const result = await runForgeAgentCronWithDeps(harness.deps);
    assert.equal(result.status, "failed");
    assert.equal(fallbackAttempted, true);
    assert.equal(harness.ticks.get("tick-current").status, "failed");
    assert.ok(result.metrics.errorCodes.includes("CRON_TICK_UPDATE"));
  });
});
