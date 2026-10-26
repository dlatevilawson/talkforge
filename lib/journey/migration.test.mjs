import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const sql = readFileSync(new URL("../../supabase/migrations/20261026090000_training_journey_plans.sql", import.meta.url), "utf8");

test("journey migration creates one active plan per member and links blocks", () => {
  assert.match(sql, /create table if not exists public\.training_plans/i);
  assert.match(sql, /kind text not null check \(kind in \('6_week','6_month'\)\)/i);
  assert.match(sql, /unique index if not exists training_plans_one_active_member/i);
  assert.match(sql, /add column if not exists plan_id uuid references public\.training_plans/i);
  assert.match(sql, /add column if not exists block_number smallint/i);
});

test("journey migration keeps member reads and service-role writes private", () => {
  assert.match(sql, /create policy training_plans_owner_read[\s\S]*member_id = auth\.uid\(\)/i);
  assert.match(sql, /revoke insert, update, delete on public\.training_programs, public\.program_days, public\.drill_completions from authenticated/i);
  assert.match(sql, /grant all on public\.training_programs, public\.program_days, public\.drill_completions to service_role/i);
  assert.match(sql, /resume_training_plan/i);
});
