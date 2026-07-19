import type { ReasoningProduct, WorkflowState } from "../types/envelopes";
import { traceStage } from "./trace";

/**
 * rt.cognition — only stage that thinks; ContextBundle locked required.
 * Deterministic structural pass for W3 (no model call required for gate checks).
 * Model-backed reasoning remains Legacy plane until Founder enables target flag + model path.
 */
export function runCognition(state: WorkflowState): WorkflowState {
  if (!state.context?.locked) {
    let next: WorkflowState = { ...state, stage: "cognition" as const };
    next = traceStage(next, "cognition", "Blocked: ContextBundle not locked");
    return { ...next, error: "Cognition requires locked ContextBundle" };
  }

  // Hard rule: never read raw memory — only Context items
  const evidence = state.context.items.map(
    (i) => `${i.source_id} [${i.authority_label}/${i.plane}]`
  );

  const missing: string[] =
    state.context.items.length === 0
      ? ["No knowledge items in locked context"]
      : [];

  // Operational integrity: never invent Canonical when the ask requires absent institutional fact
  const objective = state.context.objective;
  if (
    /canonical/i.test(objective) &&
    /(unpublished|does not exist|not (yet )?exist|invent|as fact)/i.test(objective)
  ) {
    missing.push(
      "Requested Canonical institutional knowledge is not present in labeled context — do not invent"
    );
  }

  const product: ReasoningProduct = {
    request_id: state.request_id,
    objective: state.context.objective,
    evidence,
    facts: evidence.slice(0, 3).map((e) => `Grounded source present: ${e}`),
    assumptions: [
      "Structural cognition pass — not a binding decision",
      "Legacy-atlas labels are not ATOS Canonical upgrades",
    ],
    inferences: [
      "Counsel should cite labeled sources and remain non-binding",
    ],
    alternatives: [
      "Proceed with labeled-source counsel",
      "Escalate for Founder judgment if authority boundary unclear",
      "Return insufficient-knowledge notice if sources do not cover the ask",
    ],
    tradeoffs: [
      "Completeness vs smallest-sufficient context",
      "Speed vs Integrity gate completeness",
    ],
    risks: [
      "Treating legacy-atlas as Canonical without promotion",
      "Skipping Validation before Founder delivery",
    ],
    long_term_notes: [
      "Target plane must remain subordinate to Phases 0–3 governance",
    ],
    missing_info: missing,
    draft_recommendation:
      missing.length > 0
        ? "Insufficient labeled knowledge to form a grounded recommendation."
        : "Recommend proceeding with counsel grounded only in labeled context sources; Founder decides.",
    confidence: missing.length > 0 ? "low" : "medium",
    escalation_flag: missing.some((m) => /canonical/i.test(m)),
  };

  let next: WorkflowState = {
    ...state,
    reasoning: product,
    stage: "cognition",
  };
  next = traceStage(next, "cognition", "ReasoningProduct formed from locked context only", [
    `evidence:${evidence.length}`,
  ]);
  return next;
}
