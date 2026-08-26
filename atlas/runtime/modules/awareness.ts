import type { KnowledgeItem, WorkflowState } from "../types/envelopes";
import { traceStage } from "./trace";

/**
 * rt.awareness — operational-labeled items only.
 * G2: ingested company events replace the static placeholder when present.
 * Live imbalance cards still live on FounderOS (IV-AI-008). This plane stays ops-only.
 */
export function runAwareness(state: WorkflowState): WorkflowState {
  const ingested = (state.ingestedEvents ?? []).map(
    (event): KnowledgeItem => ({
      source_id: `ops:event:${event.family}:${event.kind}`,
      authority_label: "operational",
      status: "ops",
      excerpt_or_ref: event.fact,
      plane: "ops",
    })
  );

  const opsItems: KnowledgeItem[] =
    ingested.length > 0
      ? ingested
      : [
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
    ...opsItems.map((item) => item.source_id),
  ]);
  return next;
}
