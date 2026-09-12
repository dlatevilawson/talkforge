/**
 * Live PostgreSQL tests for claim_due_forge_cues.
 * Enabled when psql can connect via FORGE_AGENT_CLAIM_TEST_DATABASE_URL,
 * DATABASE_URL, or the default local socket.
 */
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { describe, it } from "node:test";

function resolveUrl() {
  return (
    process.env.FORGE_AGENT_CLAIM_TEST_DATABASE_URL ||
    process.env.DATABASE_URL ||
    ""
  );
}

function psqlArgs(url, sql) {
  return url
    ? [url, "-v", "ON_ERROR_STOP=1", "-At", "-c", sql]
    : ["-v", "ON_ERROR_STOP=1", "-At", "-c", sql];
}

function psql(url, sql) {
  const result = spawnSync("psql", psqlArgs(url, sql), {
    encoding: "utf8",
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "psql failed");
  }
  return result.stdout.trim();
}

function postgresAvailable() {
  const version = spawnSync("psql", ["--version"], { encoding: "utf8" });
  if (version.status !== 0) return false;
  try {
    psql(resolveUrl(), "select 1");
    return true;
  } catch {
    return false;
  }
}

const enabled = postgresAvailable();

const FUNCTION_SQL = `
create or replace function forge_agent_phase3_test.claim_due_forge_cues(
  p_limit integer,
  p_cron_run_id uuid default null
)
returns table (
  action_id uuid,
  cue_id uuid,
  user_id uuid,
  generation_allowed boolean,
  attempt_id uuid
)
language plpgsql
volatile
security invoker
set search_path = ''
as $function$
#variable_conflict use_column
declare
  remaining integer;
  claimed record;
  new_action_id uuid;
  reserved_attempt_id uuid;
  run_day_utc date := (timezone('utc', now()))::date;
begin
  remaining := least(greatest(coalesce(p_limit, 0), 0), 12);
  if remaining = 0 then
    return;
  end if;
  for claimed in
    select c.id as cue_id, c.user_id as user_id
    from forge_agent_phase3_test.forge_cues as c
    inner join forge_agent_phase3_test.forge_agent_preferences as prefs
      on prefs.user_id = c.user_id
    where prefs.outreach_enabled = true
      and c.status = 'active'
      and c.due_at <= now()
      and not (c.kind = any (prefs.denied_cue_classes))
      and not exists (
        select 1 from forge_agent_phase3_test.forge_agent_actions as existing
        where existing.cue_id = c.id
      )
    order by c.due_at asc, c.created_at asc
    limit remaining
    for update of c skip locked
  loop
    new_action_id := null;
    insert into forge_agent_phase3_test.forge_agent_actions (
      user_id, cue_id, action_type, status, payload
    ) values (
      claimed.user_id, claimed.cue_id, 'in_app_checkin', 'drafting', '{}'::jsonb
    )
    on conflict (cue_id) do nothing
    returning id into new_action_id;

    if new_action_id is null then
      continue;
    end if;

    reserved_attempt_id := null;
    insert into forge_agent_phase3_test.forge_agent_runs (
      user_id, kind, status, run_day, detail
    ) values (
      claimed.user_id, 'draft_attempt', 'started', run_day_utc,
      jsonb_strip_nulls(
        jsonb_build_object(
          'cue_id', claimed.cue_id,
          'action_id', new_action_id,
          'cron_run_id', p_cron_run_id
        )
      )
    )
    on conflict (user_id, run_day) where kind = 'draft_attempt'
    do nothing
    returning id into reserved_attempt_id;

    action_id := new_action_id;
    cue_id := claimed.cue_id;
    user_id := claimed.user_id;
    generation_allowed := reserved_attempt_id is not null;
    attempt_id := reserved_attempt_id;
    return next;
  end loop;
end
$function$;
revoke all on function forge_agent_phase3_test.claim_due_forge_cues(integer, uuid) from public;
revoke all on function forge_agent_phase3_test.claim_due_forge_cues(integer, uuid) from anon;
revoke all on function forge_agent_phase3_test.claim_due_forge_cues(integer, uuid) from authenticated;
grant execute on function forge_agent_phase3_test.claim_due_forge_cues(integer, uuid) to service_role;
`;

