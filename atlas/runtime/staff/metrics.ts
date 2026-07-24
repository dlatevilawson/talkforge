import type { AioId, DelegationMetrics, TaskAssignment } from "./types";

const tasks: TaskAssignment[] = [];
const executions: Partial<Record<AioId, number>> = {};
let coreFinals = 0;
let coreStageUsurpations = 0;
let emissionPermitted = false;
let guardValidationPresent = false;
let activeRequestId = "";

export function resetDelegationMetrics(requestId: string): void {
  tasks.length = 0;
  for (const k of Object.keys(executions) as AioId[]) delete executions[k];
  coreFinals = 0;
  coreStageUsurpations = 0;
  emissionPermitted = false;
  guardValidationPresent = false;
  activeRequestId = requestId;
}

export function recordTask(task: TaskAssignment): void {
  tasks.push(task);
}

export function recordExecution(aio: AioId, kind: "final" | "stage" = "stage"): void {
  executions[aio] = (executions[aio] ?? 0) + 1;
  if (aio === "AIO-CORE") {
    if (kind === "final") coreFinals += 1;
    else coreStageUsurpations += 1;
  }
}

export function markEmissionPermitted(v: boolean): void {
  emissionPermitted = v;
}

export function markGuardValidation(v: boolean): void {
  guardValidationPresent = v;
}

export function snapshotMetrics(): DelegationMetrics {
  const distinct = [...new Set(tasks.map((t) => t.assignee_aio))];
  const staff = (["AIO-INTEL", "AIO-COUNSEL", "AIO-BROKER", "AIO-GUARD"] as AioId[]).filter(
    (id) => (executions[id] ?? 0) > 0
  );
  return {
    request_id: activeRequestId,
    tasks_assigned: tasks.length,
    distinct_assignees: distinct,
    executions_by_aio: { ...executions },
    core_finals: coreFinals,
    core_stage_usurpations: coreStageUsurpations,
    emission_permitted: emissionPermitted,
    guard_validation_present: guardValidationPresent,
    staff_offices_used: staff.length,
    delegated_cleanly: coreStageUsurpations === 0 && staff.length >= 3,
  };
}

export function getTasks(): readonly TaskAssignment[] {
  return tasks;
}
