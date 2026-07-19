import type { AioId, TaskAssignment } from "./types";
import { publish, hasEvent, findEvent } from "./bus";
import {
  markEmissionPermitted,
  recordExecution,
  recordTask,
} from "./metrics";
import { getOfficePack } from "./offices/packs";

let taskSeq = 0;

export function coreAssignTask(
  requestId: string,
  assignee: AioId,
  objective: string
): TaskAssignment {
  recordExecution("AIO-CORE", "final");
  void getOfficePack("AIO-CORE").prompt;
  taskSeq += 1;
  const task: TaskAssignment = {
    task_id: `task-${requestId}-${taskSeq}`,
    request_id: requestId,
    assignee_aio: assignee,
    objective,
    at: new Date().toISOString(),
  };
  recordTask(task);
  publish({
    name: "atlas.core.task_assigned",
    at: task.at,
    request_id: requestId,
    publisher: "AIO-CORE",
    payload: {
      task_id: task.task_id,
      assignee_aio: assignee,
      request_id: requestId,
      objective,
    },
  });
  return task;
}

export function corePermitEmission(requestId: string): boolean {
  recordExecution("AIO-CORE", "final");
  const validationOk = hasEvent("atlas.guard.validation", requestId);
  if (!validationOk) {
    markEmissionPermitted(false);
    return false;
  }
  const ev = findEvent("atlas.guard.validation", requestId);
  const result = ev?.payload?.result;
  if (result !== "PASS" && result !== "ESCALATE") {
    markEmissionPermitted(false);
    return false;
  }
  markEmissionPermitted(true);
  publish({
    name: "atlas.core.emission_permitted",
    at: new Date().toISOString(),
    request_id: requestId,
    publisher: "AIO-CORE",
    payload: {
      request_id: requestId,
      requires_validation: result,
    },
  });
  return true;
}

export function coreCharterHalt(requestId: string, reason: string): void {
  recordExecution("AIO-CORE", "final");
  markEmissionPermitted(false);
  publish({
    name: "atlas.program.blocked",
    at: new Date().toISOString(),
    request_id: requestId,
    publisher: "AIO-CORE",
    payload: { reason, charter_halt: true },
  });
}
