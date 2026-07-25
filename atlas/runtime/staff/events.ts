import type { AioId } from "./types";
import type { AuthorityLabel, ValidationResult } from "../types/envelopes";

export type StaffEventName =
  | "atlas.core.task_assigned"
  | "atlas.intel.context_locked"
  | "atlas.intel.health_signal"
  | "atlas.counsel.pack_ready"
  | "atlas.broker.status_ingested"
  | "atlas.broker.joint_option_ready"
  | "atlas.broker.deadlock"
  | "atlas.guard.validation"
  | "atlas.guard.escalation_ready"
  | "atlas.guard.audit"
  | "atlas.core.emission_permitted"
  | "atlas.program.register_updated"
  | "atlas.program.blocked";

export type StaffEvent = {
  name: StaffEventName;
  at: string;
  request_id: string;
  publisher: AioId | "AIF-PROGRAM";
  payload: Record<string, unknown>;
};

export type ContextLockedPayload = {
  request_id: string;
  context_ref: string;
  authority_labels: AuthorityLabel[];
};

export type PackReadyPayload = {
  pack_id: string;
  request_id: string;
  pack_type: string;
  std003_complete: boolean;
};

export type ValidationPayload = {
  request_id: string;
  result: ValidationResult;
  violations: string[];
};

export const EVENT_CATALOG: StaffEventName[] = [
  "atlas.core.task_assigned",
  "atlas.intel.context_locked",
  "atlas.intel.health_signal",
  "atlas.counsel.pack_ready",
  "atlas.broker.status_ingested",
  "atlas.broker.joint_option_ready",
  "atlas.broker.deadlock",
  "atlas.guard.validation",
  "atlas.guard.escalation_ready",
  "atlas.guard.audit",
  "atlas.core.emission_permitted",
  "atlas.program.register_updated",
  "atlas.program.blocked",
];
