/**
 * Atlas Internal Office types (ATLAS-P5 / ATLAS-P6).
 * AIF-PROGRAM is a Core function — not a peer AIO.
 */

export type AioId =
  | "AIO-CORE"
  | "AIO-INTEL"
  | "AIO-COUNSEL"
  | "AIO-BROKER"
  | "AIO-GUARD";

/** Program Desk is a function under Core — never a sixth office id. */
export type AifId = "AIF-PROGRAM";

export type StaffActor = AioId | AifId;

export type RuntimeModuleId =
  | "rt.ingress"
  | "rt.authority"
  | "rt.knowledge"
  | "rt.awareness"
  | "rt.context"
  | "rt.cognition"
  | "rt.composition"
  | "rt.integrity"
  | "rt.escalation"
  | "rt.exchange"
  | "rt.memory"
  | "rt.trace"
  | "rt.hub"
  | "aio.core.program";

export type TaskAssignment = {
  task_id: string;
  request_id: string;
  assignee_aio: AioId;
  objective: string;
  at: string;
};

export type DelegationMetrics = {
  request_id: string;
  tasks_assigned: number;
  distinct_assignees: AioId[];
  /** Work units executed by each AIO (facade invocations). */
  executions_by_aio: Partial<Record<AioId, number>>;
  /** Core executions that are finals only (assign/permit/halt) vs stage work. */
  core_finals: number;
  core_stage_usurpations: number;
  emission_permitted: boolean;
  guard_validation_present: boolean;
  /** TE-1 proxy: distinct staff AIOs (excl. Core) that executed ≥1 unit. */
  staff_offices_used: number;
  /** True when Core did not execute Intel/Counsel/Broker/Guard stage work. */
  delegated_cleanly: boolean;
};

export type OfficePack = {
  id: AioId;
  title: string;
  mission: string;
  purpose: string;
  may: string[];
  must_not: string[];
  /** Operating prompt — injected as staff posture, not Canonical law. */
  prompt: string;
  standards: string[];
  success_metrics: string[];
  interfaces: string[];
};
