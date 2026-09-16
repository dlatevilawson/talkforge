import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCheckInCopy } from "./copy.ts";
import {
  buildCronTickDetail,
  hasFinalizeBudget,
  hasModelStartBudget,
  inspectTickUpdateResult,
  isAbandonedCronTick,
  isTransientQueryFailure,
  nextClaimBatchLimit,
  planClaimProcessing,
  queryWithTimeoutAndRetry,
  reconcileAbandonedTickRows,
  sanitizePostgrestFailure,
  selectAbandonedTickIds,
  updateCurrentTickRow,
} from "./cron-guard.ts";
import {
  FORGE_AGENT_CRON_ABANDONED_MS,
  FORGE_AGENT_CRON_CLAIM_LIMIT,
  FORGE_AGENT_CRON_CONCURRENCY,
  FORGE_AGENT_CRON_FINALIZE_BUDGET_MS,
  FORGE_AGENT_CRON_MAX_DURATION_MS,
  FORGE_AGENT_CRON_MODEL_START_BUDGET_MS,
} from "./types.ts";

function createTickUpdateClient(result, calls = []) {
  return {
    calls,
    from(table) {
      calls.push({ op: "from", table });
      return {
        update(values) {
          calls.push({ op: "update", values });
          return {
            eq(column, value) {
              calls.push({ op: "eq", column, value });
              return {
                select(columns) {
                  calls.push({ op: "select", columns });
                  return {
                    async single() {
                      calls.push({ op: "single" });
                      return result;
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  };
}

describe("cron-guard", () => {
  it("sanitizes PostgREST failures without member content", () => {
    assert.deepEqual(
      sanitizePostgrestFailure({
        code: "PGRST301",
        status: 503,
        message: "secret title",
        details: "member body",
        hint: "prompt",
      }),
      { postgrestCode: "PGRST301", postgrestStatus: 503 }
    );
    const detail = buildCronTickDetail({
      stage: "recover_list",
      errorCodes: ["RECOVER_LIST"],
      error: { code: "PGRST301", status: 503, message: "secret" },
      durationMs: 12,
    });
    assert.equal(detail.stage, "recover_list");
    assert.equal(detail.postgrestCode, "PGRST301");
    assert.equal(detail.postgrestStatus, 503);
    assert.ok(!JSON.stringify(detail).includes("secret"));
  });

  it("selects abandoned started ticks and never the current tick", () => {
    const now = Date.parse("2026-09-13T16:00:00.000Z");
    const ids = selectAbandonedTickIds(
      [
        {
          id: "current",
          created_at: "2026-09-13T15:58:00.000Z",
        },
        {
          id: "old",
          created_at: "2026-09-13T15:58:00.000Z",
        },
        {
          id: "fresh",
          created_at: "2026-09-13T15:59:30.000Z",
        },
      ],
      "current",
      now,
      FORGE_AGENT_CRON_ABANDONED_MS
    );
    assert.deepEqual(ids, ["old"]);
    assert.equal(
      isAbandonedCronTick("2026-09-13T15:58:31.000Z", now, FORGE_AGENT_CRON_ABANDONED_MS),
      false
    );
  });

  it("reserves finalize budget before the 60s deadline", () => {
    const started = 1_000_000;
    assert.equal(
      hasFinalizeBudget(
        started,
        started + 54_999,
        FORGE_AGENT_CRON_MAX_DURATION_MS,
        FORGE_AGENT_CRON_FINALIZE_BUDGET_MS
      ),
      true
    );
    assert.equal(
      hasFinalizeBudget(
        started,
        started + 55_000,
        FORGE_AGENT_CRON_MAX_DURATION_MS,
        FORGE_AGENT_CRON_FINALIZE_BUDGET_MS
      ),
      false
    );
  });

  it("requires 15 seconds remaining before a generated draft may start", () => {
    const started = 1_000_000;
    assert.equal(
      hasModelStartBudget(
        started,
        started + 45_000,
        FORGE_AGENT_CRON_MAX_DURATION_MS,
        FORGE_AGENT_CRON_MODEL_START_BUDGET_MS
      ),
      true
    );
    assert.equal(
      hasModelStartBudget(
        started,
        started + 45_001,
        FORGE_AGENT_CRON_MAX_DURATION_MS,
        FORGE_AGENT_CRON_MODEL_START_BUDGET_MS
      ),
      false
    );
    assert.deepEqual(
      planClaimProcessing(true, 14_999, FORGE_AGENT_CRON_MODEL_START_BUDGET_MS),
      { callModel: false, errorCode: "CRON_TIME_BUDGET" }
    );
    assert.deepEqual(
      planClaimProcessing(true, 15_000, FORGE_AGENT_CRON_MODEL_START_BUDGET_MS),
      { callModel: true, errorCode: null }
    );
  });

  it("gives a budget-limited claimed action deterministic template copy", () => {
    const cue = {
      kind: "homework",
      title: "Call Sam",
      successCriteria: "stay brief",
    };
    const plan = planClaimProcessing(
      true,
      14_999,
      FORGE_AGENT_CRON_MODEL_START_BUDGET_MS
    );
    assert.equal(plan.callModel, false);
    assert.deepEqual(buildCheckInCopy(cue), {
      whySent: 'This check-in exists because you declared a homework: "Call Sam".',
      body: 'One next move: rehearse "Call Sam" until stay brief.',
      practiceHref: "/app/practice?start=1&title=Call%20Sam",
    });
  });

  it("claims at most the concurrency batch and never more than 12 total", () => {
    assert.equal(
      nextClaimBatchLimit(0, FORGE_AGENT_CRON_CLAIM_LIMIT, FORGE_AGENT_CRON_CONCURRENCY),
      3
    );
    assert.equal(
      nextClaimBatchLimit(9, FORGE_AGENT_CRON_CLAIM_LIMIT, FORGE_AGENT_CRON_CONCURRENCY),
      3
    );
    assert.equal(
      nextClaimBatchLimit(11, FORGE_AGENT_CRON_CLAIM_LIMIT, FORGE_AGENT_CRON_CONCURRENCY),
      1
    );
    assert.equal(
      nextClaimBatchLimit(12, FORGE_AGENT_CRON_CLAIM_LIMIT, FORGE_AGENT_CRON_CONCURRENCY),
      0
    );
  });

  it("times out a hanging query and retries once", async () => {
    let attempts = 0;
    const result = await queryWithTimeoutAndRetry(
      (signal) =>
        new Promise((resolve, reject) => {
          attempts += 1;
          signal.addEventListener(
            "abort",
            () => reject(Object.assign(new Error("aborted"), { name: "AbortError" })),
            { once: true }
          );
        }),
      { timeoutMs: 30, maxAttempts: 2 }
    );
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("expected failure");
    assert.equal(result.timedOut, true);
    assert.equal(attempts, 2);
    assert.equal(result.attempts, 2);
  });

  it("retries a transient recovery error once", async () => {
    let attempts = 0;
    const result = await queryWithTimeoutAndRetry(async () => {
      attempts += 1;
      if (attempts === 1) {
        return { data: null, error: { code: "PGRST301", status: 503 } };
      }
      return { data: [], error: null };
    }, { timeoutMs: 50, maxAttempts: 2 });
    assert.equal(result.ok, true);
    assert.equal(attempts, 2);
  });

  it("retries timeout, network, 408, 429, and 5xx failures", () => {
    assert.equal(
      isTransientQueryFailure(Object.assign(new Error("aborted"), { name: "AbortError" }), true),
      true
    );
    assert.equal(
      isTransientQueryFailure({ code: "ECONNRESET", message: "socket hang up" }),
      true
    );
    assert.equal(isTransientQueryFailure({ status: 408 }), true);
    assert.equal(isTransientQueryFailure({ status: 429 }), true);
    assert.equal(isTransientQueryFailure({ status: 503, code: "PGRST301" }), true);
  });

  it("does not retry permission, authentication, schema-cache, or validation errors", async () => {
    const deterministic = [
      { code: "42501", status: 403 },
      { code: "PGRST301", status: 401 },
      { code: "PGRST205", status: 400 },
      { code: "22P02", status: 400 },
      { status: 404, code: "PGRST116" },
    ];
    for (const error of deterministic) {
      let attempts = 0;
      const result = await queryWithTimeoutAndRetry(async () => {
        attempts += 1;
        return { data: null, error };
      }, { timeoutMs: 50, maxAttempts: 2 });
      assert.equal(result.ok, false);
      if (result.ok) throw new Error("expected failure");
      assert.equal(attempts, 1);
      assert.equal(result.attempts, 1);
      assert.equal(isTransientQueryFailure(error), false);
    }
  });

  it("detects a current-tick update error and cannot report success", async () => {
    const client = createTickUpdateClient({
      data: null,
      error: { code: "42501", status: 403, message: "permission denied for table" },
    });
    const result = await updateCurrentTickRow(
      client,
      "tick-1",
      "completed",
      { durationMs: 10 }
    );
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("expected failure");
    assert.equal(result.error.code, "42501");
    assert.ok(client.calls.some((call) => call.op === "select" && call.columns === "id, status"));
    assert.ok(client.calls.some((call) => call.op === "single"));
    assert.deepEqual(
      inspectTickUpdateResult(
        { data: { id: "tick-1", status: "completed" }, error: { code: "42501", status: 403 } },
        "tick-1",
        "completed"
      ),
      { ok: false, error: { code: "42501", status: 403 } }
    );
  });

  it("detects a current-tick update that affects zero rows", async () => {
    const zeroRow = await updateCurrentTickRow(
      createTickUpdateClient({
        data: null,
        error: { code: "PGRST116", details: "The result contains 0 rows" },
      }),
      "tick-1",
      "completed",
      { durationMs: 4 }
    );
    assert.equal(zeroRow.ok, false);
    const empty = inspectTickUpdateResult(
      { data: null, error: null },
      "tick-1",
      "completed"
    );
    assert.equal(empty.ok, false);
    const unexpected = inspectTickUpdateResult(
      { data: { id: "tick-1", status: "started" }, error: null },
      "tick-1",
      "completed"
    );
    assert.equal(unexpected.ok, false);
    const confirmed = inspectTickUpdateResult(
      { data: { id: "tick-1", status: "completed" }, error: null },
      "tick-1",
      "completed"
    );
    assert.equal(confirmed.ok, true);
  });

  it("fails closed when abandoned-tick listing fails", async () => {
    const result = await reconcileAbandonedTickRows({
      currentTickId: "tick-current",
      now: Date.parse("2026-09-13T16:00:00.000Z"),
      timeoutMs: FORGE_AGENT_CRON_ABANDONED_MS,
      list: async () => ({
        data: null,
        error: { code: "PGRST301", status: 503 },
      }),
      update: async () => {
        throw new Error("update must not run");
      },
    });
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("expected failure");
    assert.equal(result.error.code, "PGRST301");
  });

  it("fails closed when abandoned-tick updating fails", async () => {
    const updated = [];
    const result = await reconcileAbandonedTickRows({
      currentTickId: "tick-current",
      now: Date.parse("2026-09-13T16:00:00.000Z"),
      timeoutMs: FORGE_AGENT_CRON_ABANDONED_MS,
      list: async () => ({
        data: [
          { id: "tick-current", created_at: "2026-09-13T15:58:00.000Z" },
          { id: "tick-old", created_at: "2026-09-13T15:58:00.000Z" },
        ],
        error: null,
      }),
      update: async (id) => {
        updated.push(id);
        return { error: { code: "42501", status: 403 } };
      },
    });
    assert.equal(result.ok, false);
    if (result.ok) throw new Error("expected failure");
    assert.deepEqual(updated, ["tick-old"]);
    assert.equal(result.error.code, "42501");
  });

  it("aborts hanging abandoned-tick list and fails closed", async () => {
    let aborted = false;
    const result = await reconcileAbandonedTickRows({
      currentTickId: "tick-current",
      now: Date.parse("2026-09-13T16:00:00.000Z"),
      timeoutMs: FORGE_AGENT_CRON_ABANDONED_MS,
      queryTimeoutMs: 30,
      maxAttempts: 1,
      list: (signal) =>
        new Promise((_, reject) => {
          signal.addEventListener(
            "abort",
            () => {
              aborted = true;
              reject(
                Object.assign(new Error("aborted"), { name: "AbortError" })
              );
            },
            { once: true }
          );
        }),
      update: async () => ({ error: null }),
    });
    assert.equal(result.ok, false);
    assert.equal(aborted, true);
  });

  it("aborts hanging abandoned-tick update and fails closed", async () => {
    let aborted = false;
    const result = await reconcileAbandonedTickRows({
      currentTickId: "tick-current",
      now: Date.parse("2026-09-13T16:00:00.000Z"),
      timeoutMs: FORGE_AGENT_CRON_ABANDONED_MS,
      queryTimeoutMs: 30,
      maxAttempts: 1,
      list: async () => ({
        data: [
          { id: "tick-old", created_at: "2026-09-13T15:58:00.000Z" },
        ],
        error: null,
      }),
      update: (_id, _duration, signal) =>
        new Promise((_, reject) => {
          signal.addEventListener(
            "abort",
            () => {
              aborted = true;
              reject(
                Object.assign(new Error("aborted"), { name: "AbortError" })
              );
            },
            { once: true }
          );
        }),
    });
    assert.equal(result.ok, false);
    assert.equal(aborted, true);
  });

  it("does not report success when tick persistence result is undefined or null", () => {
    assert.equal(inspectTickUpdateResult(undefined, "tick-1", "completed").ok, false);
    assert.equal(inspectTickUpdateResult(null, "tick-1", "completed").ok, false);
  });
});
