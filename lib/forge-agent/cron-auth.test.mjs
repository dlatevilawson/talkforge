import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  authorizeForgeAgentCron,
  forgeAgentCronHttpStatus,
  isUsableCronTick,
} from "./cron-auth.ts";

describe("Forge Agent cron auth", () => {
  it("fails closed when CRON_SECRET is missing", () => {
    const previous = process.env.CRON_SECRET;
    delete process.env.CRON_SECRET;
    try {
      assert.equal(
        authorizeForgeAgentCron(
          new Request("http://localhost/api/cron/forge-agent", {
            headers: { authorization: "Bearer anything" },
          })
        ),
        false
      );
    } finally {
      if (previous === undefined) delete process.env.CRON_SECRET;
      else process.env.CRON_SECRET = previous;
    }
  });

  it("rejects a non-matching bearer", () => {
    const previous = process.env.CRON_SECRET;
    process.env.CRON_SECRET = "expected-secret";
    try {
      assert.equal(
        authorizeForgeAgentCron(
          new Request("http://localhost/api/cron/forge-agent", {
            headers: { authorization: "Bearer other-secret" },
          })
        ),
        false
      );
      assert.equal(
        authorizeForgeAgentCron(
          new Request("http://localhost/api/cron/forge-agent")
        ),
        false
      );
    } finally {
      if (previous === undefined) delete process.env.CRON_SECRET;
      else process.env.CRON_SECRET = previous;
    }
  });

  it("accepts an exact Bearer match", () => {
    const previous = process.env.CRON_SECRET;
    process.env.CRON_SECRET = "expected-secret";
    try {
      assert.equal(
        authorizeForgeAgentCron(
          new Request("http://localhost/api/cron/forge-agent", {
            headers: { authorization: "Bearer expected-secret" },
          })
        ),
        true
      );
    } finally {
      if (previous === undefined) delete process.env.CRON_SECRET;
      else process.env.CRON_SECRET = previous;
    }
  });
});

describe("Forge Agent cron fail-closed", () => {
  it("returns HTTP 500 only when the tick status is failed", () => {
    assert.equal(forgeAgentCronHttpStatus("completed"), 200);
    assert.equal(forgeAgentCronHttpStatus("partial"), 200);
    assert.equal(forgeAgentCronHttpStatus("failed"), 500);
  });

  it("refuses to claim when cron_tick creation did not return an id", () => {
    assert.equal(isUsableCronTick(null), false);
    assert.equal(isUsableCronTick({}), false);
    assert.equal(isUsableCronTick({ id: "" }), false);
    assert.equal(isUsableCronTick({ id: "tick-1" }), true);
  });
});
