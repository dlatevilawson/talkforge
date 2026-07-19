/**
 * WP-S0 — Office registry & instantiation.
 * Every AIO can be instantiated from its operating pack + facade binding.
 */

import type { AioId, OfficePack } from "../types";
import { getOfficePack, listOfficePacks, OFFICE_PACKS } from "./packs";

export type InstantiatedOffice = {
  id: AioId;
  pack: OfficePack;
  facade: string;
  instantiated_at: string;
  status: "operational";
};

const FACADE_MODULE: Record<AioId, string> = {
  "AIO-CORE": "atlas/runtime/staff/core.ts",
  "AIO-INTEL": "atlas/runtime/staff/intel.ts",
  "AIO-COUNSEL": "atlas/runtime/staff/counsel.ts",
  "AIO-BROKER": "atlas/runtime/staff/broker.ts",
  "AIO-GUARD": "atlas/runtime/staff/guard.ts",
};

const REQUIRED_OFFICES: AioId[] = [
  "AIO-CORE",
  "AIO-INTEL",
  "AIO-COUNSEL",
  "AIO-BROKER",
  "AIO-GUARD",
];

/** Instantiate a single office from its pack (runtime organization real). */
export function instantiateOffice(id: AioId): InstantiatedOffice {
  const pack = getOfficePack(id);
  if (!pack || pack.id !== id) {
    throw new Error(`Cannot instantiate unknown office ${id}`);
  }
  if (!FACADE_MODULE[id]) {
    throw new Error(`No facade registered for ${id}`);
  }
  return {
    id,
    pack,
    facade: FACADE_MODULE[id],
    instantiated_at: new Date().toISOString(),
    status: "operational",
  };
}

/** Instantiate all five AIO offices. Fails if any missing. */
export function instantiateAllOffices(): InstantiatedOffice[] {
  const offices = REQUIRED_OFFICES.map(instantiateOffice);
  if (offices.length !== 5) {
    throw new Error(`Expected 5 offices, got ${offices.length}`);
  }
  const ids = new Set(offices.map((o) => o.id));
  for (const id of REQUIRED_OFFICES) {
    if (!ids.has(id)) throw new Error(`Orphaned office slot: ${id} not instantiated`);
  }
  return offices;
}

export function assertAllOfficesRegistered(): void {
  for (const id of REQUIRED_OFFICES) {
    if (!OFFICE_PACKS[id]) throw new Error(`Office pack missing: ${id}`);
    if (!FACADE_MODULE[id]) throw new Error(`Facade missing: ${id}`);
  }
  const packs = listOfficePacks();
  if (packs.length !== REQUIRED_OFFICES.length) {
    throw new Error(
      `Pack count ${packs.length} ≠ required ${REQUIRED_OFFICES.length}`
    );
  }
}

export { REQUIRED_OFFICES, FACADE_MODULE };
