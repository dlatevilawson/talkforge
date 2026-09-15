import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCheckInCopy } from "./copy.ts";
import { forgeAgentCronHttpStatus } from "./cron-auth.ts";
import { runForgeAgentCronWithDeps } from "./cron-runner.ts";
import {
  FORGE_AGENT_CRON_CLAIM_LIMIT,
  FORGE_AGENT_CRON_CONCURRENCY,
  FORGE_AGENT_CRON_FINALIZE_BUDGET_MS,
  FORGE_AGENT_CRON_MAX_DURATION_MS,
  FORGE_AGENT_CRON_MODEL_START_BUDGET_MS,
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
});
