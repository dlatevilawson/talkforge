import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const migration = readFileSync(new URL("../../supabase/migrations/20261026090000_training_journey_plans.sql", import.meta.url), "utf8");
const drillMigration = readFileSync(new URL("../../supabase/migrations/20261022090000_drill_library_blank_page.sql", import.meta.url), "utf8");
const server = readFileSync(new URL("./server.ts", import.meta.url), "utf8");
const home = readFileSync(new URL("../../app/components/ContinuityHome.tsx", import.meta.url), "utf8");
const onboarding = readFileSync(new URL("../../app/components/auth/OnboardingForm.tsx", import.meta.url), "utf8");

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
test("pause and resume preserve the plan through a transaction", () => { assert.match(server, /resume_training_plan/); assert.match(migration, /update public\.program_days[\s\S]*shift_days/); });
test("free voice exhaustion has a non-voice fallback", () => { assert.match(server, /voiceSlots/); assert.match(migration, /modality, difficulty/); });
test("occasion data is stored for countdown and selection", () => { assert.match(onboarding, /occasionText/); assert.match(server, /occasion_date/); assert.match(home, /daysUntil/); });
test("one active plan is enforced", () => { assert.match(migration, /training_plans_one_active_member/); });
test("RLS restricts plan reads to the owner", () => { assert.match(migration, /training_plans_owner_read[\s\S]*auth\.uid/); });
test("drill foreign keys prevent invented drills", () => { assert.match(drillMigration, /drill_id uuid not null references public\.drills/); assert.match(server, /drillsResult|from\("drills"\)/); });
