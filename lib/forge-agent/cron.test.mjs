import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { forgeAgentCronHttpStatus } from "./cron-auth.ts";
import { runForgeAgentCronWithDeps } from "./cron-runner.ts";
import {
  FORGE_AGENT_CRON_FINALIZE_BUDGET_MS,
  FORGE_AGENT_CRON_MAX_DURATION_MS,
} from "./types.ts";

function createHarness(overrides = {}) {
  const ticks = new Map();
  const calls = {
    claim: 0,
    draft: 0,
    recover: 0,
    abandoned: [],
  };
  let now = 0;
  const harness = {
    now: () => now,
    advance(ms) {
      now += ms;
    },
    ticks,
    calls,
    deps: {
      now: () => now,
      writeTick: async () => {
        ticks.set("tick-current", { status: "started", detail: {} });
        return { id: "tick-current" };
      },
      updateTick: async (id, status, detail) => {
        ticks.set(id, { status, detail });
      },
      reconcileAbandoned: async (currentTickId) => {
        calls.abandoned.push(currentTickId);
      },
      listDrafting: async () => ({ data: [], error: null }),
      recoverRows: async () => {
        calls.recover += 1;
      },
      claimDue: async () => {
        calls.claim += 1;
        return { data: [], error: null };
      },
      processClaim: async () => {
        calls.draft += 1;
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
    assert.equal(harness.ticks.get("tick-current").status, "completed");
  });

  it("marks abandoned started ticks failed without touching the current tick", async () => {
    const abandoned = [];
    const harness = createHarness({
      reconcileAbandoned: async (currentTickId) => {
        abandoned.push(currentTickId);
      },
    });
    await runForgeAgentCronWithDeps(harness.deps);
    assert.deepEqual(abandoned, ["tick-current"]);
    assert.equal(harness.ticks.get("tick-current").status, "completed");
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

  it("stops remaining claims when the finalize budget is exhausted", async () => {
    let now = 0;
    const claims = [1, 2, 3, 4].map((n) => ({
      action_id: `a${n}`,
      cue_id: `c${n}`,
      user_id: `u${n}`,
      generation_allowed: true,
      attempt_id: `att-${n}`,
    }));
    const harness = createHarness({
      now: () => now,
      claimDue: async () => ({ data: claims, error: null }),
      processClaim: async () => {
        now =
          FORGE_AGENT_CRON_MAX_DURATION_MS - FORGE_AGENT_CRON_FINALIZE_BUDGET_MS;
      },
    });
    const result = await runForgeAgentCronWithDeps(harness.deps);
    assert.equal(result.status, "partial");
    assert.ok(result.metrics.errorCodes.includes("CRON_TIME_BUDGET"));
    const tick = harness.ticks.get("tick-current");
    assert.notEqual(tick.status, "started");
    assert.equal(tick.status, "partial");
    assert.equal(tick.detail.stage, "time_budget");
  });
});
