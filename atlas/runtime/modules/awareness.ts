import type { KnowledgeItem, WorkflowState } from "../types/envelopes";
import { traceStage } from "./trace";

/**
 * rt.awareness — operational-labeled items only.
 * Live imbalance cards live on FounderOS (IV-AI-008). This plane stays ops-only.
 */
export function runAwareness(state: WorkflowState): WorkflowState {
  const opsItems: KnowledgeItem[] = [
    {
      source_id: "ops:awareness-steward",
      authority_label: "operational",
      status: "ops",
      excerpt_or_ref:
        "Awareness steward: FounderOS surfaces material imbalances. Atlas notifies; engineering owns remediation. No Identity or Canonical injection.",
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
    "ops:awareness-steward",
  ]);
  return next;
}