function setupHarness(url) {
  psql(
    url,
    `
    drop schema if exists forge_agent_phase3_test cascade;
    create schema forge_agent_phase3_test;
    do $$ begin
      if not exists (select 1 from pg_roles where rolname = 'anon') then
        create role anon nologin;
      end if;
      if not exists (select 1 from pg_roles where rolname = 'authenticated') then
        create role authenticated nologin;
      end if;
      if not exists (select 1 from pg_roles where rolname = 'service_role') then
        create role service_role nologin bypassrls;
      end if;
    end $$;
    create table forge_agent_phase3_test.forge_agent_preferences (
      user_id uuid primary key,
      outreach_enabled boolean not null default false,
      denied_cue_classes text[] not null default '{}'
    );
    create table forge_agent_phase3_test.forge_cues (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null,
      kind text not null,
      title text not null default 'cue',
      success_criteria text,
      due_at timestamptz not null,
      status text not null default 'active',
      created_at timestamptz not null default now()
    );
    create table forge_agent_phase3_test.forge_agent_actions (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null,
      cue_id uuid not null unique,
      action_type text not null default 'in_app_checkin',
      status text not null default 'drafting',
      payload jsonb not null default '{}'::jsonb
    );
    create table forge_agent_phase3_test.forge_agent_runs (
      id uuid primary key default gen_random_uuid(),
      user_id uuid,
      kind text not null,
      status text not null,
      run_day date,
      detail jsonb not null default '{}'::jsonb
    );
    create unique index forge_agent_runs_draft_attempt_user_day_uidx
      on forge_agent_phase3_test.forge_agent_runs (user_id, run_day)
      where kind = 'draft_attempt';
    `
  );
  psql(url, FUNCTION_SQL);
  psql(
    url,
    `
    grant usage on schema forge_agent_phase3_test to anon, authenticated, service_role;
    grant all on all tables in schema forge_agent_phase3_test to service_role;
    grant usage, create on schema forge_agent_phase3_test to service_role;
    grant execute on function forge_agent_phase3_test.claim_due_forge_cues(integer, uuid) to service_role;
    revoke all on function forge_agent_phase3_test.claim_due_forge_cues(integer, uuid) from public, anon, authenticated;
    grant anon, authenticated, service_role to current_user;
    `
  );
}

function runPsql(url, sql) {
  return new Promise((resolve) => {
    const child = spawn("psql", psqlArgs(url, sql), { env: process.env });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("close", (code) => {
      resolve({ code, stdout, stderr });
    });
  });
}

