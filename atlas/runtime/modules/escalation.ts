import { randomUUID } from "crypto";
import type { RecommendationArtifact, WorkflowState } from "../types/envelopes";
import { traceStage } from "./trace";

/**
 * rt.escalation — hard-boundary package; still requires Integrity before Founder.
 */
export function runEscalation(state: WorkflowState): WorkflowState {
  const reasons =
    state.authority?.reasons ??
    state.validation?.notes ??
    ["Escalation requested"];

  const artifact: RecommendationArtifact = {
    recommendation_id: randomUUID(),
    request_id: state.request_id,
    type: "escalation",
    binding: false,
    escalation: true,
    authority_labels_used: (state.context?.items ?? []).map((i) => i.authority_label),
    objective: state.request?.intent ?? "Escalation",
    recommendation: `Escalation to Founder: ${reasons.join("; ")}`,
    alternatives: ["Founder decides", "Return for correction"],
    tradeoffs: ["Delay vs unauthorized action"],
    risks: ["Acting without Founder authority"],
    confidence: "low",
    missing_info: [],
  };

  let next: WorkflowState = {
    ...state,
    recommendation: artifact,
    stage: "escalation",
  };
  next = traceStage(next, "escalation", "Escalation package built", [
    artifact.recommendation_id,
  ]);
  return next;
}
