import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const migration = fs.readFileSync(
  new URL("../../supabase/migrations/20261022090000_drill_library_blank_page.sql", import.meta.url),
  "utf8"
);
const questionExampleMigration = fs.readFileSync(
  new URL("../../supabase/migrations/20261121000236_add_drill_question_worked_examples.sql", import.meta.url),
  "utf8"
);
const phaseMigration = fs.readFileSync(
  new URL("../../supabase/migrations/20261121185507_drill_phase_sequence.sql", import.meta.url),
  "utf8"
);

test("drill migration seeds fifteen canonical drills", () => {
  const names = [
    "One-sentence point",
    "So-what ladder",
    "Headline first",
    "Steel-man the objection",
    "Three chairs",
    "Question behind the question",
    "The 3-second rule",
    "Interruption drill",
    "Slow finish",
    "PREP builder",
    "Cut 30%",
    "Bridge phrases",
    "Topic toss",
    "Hostile question",
    "60-second reframe",
  ];
  for (const name of names) assert.ok(migration.includes("'" + name + "'"), name);
  assert.match(migration, /on conflict \(name\) do update/i);
  assert.match(migration, /modality text not null check \(modality in \('voice','text','field'\)\)/i);
});

test("drill migration preserves private ownership boundaries", () => {
  assert.match(migration, /alter table public\.drill_completions enable row level security/i);
  assert.match(migration, /grant all on public\.training_programs, public\.program_days, public\.drill_completions to service_role/i);
  assert.match(migration, /create policy drills_active_read on public\.drills/i);
});

test("starter drill ids are stable foreign-key ids", () => {
  for (const id of [
    "00000000-0000-0000-0000-000000000001",
    "00000000-0000-0000-0000-000000000007",
    "00000000-0000-0000-0000-000000000010",
  ]) {
    assert.match(migration, new RegExp("'" + id + "'"));
  }
});


test("question/example migration backfills every active drill before enforcing required fields", () => {
  const names = [
    "One-sentence point", "So-what ladder", "Headline first", "Steel-man the objection",
    "Three chairs", "Question behind the question", "The 3-second rule", "Interruption drill",
    "Slow finish", "PREP builder", "Cut 30%", "Bridge phrases", "Topic toss",
    "Hostile question", "60-second reframe", "Field point rep", "Listener lens log",
    "Pause field rep", "Message rewrite", "Reframe field rep",
  ];
  assert.match(questionExampleMigration, /add column question text/i);
  assert.match(questionExampleMigration, /add column worked_example text/i);
  for (const name of names) assert.ok(questionExampleMigration.includes("'" + name + "'"), name);
  assert.match(questionExampleMigration, /active_count <> 20/i);
  assert.match(questionExampleMigration, /missing_count <> 0/i);
  assert.match(questionExampleMigration, /alter column question set not null/i);
  assert.match(questionExampleMigration, /alter column worked_example set not null/i);
});

test("phase migration keeps phase nullable and assigns the 20 catalog drills by task shape", () => {
  const assignments = [
    ["One-sentence point", "build"], ["So-what ladder", "rehearse"], ["Headline first", "rehearse"],
    ["Steel-man the objection", "roleplay"], ["Three chairs", "recognise"], ["Question behind the question", "recognise"],
    ["The 3-second rule", "rehearse"], ["Interruption drill", "roleplay"], ["Slow finish", "rehearse"],
    ["PREP builder", "build"], ["Cut 30%", "build"], ["Bridge phrases", "rehearse"],
    ["Topic toss", "rehearse"], ["Hostile question", "roleplay"], ["60-second reframe", "rehearse"],
    ["Field point rep", "rehearse"], ["Listener lens log", "recognise"], ["Pause field rep", "rehearse"],
    ["Message rewrite", "build"], ["Reframe field rep", "rehearse"],
  ];
  assert.match(phaseMigration, /add column phase text check \(phase in \('recognise', 'build', 'rehearse', 'roleplay'\)\)/i);
  assert.doesNotMatch(phaseMigration, /alter column phase set not null/i);
  for (const [name, phase] of assignments) {
    assert.ok(phaseMigration.includes(`when '${name}' then '${phase}'`), name);
  }
  assert.equal(assignments.length, 20);
});