describe("claim_due_forge_cues postgres", { skip: !enabled }, () => {
  const url = resolveUrl();

  it("denies anon and authenticated and allows one paid generation under concurrency", async () => {
    setupHarness(url);
    const member = "11111111-1111-1111-1111-111111111111";
    psql(
      url,
      `
      insert into forge_agent_phase3_test.forge_agent_preferences (user_id, outreach_enabled)
      values ('${member}', true);
      insert into forge_agent_phase3_test.forge_cues (user_id, kind, due_at)
      values
        ('${member}', 'homework', now() - interval '1 hour'),
        ('${member}', 'upcoming_conversation', now() - interval '30 minutes');
      `
    );

    const anonDenied = spawnSync(
      "psql",
      psqlArgs(
        url,
        "set role anon; select * from forge_agent_phase3_test.claim_due_forge_cues(12);"
      ),
      { encoding: "utf8", env: process.env }
    );
    assert.notEqual(anonDenied.status, 0);
    assert.match(`${anonDenied.stderr}${anonDenied.stdout}`, /permission denied/i);

    const authDenied = spawnSync(
      "psql",
      psqlArgs(
        url,
        "set role authenticated; select * from forge_agent_phase3_test.claim_due_forge_cues(12);"
      ),
      { encoding: "utf8", env: process.env }
    );
    assert.notEqual(authDenied.status, 0);
    assert.match(`${authDenied.stderr}${authDenied.stdout}`, /permission denied/i);

    const first = psql(
      url,
      `
      set role service_role;
      select count(*) filter (where generation_allowed),
             count(*) filter (where attempt_id is not null)
      from forge_agent_phase3_test.claim_due_forge_cues(12, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
      `
    )
      .split("\n")
      .at(-1);
    assert.equal(first, "1|1");

    const second = psql(
      url,
      `
      set role service_role;
      select count(*) from forge_agent_phase3_test.claim_due_forge_cues(12);
      `
    )
      .split("\n")
      .at(-1);
    assert.equal(second, "0");

    const other = "22222222-2222-2222-2222-222222222222";
    psql(
      url,
      `
      insert into forge_agent_phase3_test.forge_agent_preferences (user_id, outreach_enabled)
      values ('${other}', true);
      insert into forge_agent_phase3_test.forge_cues (user_id, kind, due_at)
      values
        ('${other}', 'homework', now() - interval '10 minutes'),
        ('${other}', 'practice_follow_up', now() - interval '5 minutes');
      `
    );
    const claimSql =
      "set role service_role; select count(*) filter (where generation_allowed) from forge_agent_phase3_test.claim_due_forge_cues(12);";
    const [left, right] = await Promise.all([
      runPsql(url, claimSql),
      runPsql(url, claimSql),
    ]);
    assert.equal(left.code, 0, left.stderr);
    assert.equal(right.code, 0, right.stderr);
    const allowed =
      Number(left.stdout.trim().split("\n").at(-1)) +
      Number(right.stdout.trim().split("\n").at(-1));
    assert.equal(allowed, 1);
  });

  it("survives a concurrent Phase 0-2 inbox insert without aborting the batch", async () => {
    setupHarness(url);
    const member = "33333333-3333-3333-3333-333333333333";
    psql(
      url,
      `
      insert into forge_agent_phase3_test.forge_agent_preferences (user_id, outreach_enabled)
      values ('${member}', true);
      insert into forge_agent_phase3_test.forge_cues (id, user_id, kind, due_at)
      values
        ('44444444-4444-4444-4444-444444444441', '${member}', 'homework', now() - interval '2 hours'),
        ('44444444-4444-4444-4444-444444444442', '${member}', 'upcoming_conversation', now() - interval '1 hour');
      create or replace function forge_agent_phase3_test.pause_drafting_insert()
      returns trigger
      language plpgsql
      as $$
      begin
        if new.status = 'drafting' then
          perform pg_sleep(0.4);
        end if;
        return new;
      end
      $$;
      create trigger pause_drafting_insert
        before insert on forge_agent_phase3_test.forge_agent_actions
        for each row execute function forge_agent_phase3_test.pause_drafting_insert();
      `
    );

    const claimPromise = runPsql(
      url,
      "set role service_role; select cue_id::text, generation_allowed::text from forge_agent_phase3_test.claim_due_forge_cues(12);"
    );
    for (let i = 0; i < 25; i += 1) {
      const active = psql(
        url,
        "select count(*) from pg_stat_activity where query like '%claim_due_forge_cues%' and state = 'active'"
      );
      if (active !== "0") break;
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    const insertResult = await runPsql(
      url,
      `
      set role service_role;
      insert into forge_agent_phase3_test.forge_agent_actions
        (user_id, cue_id, action_type, status, payload)
      values (
        '${member}',
        '44444444-4444-4444-4444-444444444441',
        'in_app_checkin',
        'pending_approval',
        '{"whySent":"declared","body":"One next move: rehearse.","practiceHref":"/app/practice?start=1"}'::jsonb
      );
      `
    );
    const claimResult = await claimPromise;

    assert.equal(insertResult.code, 0, insertResult.stderr);
    assert.equal(claimResult.code, 0, `${claimResult.stderr}${claimResult.stdout}`);
    assert.doesNotMatch(
      `${claimResult.stderr}${claimResult.stdout}`,
      /unique|23505|duplicate key/i
    );

    const statuses = psql(
      url,
      "select status from forge_agent_phase3_test.forge_agent_actions order by cue_id"
    ).split("\n");
    assert.equal(statuses.length, 2);
    assert.ok(statuses.includes("pending_approval"));
    assert.ok(statuses.includes("drafting"));
    const claimedRows = claimResult.stdout
      .trim()
      .split("\n")
      .filter((line) => line.includes("|"));
    assert.equal(claimedRows.length, 1);
    assert.match(claimedRows[0], /44444444-4444-4444-4444-444444444442/);
  });
});
