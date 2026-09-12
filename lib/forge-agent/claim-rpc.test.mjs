import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { createMemoryForgeAgentRepository } from "./repository.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const sql = readFileSync(
  join(root, "supabase/migrations/20260912192505_forge_agent_phase3_claim.sql"),
  "utf8"
);

function simulateClaim(state, cues, limit = 12) {
  const runDay = "2026-09-12";
  const claimed = [];
  const eligible = cues
    .filter((cue) => {
      const prefs = state.prefs.get(cue.userId);
      if (!prefs?.outreachEnabled) return false;
      if (cue.status !== "active") return false;
      if (new Date(cue.dueAt).getTime() > Date.now()) return false;
      if (prefs.deniedCueClasses.includes(cue.kind)) return false;
      if (state.actions.has(cue.id)) return false;
      return true;
    })
    .slice(0, limit);

  for (const cue of eligible) {
    state.actions.set(cue.id, { status: "drafting", userId: cue.userId });
    const key = `${cue.userId}:${runDay}`;
    let generationAllowed = false;
    if (!state.attempts.has(key)) {
      state.attempts.set(key, cue.id);
      generationAllowed = true;
    }
    claimed.push({
      cueId: cue.id,
      userId: cue.userId,
      generationAllowed,
    });
  }
  return claimed;
}

