import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { openFixtureCheckpoint, fingerprintFixtureRun } from './readiness-fixture-checkpoint.mjs';
import { summarizeFixtureStability } from '../lib/readiness/fixture-diagnostics.ts';

function workspace(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'readiness-checkpoint-'));
  try { fn(join(dir, 'run.json')); } finally { rmSync(dir, { recursive: true, force: true }); }
}
const result = (run = 1) => ({
  publicResult: { id: 'fixture', run, passed: true, inputTokens: 10, outputTokens: 20 },
  stability: { id: 'fixture', run, output: { pressureLevel: 'moderate', signals: [{
    signal: 'purpose', level: 2, evidenceStrength: 'sufficient',
    summary: 'PRIVATE UTTERANCE', evidence: [{ quote: 'PRIVATE UTTERANCE' }],
  }] } },
});

test('completed calls survive reopen and cannot be started twice', () => workspace(path => {
  let journal = openFixtureCheckpoint(path, 'frozen', ['1:fixture', '2:fixture']);
  journal.start('1:fixture'); journal.complete('1:fixture', result()); journal.close();
  journal = openFixtureCheckpoint(path, 'frozen', ['1:fixture', '2:fixture']);
  assert.equal(journal.completed('1:fixture').publicResult.inputTokens, 10);
  assert.equal(journal.completed('2:fixture'), null);
  assert.throws(() => journal.start('1:fixture'));
  journal.close();
}));
test('an interrupted request blocks resume instead of replaying the call', () => workspace(path => {
  const journal = openFixtureCheckpoint(path, 'frozen', ['1:fixture']);
  journal.start('1:fixture'); journal.close();
  assert.throws(() => openFixtureCheckpoint(path, 'frozen', ['1:fixture']), /Unresolved request/);
}));
test('concurrent runner and stale lock cannot acquire same journal', () => workspace(path => {
  const journal = openFixtureCheckpoint(path, 'frozen', ['1:fixture']);
  assert.throws(() => openFixtureCheckpoint(path, 'frozen', ['1:fixture']), /EEXIST/);
  journal.close();
}));
test('changed configuration or slot list cannot reuse a checkpoint', () => workspace(path => {
  const journal = openFixtureCheckpoint(path, 'frozen', ['1:fixture']); journal.close();
  assert.throws(() => openFixtureCheckpoint(path, 'changed', ['1:fixture']), /does not match/);
  assert.throws(() => openFixtureCheckpoint(path, 'frozen', ['2:fixture']), /does not match/);
  assert.notEqual(fingerprintFixtureRun({ prompt: 'a' }), fingerprintFixtureRun({ prompt: 'b' }));
}));
test('checkpoint omits content while preserving stability and all 30 slots', () => workspace(path => {
  const slots = Array.from({length: 30}, (_, i) => String(i));
  const journal = openFixtureCheckpoint(path, 'frozen', slots);
  for (let i = 0; i < 3; i++) { journal.start(String(i)); journal.complete(String(i), result(i+1)); }
  journal.close();
  const stored = JSON.parse(readFileSync(path, 'utf8'));
  assert.equal(Object.keys(stored.slots).length, 30);
  assert.equal(JSON.stringify(stored).includes('PRIVATE UTTERANCE'), false);
  const restored = [0,1,2].map(i => stored.slots[String(i)].result.stability);
  assert.deepEqual(summarizeFixtureStability(restored), summarizeFixtureStability([1,2,3].map(i => result(i).stability)));
}));
