import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { buildCheckInCopy } from "./copy.ts";
import {
  canMaterializeDueActions,
  ForgeAgentError,
  recordDeniedCueClass,
  shouldMaterializeCue,
} from "./policy.ts";
import { createMemoryForgeAgentRepository } from "./repository.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const migrationName = "20260911_forge_agent.sql";

describe("Forge Agent policy", () => {
  it("blocks materialize when opt-in is off", async () => {
    const writes = [];
    const repo = createMemoryForgeAgentRepository({
      onWrite: (table) => writes.push(table),
    });
    await repo.createCue("member-1", {
      kind: "homework",
      title: "Ask for the raise",
      dueAt: new Date(Date.now() - 60_000).toISOString(),
    });
    const actions = await repo.materializeDueActions("member-1");
    assert.equal(actions.length, 0);
    assert.equal(
      canMaterializeDueActions({ outreachEnabled: false }),
      false
    );
    assert.ok(!writes.includes("forge_agent_actions"));
  });

  it("forbids guest identity", async () => {
    const repo = createMemoryForgeAgentRepository();
    await assert.rejects(
      () => repo.getPreferences("guest_abc"),
      (err) =>
        err instanceof ForgeAgentError &&
        err.code === "FORGE_AGENT_GUEST_FORBIDDEN"
    );
  });

  it("deny stops that cue class from rematerializing", async () => {
    const repo = createMemoryForgeAgentRepository();
    await repo.updatePreferences("member-1", { outreachEnabled: true });
    const first = await repo.createCue("member-1", {
      kind: "homework",
      title: "Prep the 1:1",
      dueAt: new Date(Date.now() - 60_000).toISOString(),
    });
    const pending = await repo.materializeDueActions("member-1");
    assert.equal(pending.length, 1);
    assert.match(pending[0].payload.whySent, /you declared/);
    assert.equal(pending[0].cueId, first.id);

    await repo.denyAction("member-1", pending[0].id);
    const prefs = await repo.getPreferences("member-1");
    assert.deepEqual(prefs.deniedCueClasses, ["homework"]);

    await repo.createCue("member-1", {
      kind: "homework",
      title: "Another homework",
      dueAt: new Date(Date.now() - 30_000).toISOString(),
    });
    const again = await repo.materializeDueActions("member-1");
    assert.equal(again.length, 0);

    await repo.createCue("member-1", {
      kind: "upcoming_conversation",
      title: "Board dinner",
      dueAt: new Date(Date.now() - 30_000).toISOString(),
    });
    const otherKind = await repo.materializeDueActions("member-1");
    assert.equal(otherKind.length, 1);
    assert.equal(otherKind[0].payload.practiceHref.includes("start=1"), true);
  });

  it("approve does not write living_profiles or coach_memory", async () => {
    const writes = [];
    const repo = createMemoryForgeAgentRepository({
      onWrite: (table) => writes.push(table),
    });
    await repo.updatePreferences("member-1", { outreachEnabled: true });
    await repo.createCue("member-1", {
      kind: "upcoming_conversation",
      title: "Salary conversation",
      successCriteria: "I name the number once",
      dueAt: new Date(Date.now() - 60_000).toISOString(),
    });
    const [action] = await repo.materializeDueActions("member-1");
    const approved = await repo.approveAction("member-1", action.id);
    assert.equal(approved.status, "delivered");
    assert.ok(approved.deliveredAt);
    const cues = await repo.listCues("member-1");
    assert.equal(cues[0].status, "consumed");
    assert.ok(!writes.includes("living_profiles"));
    assert.ok(!writes.includes("coach_memory"));
    assert.ok(writes.includes("forge_agent_actions"));
    assert.ok(writes.includes("forge_cues"));
  });

  it("does not materialize future cues or denied classes", () => {
    assert.equal(
      shouldMaterializeCue({
        cue: {
          status: "active",
          kind: "homework",
          dueAt: new Date(Date.now() + 60_000).toISOString(),
        },
        hasExistingAction: false,
        outreachEnabled: true,
        deniedCueClasses: [],
      }),
      false
    );
    assert.equal(
      shouldMaterializeCue({
        cue: {
          status: "active",
          kind: "homework",
          dueAt: new Date(Date.now() - 60_000).toISOString(),
        },
        hasExistingAction: false,
        outreachEnabled: true,
        deniedCueClasses: ["homework"],
      }),
      false
    );
    assert.deepEqual(recordDeniedCueClass(["homework"], "homework"), [
      "homework",
    ]);
  });

  it("builds template copy without an LLM", () => {
    const copy = buildCheckInCopy({
      kind: "practice_follow_up",
      title: "Feedback to Sam",
    });
    assert.match(copy.whySent, /you declared a practice follow-up/);
    assert.match(copy.body, /One next move/);
    assert.equal(
      copy.practiceHref,
      "/app/practice?start=1&title=Feedback%20to%20Sam"
    );
  });
});

