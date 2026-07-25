import type { KnowledgeItem, WorkflowState } from "../types/envelopes";
import { traceStage } from "./trace";

/**
 * rt.awareness — operational-labeled items only.
 * Feeds knowledge plane; never Cognition directly; never Identity/Canonical alone.
 */
export function runAwareness(state: WorkflowState): WorkflowState {
  const opsItems: KnowledgeItem[] = [
    {
      source_id: "ops:situation-stub",
      authority_label: "operational",
      status: "ops",
      excerpt_or_ref:
        "Operational awareness stub — no Identity/Canonical injection from awareness.",
      plane: "ops",
    },
  ];

  const merged = [...(state.knowledge ?? []), ...opsItems];
  let next: WorkflowState = {
    ...state,
    knowledge: merged,
    stage: "knowledge",
  };
  next = traceStage(next, "hub", "Awareness contributed operational items only", [
    "ops:situation-stub",
  ]);
  return next;
}
