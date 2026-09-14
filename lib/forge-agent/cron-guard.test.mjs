import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCronTickDetail,
  hasFinalizeBudget,
  isAbandonedCronTick,
  queryWithTimeoutAndRetry,
  sanitizePostgrestFailure,
  selectAbandonedTickIds,
} from "./cron-guard.ts";
import {
  FORGE_AGENT_CRON_ABANDONED_MS,
  FORGE_AGENT_CRON_FINALIZE_BUDGET_MS,
  FORGE_AGENT_CRON_MAX_DURATION_MS,
} from "./types.ts";

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
  });
});