describe("claim_due_forge_cues SQL contract", () => {
  it("is a public invoker RPC with service_role-only execute", () => {
    assert.match(
      sql,
      /create or replace function public\.claim_due_forge_cues\(\s*p_limit integer,\s*p_cron_run_id uuid default null\s*\)/
    );
    assert.match(sql, /attempt_id uuid/);
    assert.match(sql, /security invoker/);
    assert.match(sql, /#variable_conflict use_column/);
    assert.match(sql, /set search_path = ''/);
    assert.doesNotMatch(sql, /security definer/);
    assert.doesNotMatch(sql, /auth\.role\s*\(/);
    assert.match(
      sql,
      /revoke all on function public\.claim_due_forge_cues\(integer, uuid\) from public/
    );
    assert.match(
      sql,
      /revoke all on function public\.claim_due_forge_cues\(integer, uuid\) from anon/
    );
    assert.match(
      sql,
      /revoke all on function public\.claim_due_forge_cues\(integer, uuid\) from authenticated/
    );
    assert.match(
      sql,
      /grant execute on function public\.claim_due_forge_cues\(integer, uuid\) to service_role/
    );
    assert.doesNotMatch(
      sql,
      /grant execute on function public\.claim_due_forge_cues\(integer, uuid\) to authenticated/
    );
    assert.doesNotMatch(
      sql,
      /grant execute on function public\.claim_due_forge_cues\(integer, uuid\) to anon/
    );
  });

  it("reserves a draft_attempt atomically and returns generation_allowed", () => {
    assert.match(sql, /on conflict \(user_id, run_day\) where kind = 'draft_attempt'/);
    assert.match(sql, /on conflict \(cue_id\) do nothing/);
    assert.match(sql, /if new_action_id is null then/);
    assert.match(sql, /generation_allowed := reserved_attempt_id is not null/);
    assert.match(sql, /attempt_id := reserved_attempt_id/);
    assert.match(sql, /kind = 'draft_attempt'/);
    assert.match(sql, /'drafting'/);
    assert.match(sql, /for update of c skip locked/);
    assert.match(sql, /cron_run_id/);
    assert.match(
      sql,
      /create unique index forge_agent_runs_draft_attempt_user_day_uidx/
    );
  });

  it("reuses Phase 2 eligibility predicates", () => {
    assert.match(sql, /prefs\.outreach_enabled = true/);
    assert.match(sql, /c\.status = 'active'/);
    assert.match(sql, /c\.due_at <= now\(\)/);
    assert.match(sql, /not \(c\.kind = any \(prefs\.denied_cue_classes\)\)/);
    assert.match(sql, /not exists \(/);
  });
});

describe("cron attempt identity and fail-closed", () => {
  const cron = readFileSync(join(root, "lib/forge-agent/cron.ts"), "utf8");
  const route = readFileSync(
    join(root, "app/api/cron/forge-agent/route.ts"),
    "utf8"
  );

  it("updates attempts by exact id and recovers without today's date", () => {
    assert.match(cron, /isUsableCronTick\(tick\)/);
    assert.match(cron, /p_cron_run_id: tick\.id/);
    assert.match(cron, /\.eq\("id", attemptId\)/);
    assert.match(cron, /attemptMatchesAction/);
    assert.doesNotMatch(cron, /eq\("run_day"/);
    assert.doesNotMatch(cron, /utcRunDay/);
    assert.match(route, /forgeAgentCronHttpStatus\(result\.status\)/);
  });
});

describe("atomic daily attempt reservation", () => {
  it("allows only one paid generation when two cues race for the same member", async () => {
    const state = {
      prefs: new Map([
        ["member-1", { outreachEnabled: true, deniedCueClasses: [] }],
      ]),
      actions: new Map(),
      attempts: new Map(),
    };
    const cues = [
      {
        id: "cue-a",
        userId: "member-1",
        kind: "homework",
        status: "active",
        dueAt: new Date(Date.now() - 1000).toISOString(),
      },
      {
        id: "cue-b",
        userId: "member-1",
        kind: "upcoming_conversation",
        status: "active",
        dueAt: new Date(Date.now() - 500).toISOString(),
      },
    ];

    const [first, second] = await Promise.all([
      Promise.resolve(simulateClaim(state, [cues[0]])),
      Promise.resolve(simulateClaim(state, [cues[1]])),
    ]);
    const allowed = [...first, ...second].filter((row) => row.generationAllowed);
    assert.equal(allowed.length, 1);
    assert.equal(state.attempts.size, 1);
    assert.equal(state.actions.size, 2);
  });

  it("does not claim opt-out, future, paused, consumed, cancelled, or denied-class cues", () => {
    const now = Date.now();
    const state = {
      prefs: new Map([
        ["off", { outreachEnabled: false, deniedCueClasses: [] }],
        ["on", { outreachEnabled: true, deniedCueClasses: ["homework"] }],
      ]),
      actions: new Map(),
      attempts: new Map(),
    };
    const claimed = simulateClaim(state, [
      {
        id: "1",
        userId: "off",
        kind: "homework",
        status: "active",
        dueAt: new Date(now - 1000).toISOString(),
      },
      {
        id: "2",
        userId: "on",
        kind: "homework",
        status: "active",
        dueAt: new Date(now - 1000).toISOString(),
      },
      {
        id: "3",
        userId: "on",
        kind: "upcoming_conversation",
        status: "future",
        dueAt: new Date(now + 60_000).toISOString(),
      },
      {
        id: "4",
        userId: "on",
        kind: "upcoming_conversation",
        status: "paused",
        dueAt: new Date(now - 1000).toISOString(),
      },
      {
        id: "5",
        userId: "on",
        kind: "upcoming_conversation",
        status: "consumed",
        dueAt: new Date(now - 1000).toISOString(),
      },
      {
        id: "6",
        userId: "on",
        kind: "upcoming_conversation",
        status: "cancelled",
        dueAt: new Date(now - 1000).toISOString(),
      },
    ]);
    assert.equal(claimed.length, 0);
  });

  it("hides drafting from the approval inbox", async () => {
    const repo = createMemoryForgeAgentRepository();
    await repo.updatePreferences("member-1", { outreachEnabled: true });
    await repo.createCue("member-1", {
      kind: "homework",
      title: "Prep the 1:1",
      dueAt: new Date(Date.now() - 1000).toISOString(),
    });
    const pending = await repo.listPendingActions("member-1");
    assert.equal(pending.length, 0);
    const materialized = await repo.materializeDueActions("member-1");
    assert.equal(materialized.length, 1);
    assert.equal(materialized[0].status, "pending_approval");
  });
});
