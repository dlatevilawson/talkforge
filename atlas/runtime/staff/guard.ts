import type { WorkflowState } from "../types/envelopes";
import { runEscalation } from "../modules/escalation";
import { runIntegrity } from "../modules/integrity";
import { publish } from "./bus";
import { markGuardValidation, recordExecution } from "./metrics";
import { assertGuardIsNotSentinel } from "./sentinel-wall";
import { getOfficePack } from "./offices/packs";

export function guardValidate(state: WorkflowState): WorkflowState {
  recordExecution("AIO-GUARD", "stage");
  const pack = getOfficePack("AIO-GUARD");
  assertGuardIsNotSentinel([pack.prompt.slice(0, 80), "Integrity validation running"]);

  const next = runIntegrity(state);
  const result = next.validation?.result ?? "STOP";
  const violations =
    next.validation?.notes.filter((n) => /fail|missing|reject/i.test(n)) ?? [];

  markGuardValidation(true);
  publish({
    name: "atlas.guard.validation",
    at: new Date().toISOString(),
    request_id: next.request_id,
    publisher: "AIO-GUARD",
    payload: {
      request_id: next.request_id,
      result,
      violations,
    },
  });

  publish({
    name: "atlas.guard.audit",
    at: new Date().toISOString(),
    request_id: next.request_id,
    publisher: "AIO-GUARD",
    payload: {
      event_id: `audit-${next.request_id}`,
      canonical: false,
      result,
    },
  });

  return next;
}

export function guardPackageEscalation(state: WorkflowState): WorkflowState {
  recordExecution("AIO-GUARD", "stage");
  const next = runEscalation(state);
  publish({
    name: "atlas.guard.escalation_ready",
    at: new Date().toISOString(),
    request_id: next.request_id,
    publisher: "AIO-GUARD",
    payload: {
      escalation_id: `esc-${next.request_id}`,
      class: "C4",
      preserved_notices: [],
    },
  });
  return next;
}
