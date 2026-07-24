import type { WorkflowState } from "../types/envelopes";
import { runEscalation } from "../modules/escalation";
import { runIntegrity } from "../modules/integrity";
import { publish, findEvent } from "./bus";
import { assertOfficeEnabled } from "./fault";
import { markGuardValidation, recordExecution } from "./metrics";
import { assertGuardIsNotSentinel } from "./sentinel-wall";
import { getOfficePack } from "./offices/packs";

export function guardValidate(state: WorkflowState): WorkflowState {
  assertOfficeEnabled("AIO-GUARD");
  recordExecution("AIO-GUARD", "stage");
  const pack = getOfficePack("AIO-GUARD");
  assertGuardIsNotSentinel([pack.prompt.slice(0, 80), "Integrity validation running"]);

  const next = runIntegrity(state);
  let result = next.validation?.result ?? "STOP";
  const violations =
    next.validation?.notes.filter((n) => /fail|missing|reject/i.test(n)) ?? [];

  // WP-S4: reject corrupted validation payloads / Canonical-upgrade attempts on the bus
  const prior = findEvent("atlas.counsel.pack_ready", next.request_id);
  if (prior?.payload?.corrupted === true || prior?.payload?.canonical === true) {
    result = "STOP";
    violations.push("corrupted_or_canonical_upgrade_on_bus");
  }

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
      canonical: false,
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

  return {
    ...next,
    validation: next.validation
      ? { ...next.validation, result, notes: [...next.validation.notes, ...violations] }
      : {
          request_id: next.request_id,
          result,
          failed_stages: ["integrity"],
          notes: violations,
        },
  };
}

export function guardPackageEscalation(state: WorkflowState): WorkflowState {
  assertOfficeEnabled("AIO-GUARD");
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
