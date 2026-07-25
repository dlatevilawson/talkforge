/**
 * Atlas Internal Staff — living organization (ATLAS-P5 / ATLAS-P6).
 */

export { runStaffCoordinatedPipeline } from "./coordinate";
export type { StaffPipelineResult } from "./coordinate";
export { listOfficePacks, getOfficePack } from "./offices/packs";
export {
  instantiateOffice,
  instantiateAllOffices,
  assertAllOfficesRegistered,
} from "./offices/registry";
export {
  MODULE_OWNER,
  RESPONSIBILITY_OWNER,
  assertOwnershipInvariants,
  validateExclusiveOwnership,
} from "./ownership";
export { snapshotMetrics, resetDelegationMetrics } from "./metrics";
export type { AioId, OfficePack, DelegationMetrics } from "./types";
export { EVENT_CATALOG } from "./events";
export { runSentinelWallConformance } from "./sentinel-wall";
