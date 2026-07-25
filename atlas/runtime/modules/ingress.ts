import { randomUUID } from "crypto";
import type { RequestEnvelope, RequestSource, WorkflowState } from "../types/envelopes";
import { traceStage } from "./trace";

export type IngressInput = {
  message: string;
  source?: RequestSource;
};

export type IngressResult =
  | { ok: true; state: WorkflowState }
  | { ok: false; state: WorkflowState; error: string };

/**
 * rt.ingress — admit/classify legitimate inputs only.
 * Does not reason or recommend.
 */
export function runIngress(input: IngressInput): IngressResult {
  const message = input.message.trim();
  const request_id = randomUUID();
  let state: WorkflowState = {
    request_id,
    stage: "ingress",
    audit: [],
  };

  if (!message) {
    state = traceStage(state, "ingress", "Reject empty request");
    return {
      ok: false,
      state: { ...state, error: "A message is required." },
      error: "A message is required.",
    };
  }

  const request: RequestEnvelope = {
    request_id,
    source: input.source ?? "founder",
    intent: message,
    payload_ref: `message:${request_id}`,
    received_at: new Date().toISOString(),
  };

  state = {
    ...state,
    request,
  };
  state = traceStage(state, "ingress", "Request admitted", [request.payload_ref]);
  return { ok: true, state };
}
