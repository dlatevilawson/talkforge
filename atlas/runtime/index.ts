/**
 * Atlas Target Runtime Plane (ATLAS-P3)
 *
 * Dual-plane: Legacy Ask Atlas (`atlas/engine/*`) remains live.
 * This package implements the target pipeline behind flags.
 * Does not modify `atlas/engine/loader.ts`.
 */

export {
  getRuntimeFlagSnapshot,
  isTargetFounderVisibleEnabled,
  isTargetPlaneEnabled,
} from "./flags";
export { runTargetPipeline, type PipelineResult } from "./modules/hub";
export { dryRunExchangeExposure } from "./modules/exchange";
export { getAuditSink, resetTraceSinkForTests } from "./modules/trace";
export {
  getRetentionSnapshot,
  resetRetentionForTests,
} from "./retention/store";
export { evaluateCutoverReadiness } from "./readiness/cutover";
export { collectW4Evidence } from "./readiness/run-w4";
export { runObservationSuite } from "./observation/run";
export {
  runStaffCoordinatedPipeline,
  listOfficePacks,
  assertOwnershipInvariants,
} from "./staff";
export type * from "./types/envelopes";
