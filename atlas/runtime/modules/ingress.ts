import { randomUUID } from "crypto";
import { normalizeCompanyEvents } from "../ingest/company-event";
import type {
  CompanyEvent,
  RequestEnvelope,
  RequestSource,
  WorkflowState,
} from "../types/envelopes";
import { traceStage } from "./trace";

export type IngressInput = {
  message?: string;
  source?: RequestSource;
  events?: CompanyEvent[];
};

export type IngressResult =
  | { ok: true; state: WorkflowState }
  | { ok: false; state: WorkflowState; error: string };

/**
 * rt.ingress — admit/classify legitimate inputs only.
 * ACI-001 G2: company events share this receive path (ops-labeled, never Canonical).
 * Does not reason or recommend.
 */
export function runIngress(input: IngressInput): IngressResult {
  const events = normalizeCompanyEvents(input.events);
  const explicitMessage = (input.message ?? "").trim();
  const message =
    explicitMessage ||
    (events.length > 0
      ? `Admit ${events.length} operational company event(s).`
      : "");
  const request_id = randomUUID();
  let state: WorkflowState = {
    request_id,
    stage: "ingress",
    audit: [],
    ingestedEvents: events,
  };

  if (!message) {
    state = traceStage(state, "ingress", "Reject empty request");
    return {
      ok: false,
      state: { ...state, error: "A message is required." },
      error: "A message is required.",
    };
  }

  const source: RequestSource =
    input.source ?? (events.length > 0 && !explicitMessage ? "ops" : "founder");

  const request: RequestEnvelope = {
    request_id,
    source,
    intent: message,
    payload_ref:
      events.length > 0 ? `events:${request_id}` : `message:${request_id}`,
    received_at: new Date().toISOString(),
  };

  state = {
    ...state,
    request,
  };
  state = traceStage(state, "ingress", "Request admitted", [
    request.payload_ref,
    ...events.map((event) => `event:${event.family}:${event.kind}`),
  ]);
  return { ok: true, state };
}
