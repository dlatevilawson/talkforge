import type { WorkflowState } from "../types/envelopes";
import { runAwareness } from "../modules/awareness";
import { runContext } from "../modules/context";
import { runKnowledge } from "../modules/knowledge";
import { publish } from "./bus";
import { recordExecution } from "./metrics";
import { getOfficePack } from "./offices/packs";

export async function intelBuildAndLockContext(
  state: WorkflowState
): Promise<WorkflowState> {
  recordExecution("AIO-INTEL", "stage");
  const pack = getOfficePack("AIO-INTEL");
  void pack.prompt;

  let next = await runKnowledge(state);
  if (next.error) return next;
  next = runAwareness(next);
  next = runContext(next);

  if (next.context?.locked) {
    const labels = [
      ...new Set(next.context.items.map((i) => i.authority_label)),
    ];
    publish({
      name: "atlas.intel.context_locked",
      at: new Date().toISOString(),
      request_id: next.request_id,
      publisher: "AIO-INTEL",
      payload: {
        request_id: next.request_id,
        context_ref: `ctx:${next.request_id}`,
        authority_labels: labels,
      },
    });
  }

  return next;
}

export function intelEmitHealthSignal(
  requestId: string,
  severity: "info" | "warn" | "critical",
  facts: string[],
  assumptions: string[]
): void {
  recordExecution("AIO-INTEL", "stage");
  publish({
    name: "atlas.intel.health_signal",
    at: new Date().toISOString(),
    request_id: requestId,
    publisher: "AIO-INTEL",
    payload: {
      signal_id: `hs-${requestId}-${Date.now()}`,
      severity,
      labeled_facts: facts,
      assumptions,
    },
  });
}
