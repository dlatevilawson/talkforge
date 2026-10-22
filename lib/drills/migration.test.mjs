import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const migration = fs.readFileSync(
  new URL("../../supabase/migrations/20261022090000_drill_library_blank_page.sql", import.meta.url),
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

