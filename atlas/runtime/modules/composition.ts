import { randomUUID } from "crypto";
import type {
  AuthorityLabel,
  RecommendationArtifact,
  WorkflowState,
} from "../types/envelopes";
import { traceStage } from "./trace";

/**
 * rt.composition — package non-binding recommendations.
 * Must route to Integrity; never direct Founder publish.
 */
export function runComposition(state: WorkflowState): WorkflowState {
  if (!state.reasoning) {
    let next: WorkflowState = { ...state, stage: "composition" as const };
    next = traceStage(next, "composition", "Blocked: missing ReasoningProduct");
    return { ...next, error: "Composition requires ReasoningProduct" };
  }

  const labels = Array.from(
    new Set(
      (state.context?.items ?? []).map((i) => i.authority_label)
    )
  ) as AuthorityLabel[];

  const type =
    state.reasoning.missing_info.length > 0
      ? ("insufficient_knowledge" as const)
      : state.reasoning.escalation_flag
        ? ("escalation" as const)
        : ("standard" as const);

  const artifact: RecommendationArtifact = {
    recommendation_id: randomUUID(),
    request_id: state.request_id,
    type,
    binding: false,
    escalation: state.reasoning.escalation_flag,
    authority_labels_used: labels,
    objective: state.reasoning.objective,
    recommendation: state.reasoning.draft_recommendation,
    alternatives: state.reasoning.alternatives,
    tradeoffs: state.reasoning.tradeoffs,
    risks: state.reasoning.risks,
    confidence: state.reasoning.confidence,
    missing_info: state.reasoning.missing_info,
  };

  if (artifact.binding !== false) {
    throw new Error("RecommendationArtifact.binding must be false");
  }

  let next: WorkflowState = {
    ...state,
    recommendation: artifact,
    stage: "composition",
  };
  next = traceStage(next, "composition", `RecommendationArtifact type=${type} binding=false`, [
    artifact.recommendation_id,
  ]);
  return next;
}