describe("Forge Agent migration", () => {
  const sql = readFileSync(
    join(root, "supabase/migrations", migrationName),
    "utf8"
  );

  it("creates prefs, cues, actions, and service-role-only runs", () => {
    assert.match(sql, /create table if not exists public\.forge_agent_preferences/);
    assert.match(sql, /outreach_enabled boolean not null default false/);
    assert.match(sql, /check \(channel = 'in_app'\)/);
    assert.match(sql, /create table if not exists public\.forge_cues/);
    assert.match(
      sql,
      /kind in \('upcoming_conversation', 'practice_follow_up', 'homework'\)/
    );
    assert.match(sql, /source_session_id text/);
    assert.doesNotMatch(
      sql,
      /source_session_id text[\s\S]*references public\.practice_sessions/
    );
    assert.match(sql, /create table if not exists public\.forge_agent_actions/);
    assert.match(sql, /create table if not exists public\.forge_agent_runs/);
    assert.match(
      sql,
      /revoke all on table public\.forge_agent_runs from anon, authenticated/
    );
    assert.doesNotMatch(sql, /create policy "forge_agent_runs/);
  });

  it("purges agent tables inside reset without changing return type", () => {
    const resetIdx = sql.search(
      /create or replace function public\.reset_my_talkforge_data/
    );
    const actionsIdx = sql.search(/delete from public\.forge_agent_actions/);
    const reflectionsIdx = sql.search(/delete from public\.reflections/);
    assert.ok(resetIdx >= 0);
    assert.ok(actionsIdx > resetIdx);
    assert.ok(reflectionsIdx > actionsIdx);
    assert.match(
      sql,
      /returns table \(\s*living_profiles_deleted bigint,\s*coach_memory_deleted bigint,\s*practice_sessions_deleted bigint,\s*session_reports_deleted bigint,\s*reflections_deleted bigint,\s*assistant_coach_sessions_deleted bigint\s*\)/i
    );
    assert.doesNotMatch(
      sql,
      /drop function if exists public\.reset_my_talkforge_data/
    );
  });

  it("is registered on both deployment paths", () => {
    const manifest = JSON.parse(
      readFileSync(join(root, "supabase/migrations/manifest.json"), "utf8")
    );
    for (const pathName of ["greenfield", "existingProduction"]) {
      const files = manifest.deploymentPaths[pathName];
      assert.ok(files.includes(migrationName), pathName);
      assert.ok(
        files.indexOf(migrationName) >
          files.indexOf("20260817_reset_purge_assistant_coach_return_type.sql"),
        `${pathName} forge agent must follow AC reset corrective`
      );
      assert.ok(
        files.indexOf("20260912125321_forge_agent_reset_service_only_purge.sql") >
          files.indexOf(migrationName),
        `${pathName} service-only purge must follow forge agent tables`
      );
    }
  });

  it("resets service-only tables through private definer helpers", () => {
    const corrective = readFileSync(
      join(
        root,
        "supabase/migrations/20260912125321_forge_agent_reset_service_only_purge.sql"
      ),
      "utf8"
    );
    assert.match(corrective, /create schema if not exists private/);
    assert.match(
      corrective,
      /create or replace function private\.purge_forge_agent_runs_for_member/
    );
    assert.match(
      corrective,
      /create or replace function private\.purge_assistant_coach_sessions_for_member/
    );
    assert.match(corrective, /security definer/);
    assert.match(corrective, /perform private\.purge_forge_agent_runs_for_member\(\)/);
    assert.match(
      corrective,
      /private\.purge_assistant_coach_sessions_for_member\(\)/
    );
    assert.match(corrective, /forge_agent_runs_user_id_idx/);
    assert.match(
      corrective,
      /revoke all on function private\.purge_assistant_coach_sessions_for_member\(\) from anon/
    );
    assert.doesNotMatch(
      corrective,
      /create or replace function public\.purge_forge_agent_runs_for_member/
    );
    assert.doesNotMatch(
      corrective,
      /create or replace function public\.purge_assistant_coach_sessions_for_member/
    );
    assert.doesNotMatch(corrective, /create policy "forge_agent_runs/);
    assert.doesNotMatch(corrective, /create policy "assistant_coach_sessions/);
    assert.doesNotMatch(
      corrective,
      /drop function if exists public\.reset_my_talkforge_data/
    );
  });

  it("registers the Phase 3 claim migration after the reset correction", () => {
    const manifest = JSON.parse(
      readFileSync(join(root, "supabase/migrations/manifest.json"), "utf8")
    );
    const phase3 = "20260912192505_forge_agent_phase3_claim.sql";
    for (const pathName of ["greenfield", "existingProduction"]) {
      const files = manifest.deploymentPaths[pathName];
      assert.ok(files.includes(phase3), pathName);
      assert.ok(
        files.indexOf(phase3) >
          files.indexOf("20260912125321_forge_agent_reset_service_only_purge.sql")
      );
    }
    const phase3Sql = readFileSync(
      join(root, "supabase/migrations", phase3),
      "utf8"
    );
    assert.match(phase3Sql, /'drafting'/);
    assert.match(phase3Sql, /run_day date/);
    assert.match(phase3Sql, /on conflict \(cue_id\) do nothing/);
    assert.match(phase3Sql, /p_cron_run_id uuid default null/);
    assert.match(phase3Sql, /attempt_id uuid/);
    assert.doesNotMatch(
      phase3Sql,
      /drop function if exists public\.reset_my_talkforge_data/
    );
    assert.doesNotMatch(phase3Sql, /living_profiles_deleted/);
  });
});
