import {
  classifyForRetention,
  persistDisposition,
} from "../retention/store";
import type { WorkflowState } from "../types/envelopes";
import { traceStage } from "./trace";

/**
 * rt.memory — classify then retain in non-Canonical sinks (W4).
 * Promotion candidates go to promo staging only — never auto-Canonical.
 */
export function runMemory(state: WorkflowState): WorkflowState {
  const disposition = classifyForRetention(state);
  if (disposition.canonical !== false) {
    throw new Error("MemoryDisposition.canonical must be false");
  }

  const { record, promo } = persistDisposition(disposition);

  let next: WorkflowState = {
    ...state,
    disposition,
    stage: "memory",
  };
  next = traceStage(
    next,
    "memory",
    `Retained class=${disposition.class} sink=${record.sink}`,
    [
      record.record_id,
      disposition.class,
      ...(promo ? [promo.staging_id, "promo-staging-not-canonical"] : []),
    ]
  );
  return next;
}
