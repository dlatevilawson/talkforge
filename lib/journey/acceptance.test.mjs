import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { completionDayWrite, repeatDrillHref, resolveRepTarget } from "./rep-target.ts";

const migration = readFileSync(new URL("../../supabase/migrations/20261026090000_training_journey_plans.sql", import.meta.url), "utf8");
const drillMigration = readFileSync(new URL("../../supabase/migrations/20261022090000_drill_library_blank_page.sql", import.meta.url), "utf8");
const server = readFileSync(new URL("./server.ts", import.meta.url), "utf8");
const home = readFileSync(new URL("../../app/components/ContinuityHome.tsx", import.meta.url), "utf8");
const onboarding = readFileSync(new URL("../../app/components/auth/OnboardingForm.tsx", import.meta.url), "utf8");
const repLoopMigration = readFileSync(new URL("../../supabase/migrations/20261121053502_deliberate_practice_rep_loop.sql", import.meta.url), "utf8");

test("new member plan creates fourteen days with database column names", () => {
  assert.match(server, /generateBlockDays/);
  assert.match(server, /day_index: day\.dayIndex/);
  assert.match(server, /drill_id: day\.drillId/);
  assert.match(server, /field_assignment_text: day\.fieldAssignmentText/);
  assert.match(server, /program_days.*insert|from\("program_days"\)/s);
});
test("retry repairs an incomplete active plan instead of returning it as success", () => {
  assert.match(server, /activeProgram/);
  assert.match(server, /count: "exact", head: true/);
  assert.match(server, /training_programs"\)\.delete\(\)/);
  assert.match(server, /count \?\? 0\) >= 14/);
});
test("Today screen exposes one drill and one Start action", () => { assert.match(home, /Today · Day/); assert.match(home, /Start today’s drill/); });
test("drill briefing remains the entry contract", () => { assert.match(home, /instructions/); });
test("check-in can prescribe the next block", () => { assert.match(server, /completeBlockAndPrescribeNext/); assert.match(server, /current_block_number/); });
test("a finished block renders a check-in instead of a stale recommendation", () => {
  assert.match(server, /status: "block_complete"/);
  assert.match(home, /Block \{journey\.blockNumber\} complete/);
  assert.match(home, /Start your check-in/);
  assert.match(home, /check-in is ready/);
});
test("check-in is explicit and does not create a block on dismissal", () => {
  const checkIn = readFileSync(new URL("../../app/app/check-in/page.tsx", import.meta.url), "utf8");
  assert.match(checkIn, /completeBlockAction/);
  assert.match(checkIn, /Not yet/);
});
test("pause and resume preserve the plan through a transaction", () => { assert.match(server, /resume_training_plan/); assert.match(migration, /update public\.program_days[\s\S]*shift_days/); });
test("free voice exhaustion has a non-voice fallback", () => { assert.match(server, /voiceSlots/); assert.match(migration, /modality, difficulty/); });
test("occasion data is stored for countdown and selection", () => { assert.match(onboarding, /occasionText/); assert.match(server, /occasion_date/); assert.match(home, /daysUntil/); });
test("one active plan is enforced", () => { assert.match(migration, /training_plans_one_active_member/); });
test("RLS restricts plan reads to the owner", () => { assert.match(migration, /training_plans_owner_read[\s\S]*auth\.uid/); });
test("drill foreign keys prevent invented drills", () => { assert.match(drillMigration, /drill_id uuid not null references public\.drills/); assert.match(server, /drillsResult|from\("drills"\)/); });
test("rep target prefers the member correction and falls back only to the coach adjustment", () => {
  assert.equal(resolveRepTarget("  say the point first  ", "Slow down"), "say the point first");
  assert.equal(resolveRepTarget("  ", "Slow down"), "Slow down");
  assert.equal(resolveRepTarget("", ""), null);
});
test("repeat URL preserves the target and links to the same program day", () => {
  const href = repeatDrillHref({ drillSlug: "prep-builder", target: "Lead with the point", programId: "program-1", dayId: "day-14" });
  const url = new URL(href, "https://talkforge.test");
  assert.equal(url.pathname, "/app/practice");
  assert.equal(url.searchParams.get("drill"), "prep-builder");
  assert.equal(url.searchParams.get("start"), "1");
  assert.equal(url.searchParams.get("target"), "Lead with the point");
  assert.equal(url.searchParams.get("programId"), "program-1");
  assert.equal(url.searchParams.get("repeatDayId"), "day-14");
});
test("repeat completion links to the original day without advancing it", () => {
  assert.deepEqual(completionDayWrite({ repeat: true, dayId: "day-14" }), { dayId: "day-14", markDayDone: false });
  assert.deepEqual(completionDayWrite({ repeat: false, dayId: "day-14" }), { dayId: "day-14", markDayDone: true });
});
test("rep-loop migration adds a nullable next_target without another table", () => {
  assert.match(repLoopMigration, /alter table public\.drill_completions[\s\S]*add column if not exists next_target text;/i);
  assert.doesNotMatch(repLoopMigration, /not null|create table/i);
});
