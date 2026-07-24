/**
 * WP-S4 — Controlled failure injection (validation harness).
 * Does not change office responsibilities or constitutional architecture.
 * Faults are ephemeral test controls; always reset between scenarios.
 */

import type { AioId } from "./types";

const disabled = new Set<AioId>();
let delayMs = 0;
let corruptPublish = false;
let dropEventsNamed: string | null = null;

export type FaultSnapshot = {
  disabled: AioId[];
  delayMs: number;
  corruptPublish: boolean;
  dropEventsNamed: string | null;
};

export function resetFaults(): void {
  disabled.clear();
  delayMs = 0;
  corruptPublish = false;
  dropEventsNamed = null;
}

export function disableOffice(id: AioId): void {
  disabled.add(id);
}

export function enableOffice(id: AioId): void {
  disabled.delete(id);
}

export function isOfficeDisabled(id: AioId): boolean {
  return disabled.has(id);
}

/** Throw if office is disabled — facades fail closed. */
export function assertOfficeEnabled(id: AioId): void {
  if (disabled.has(id)) {
    throw new Error(`OFFICE_DISABLED:${id}`);
  }
}

export function setResponseDelay(ms: number): void {
  delayMs = Math.max(0, ms);
}

export async function applyInjectedDelay(): Promise<void> {
  if (delayMs <= 0) return;
  await new Promise((r) => setTimeout(r, delayMs));
}

export function setCorruptPublish(on: boolean): void {
  corruptPublish = on;
}

export function shouldCorruptPublish(): boolean {
  return corruptPublish;
}

export function setDropEventsNamed(name: string | null): void {
  dropEventsNamed = name;
}

export function shouldDropEvent(name: string): boolean {
  return dropEventsNamed !== null && dropEventsNamed === name;
}

export function getFaultSnapshot(): FaultSnapshot {
  return {
    disabled: [...disabled],
    delayMs,
    corruptPublish,
    dropEventsNamed,
  };
}

export function isOfficeDisabledError(err: unknown): boolean {
  return err instanceof Error && err.message.startsWith("OFFICE_DISABLED:");
}
