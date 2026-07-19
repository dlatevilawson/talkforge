import type { MemoryDisposition, WorkflowState } from "../types/envelopes";
import { traceStage } from "./trace";

/**
 * rt.memory — classify retain / promote-candidate / discard.
 * Never auto-Canonicalizes. Does not write production promo queue in W0–W3
 * (W4 gated if touching production retention).
 */
export function runMemory(state: WorkflowState): WorkflowState {
  const classValue =
    state.validation?.result === "PASS"
      ? ("temporary" as const)
      : state.validation?.result === "STOP"
        ? ("discarded" as const)
        : ("operational" as const);

  const disposition: MemoryDisposition = {
    request_id: state.request_id,
    class: classValue,
    summary: `Classified as ${classValue}; canonical=false`,
    refs: state.audit.map((a) => a.event_id),
    canonical: false,
  };

  if (disposition.canonical !== false) {
    throw new Error("MemoryDisposition.canonical must be false");
  }

  let next: WorkflowState = {
    ...state,
    disposition,
    stage: "memory",
  };
  next = traceStage(next, "memory", `Memory class=${classValue}`, [classValue]);
  return next;
}
