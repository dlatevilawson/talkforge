import { openSync, closeSync, writeFileSync, readFileSync, renameSync, unlinkSync, fsyncSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';

export function fingerprintFixtureRun(value) {
  return createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

// Only these three scalar fields are needed to recompute repeat-run stability.
export function compactFixtureResult(entry) {
  return {
    publicResult: entry.publicResult,
    stability: {
      id: entry.stability.id,
      run: entry.stability.run,
      output: entry.stability.output ? {
        signals: entry.stability.output.signals.map(({ signal, level, evidenceStrength }) => ({ signal, level, evidenceStrength })),
      } : null,
    },
  };
}

export function openFixtureCheckpoint(file, fingerprint, slots) {
  const path = resolve(file);
  const lock = `${path}.lock`;
  // A stale lock requires explicit operator reconciliation; never replay uncertain calls.
  const lockFd = openSync(lock, 'wx', 0o600);
  closeSync(lockFd);
  let state;
  let closed = false;
  function persist() {
    const temp = `${path}.${process.pid}.tmp`;
    const fd = openSync(temp, 'wx', 0o600);
    try {
      writeFileSync(fd, JSON.stringify(state, null, 2));
      fsyncSync(fd);
    } finally { closeSync(fd); }
    renameSync(temp, path);
    const directory = openSync(dirname(path), 'r');
    try { fsyncSync(directory); } finally { closeSync(directory); }
  }
  function close() {
    if (!closed) { unlinkSync(lock); closed = true; }
  }
  try {
    try { state = JSON.parse(readFileSync(path, 'utf8')); }
    catch (error) {
      if (error.code !== 'ENOENT') throw error;
      state = { version: 1, fingerprint, slots: Object.fromEntries(slots.map(id => [id, { status: 'pending' }])) };
      persist();
    }
    if (state.version !== 1 || state.fingerprint !== fingerprint ||
        JSON.stringify(Object.keys(state.slots)) !== JSON.stringify(slots)) {
      throw new Error('Checkpoint does not match this frozen run.');
    }
    for (const slot of Object.values(state.slots)) {
      if (!['pending', 'started', 'completed'].includes(slot.status) ||
          (slot.status === 'completed' && !slot.result)) throw new Error('Invalid checkpoint.');
      if (slot.status === 'started') throw new Error('Unresolved request in checkpoint; reconcile before resuming.');
    }
  } catch (error) { close(); throw error; }
  return {
    completed(id) { return state.slots[id]?.result ?? null; },
    start(id) {
      if (closed || state.slots[id]?.status !== 'pending') throw new Error('Slot cannot be started.');
      state.slots[id] = { status: 'started', startedAt: new Date().toISOString() };
      persist();
    },
    complete(id, result) {
      if (closed || state.slots[id]?.status !== 'started') throw new Error('Slot was not started.');
      state.slots[id] = { ...state.slots[id], status: 'completed', result: compactFixtureResult(result) };
      persist();
    },
    close,
  };
}
