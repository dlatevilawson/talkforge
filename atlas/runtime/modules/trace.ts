import { randomUUID } from "crypto";
import type { AuditEvent, RuntimeStage, WorkflowState } from "../types/envelopes";

/** In-memory audit sink for target plane (non-Canonical). */
const auditSink: AuditEvent[] = [];

export function resetTraceSinkForTests(): void {
  auditSink.length = 0;
}

export function getAuditSink(): readonly AuditEvent[] {
  return auditSink;
}

export function recordAudit(
  requestId: string,
  stage: RuntimeStage,
  summary: string,
  refs: string[] = []
): AuditEvent {
  const event: AuditEvent = {
    event_id: randomUUID(),
    request_id: requestId,
    stage,
    summary,
    refs,
    canonical: false,
    at: new Date().toISOString(),
  };
  if (event.canonical !== false) {
    throw new Error("AuditEvent.canonical must always be false");
  }
  auditSink.push(event);
  return event;
}

export function appendAudit(state: WorkflowState, event: AuditEvent): WorkflowState {
  return { ...state, audit: [...state.audit, event] };
}

export function traceStage(
  state: WorkflowState,
  stage: RuntimeStage,
  summary: string,
  refs: string[] = []
): WorkflowState {
  const event = recordAudit(state.request_id, stage, summary, refs);
  return appendAudit({ ...state, stage }, event);
}
