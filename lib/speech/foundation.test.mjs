import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const migration = fs.readFileSync(
  new URL("../../supabase/migrations/20261027090000_speech_evidence_foundation.sql", import.meta.url),
  "utf8"
);

test("speech evidence foundation keeps evidence member-owned and nullable", () => {
  for (const table of [
    "speech_audio",
    "speech_turns",
    "speech_words",
    "speech_metrics",
    "speech_filler_moments",
    "speech_pause_events",
    "speech_pressure_segments",
    "speech_replay_refs",
  ]) {
    assert.match(migration, new RegExp(`create table if not exists public\\.${table}`));
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
    assert.match(migration, new RegExp(`references public\\.practice_sessions\\(id\\) on delete cascade`));
  }
  assert.match(migration, /pace_wpm numeric[\s\S]*member_talk_time_pct numeric/);
  assert.match(migration, /pause_count integer/);
  assert.match(migration, /speech-audio/);
  assert.doesNotMatch(migration, /overall_score|score integer|grade/i);
});

test("historical sessions are not backfilled", () => {
  assert.doesNotMatch(migration, /insert into public\.speech_(words|filler_moments|pause_events)/i);
  assert.doesNotMatch(migration, /update public\.(practice_sessions|session_reports)/i);
});
