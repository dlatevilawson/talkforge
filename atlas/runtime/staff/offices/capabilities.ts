/**
 * WP-S1 — Independent office capability contracts.
 * Used to validate each AIO in isolation (ATLAS-P6-EXEC).
 */

import type { AioId } from "../types";

export type OfficeCapability = {
  id: AioId;
  responsibilities: string[];
  inputs: string[];
  outputs: string[];
  escalation_rules: string[];
  success_metrics: string[];
  failure_behaviors: string[];
  /** Responsibilities this office must never perform. */
  foreign_forbidden: string[];
};

export const OFFICE_CAPABILITIES: Record<AioId, OfficeCapability> = {
  "AIO-CORE": {
    id: "AIO-CORE",
    responsibilities: [
      "atlas.authority_posture",
      "atlas.founder_channel",
      "atlas.task_assignment",
      "atlas.emission_permit",
      "atlas.program_desk",
    ],
    inputs: [
      "ingress request",
      "Guard validation / escalation_ready",
      "Counsel pack_ready",
      "Broker joint_option / deadlock",
      "Intel health_signal",
    ],
    outputs: [
      "atlas.core.task_assigned",
      "atlas.core.emission_permitted",
      "charter_halt / program.blocked",
    ],
    escalation_rules: [
      "Charter-boundary → halt + Founder path",
      "Unresolved C3 after Broker → Founder Decision Request",
      "C4 / Guard STOP → no emission",
    ],
    success_metrics: [
      "task_assigned before staff stage work",
      "emission only after Guard validation",
      "zero usurpation of Intel/Counsel/Broker/Guard stages",
    ],
    failure_behaviors: [
      "Refuse emission without Guard event",
      "Charter halt on boundary breach",
      "Do not bind Founder when uncertain",
    ],
    foreign_forbidden: [
      "atlas.labeled_context",
      "atlas.std003_counsel",
      "atlas.exec_brokerage",
      "atlas.integrity_validation",
      "company.engineering_integrity",
    ],
  },
  "AIO-INTEL": {
    id: "AIO-INTEL",
    responsibilities: ["atlas.labeled_context", "atlas.health_sensing"],
    inputs: [
      "Core task_assigned",
      "Broker status_ingested",
      "Governed knowledge sources",
    ],
    outputs: [
      "atlas.intel.context_locked",
      "atlas.intel.health_signal",
      "knowledge_gap (labeled)",
    ],
    escalation_rules: [
      "Unlabeled/scaffold-as-institutional → Guard/Core",
      "Identity/Canonical ambiguity → escalate; never invent",
    ],
    success_metrics: [
      "context_locked with labels",
      "gaps explicit",
      "zero Canonical invention",
    ],
    failure_behaviors: [
      "Refuse lock when labels missing",
      "Emit assumptions only as labeled assumptions",
      "Stop rather than invent institutional facts",
    ],
    foreign_forbidden: [
      "atlas.emission_permit",
      "atlas.std003_counsel",
      "atlas.integrity_validation",
      "atlas.exec_brokerage",
      "company.canonical_approval",
    ],
  },
  "AIO-COUNSEL": {
    id: "AIO-COUNSEL",
    responsibilities: ["atlas.std003_counsel", "atlas.brief_drafts"],
    inputs: ["locked ContextBundle", "Broker joint options", "Core tasking"],
    outputs: ["atlas.counsel.pack_ready", "STD-003 draft fields", "insufficient_knowledge"],
    escalation_rules: [
      "Would require inventing knowledge → insufficient_knowledge / escalate",
      "Founder-exclusive powers implicated → Core escalate",
      "Deadlock → must not tie-break (Guard+Core)",
    ],
    success_metrics: [
      "pack_ready only after context_locked",
      "alternatives ≥ 1",
      "binding=false",
    ],
    failure_behaviors: [
      "Refuse draft without context_locked",
      "Never emit to Founder directly",
      "Never silently drop Risk Notices from context",
    ],
    foreign_forbidden: [
      "atlas.emission_permit",
      "atlas.labeled_context",
      "atlas.integrity_validation",
      "atlas.exec_brokerage",
      "company.engineering_integrity",
    ],
  },
  "AIO-BROKER": {
    id: "AIO-BROKER",
    responsibilities: ["atlas.exec_brokerage", "atlas.risk_notice_transport"],
    inputs: ["EXEC Status/Risk/Joint positions", "Core tasking", "cadence needs"],
    outputs: [
      "atlas.broker.status_ingested",
      "atlas.broker.joint_option_ready",
      "atlas.broker.deadlock",
    ],
    escalation_rules: [
      "Deadlock → Guard + Core (not Counsel)",
      "C4 signals → Guard immediately",
      "Cannot settle C0/C1",
    ],
    success_metrics: [
      "Risk Notices immutable",
      "dissent preserved",
      "status labeled",
    ],
    failure_behaviors: [
      "Reject Risk Notice mutation",
      "Do not command EXEC-*",
      "Do not erase Sentinel findings",
    ],
    foreign_forbidden: [
      "atlas.emission_permit",
      "atlas.std003_counsel",
      "atlas.integrity_validation",
      "atlas.labeled_context",
      "company.engineering_integrity",
    ],
  },
  "AIO-GUARD": {
    id: "AIO-GUARD",
    responsibilities: [
      "atlas.integrity_validation",
      "atlas.escalation_packaging",
      "atlas.audit_trace",
    ],
    inputs: ["Counsel packs", "Broker Risk Notices", "Core tasking", "escalation paths"],
    outputs: [
      "atlas.guard.validation",
      "atlas.guard.escalation_ready",
      "atlas.guard.audit (canonical=false)",
    ],
    escalation_rules: [
      "STOP / ESCALATE on V1–V8 failure",
      "Preserve Sentinel notices; never override",
      "C4 packaging to Core → Founder",
    ],
    success_metrics: [
      "validation before emission_permitted",
      "GUARD≠Sentinel conformance",
      "audit never Canonical",
    ],
    failure_behaviors: [
      "Fail closed on integrity failure",
      "Refuse to speak as Sentinel",
      "Refuse to soften Risk Notices",
    ],
    foreign_forbidden: [
      "atlas.task_assignment",
      "atlas.std003_counsel",
      "atlas.labeled_context",
      "atlas.exec_brokerage",
      "company.engineering_integrity",
      "company.engineering_delivery",
    ],
  },
};

export function getCapability(id: AioId): OfficeCapability {
  return OFFICE_CAPABILITIES[id];
}

export function listCapabilities(): OfficeCapability[] {
  return Object.values(OFFICE_CAPABILITIES);
}
