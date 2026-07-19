import type { WorkflowState } from "../types/envelopes";
import { traceStage } from "./trace";

export type ExchangeDelivery = {
  channel: "founder" | "blocked";
  deliverable: string;
  binding: false;
  validation: string;
};

/**
 * rt.exchange — Founder delivery only after PASS (or validated escalation).
 * Cannot Canonicalize or claim Decision Authority.
 */
export function runExchange(state: WorkflowState): {
  state: WorkflowState;
  delivery: ExchangeDelivery;
} {
  const verdict = state.validation?.result;
  const allowed = verdict === "PASS" || verdict === "ESCALATE";

  if (!allowed || !state.recommendation) {
    const blocked: ExchangeDelivery = {
      channel: "blocked",
      deliverable: state.error ?? "Not eligible for Founder delivery",
      binding: false,
      validation: verdict ?? "missing",
    };
    let next = traceStage(state, "exchange", "Delivery blocked — Integrity did not PASS/ESCALATE");
    return { state: next, delivery: blocked };
  }

  const delivery: ExchangeDelivery = {
    channel: "founder",
    deliverable: state.recommendation.recommendation,
    binding: false,
    validation: verdict,
  };

  let next = traceStage(state, "exchange", `Founder channel delivery (${verdict})`, [
    state.recommendation.recommendation_id,
  ]);
  return { state: next, delivery };
}
