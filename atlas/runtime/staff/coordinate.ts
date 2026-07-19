/**
 * Atlas coordination layer — delegates through AIO offices (ATLAS-P6).
 * Does not modify atlas/engine/loader.ts.
 */

import type { WorkflowState } from "../types/envelopes";
import { isTargetFounderVisibleEnabled, isTargetPlaneEnabled } from "../flags";
import { runAuthority } from "../modules/authority";
import { runExchange, type ExchangeDelivery } from "../modules/exchange";
import { runIngress, type IngressInput } from "../modules/ingress";
import { runMemory } from "../modules/memory";
import { traceStage } from "../modules/trace";
import { resetStaffBus, getEventLog, hasEvent } from "./bus";
import { resetBrokerStore, brokerIngestStatus } from "./broker";
import { coreAssignTask, corePermitEmission } from "./core";
import { counselDraftPack } from "./counsel";
import { isOfficeDisabledError } from "./fault";
import { guardPackageEscalation, guardValidate } from "./guard";
import { intelBuildAndLockContext } from "./intel";
import {
  getTasks,
  resetDelegationMetrics,
  snapshotMetrics,
} from "./metrics";
import { programUpdateWave, resetProgramRegister } from "./program";
import type { DelegationMetrics, TaskAssignment } from "./types";
import type { StaffEvent } from "./events";

export type StaffPipelineResult = {
  plane: "target";
  mode: "staff-coordinated";
  enabled: boolean;
  founderVisible: boolean;
  state: WorkflowState;
  delivery?: ExchangeDelivery;
  ok: boolean;
  tasks: TaskAssignment[];
  events: StaffEvent[];
  metrics: DelegationMetrics;
  emissionPermitted: boolean;
};

export type StaffPipelineOptions = {
  /** Optional Engineering/EXEC status for Broker intake (S2-A). */
  execStatus?: {
    statusId: string;
    sourceExec: string;
    authorityLabel: "operational" | "authoritative" | "draft";
  };
};

/**
 * Run the governing flow with mandatory AIO delegation.
 */
export async function runStaffCoordinatedPipeline(
  input: IngressInput,
  options?: StaffPipelineOptions
): Promise<StaffPipelineResult> {
  const enabled = isTargetPlaneEnabled();
  const founderVisible = isTargetFounderVisibleEnabled();

  resetStaffBus();
  resetBrokerStore();
  resetProgramRegister();

  const ingress = runIngress(input);
  let state = ingress.state;
  state = traceStage(state, "hub", "Staff-coordinated orchestrator start");

  resetDelegationMetrics(state.request_id);
  programUpdateWave(state.request_id, "P6-staff-run", "RUNNING");

  if (!ingress.ok) {
    const metrics = snapshotMetrics();
    return emptyResult(state, enabled, founderVisible, false, metrics);
  }

  // Core owns authority posture (policy) — stage exec shared under Core
  coreAssignTask(state.request_id, "AIO-CORE", "Authority checkpoint");
  state = runAuthority(state);
  // Authority is Core policy stage — count as final coordination not usurpation of Intel/etc.
  // runAuthority is module work attributed via assign only; do not record Core stage usurpation.

  if (state.authority?.result === "reject") {
    state = runMemory(state);
    programUpdateWave(state.request_id, "P6-staff-run", "FAIL");
    return emptyResult(state, enabled, founderVisible, false, snapshotMetrics());
  }

  if (state.authority?.result === "escalate") {
    try {
      coreAssignTask(state.request_id, "AIO-GUARD", "Package escalation");
      state = guardPackageEscalation(state);
      coreAssignTask(state.request_id, "AIO-GUARD", "Validate escalation path");
      state = guardValidate(state);
      const permitted = corePermitEmission(state.request_id);
      let delivery: ExchangeDelivery | undefined;
      if (founderVisible && permitted) {
        const exchanged = runExchange(state);
        state = exchanged.state;
        delivery = exchanged.delivery;
      } else {
        state = traceStage(
          state,
          "exchange",
          "Escalation Founder delivery suppressed or emission not permitted"
        );
      }
      state = runMemory(state);
      programUpdateWave(state.request_id, "P6-staff-run", "PASS");
      return {
        plane: "target",
        mode: "staff-coordinated",
        enabled,
        founderVisible,
        state,
        delivery,
        ok: true,
        tasks: [...getTasks()],
        events: [...getEventLog()],
        metrics: snapshotMetrics(),
        emissionPermitted: permitted,
      };
    } catch (err) {
      if (isOfficeDisabledError(err)) {
        state = {
          ...state,
          error: err instanceof Error ? err.message : "OFFICE_DISABLED",
        };
        state = runMemory(state);
        programUpdateWave(state.request_id, "P6-staff-run", "FAIL");
        return emptyResult(state, enabled, founderVisible, false, snapshotMetrics());
      }
      throw err;
    }
  }

  try {
    // Broker intake (optional company interface)
    if (options?.execStatus) {
      coreAssignTask(state.request_id, "AIO-BROKER", "Ingest EXEC status");
      brokerIngestStatus(
        state.request_id,
        options.execStatus.statusId,
        options.execStatus.sourceExec,
        options.execStatus.authorityLabel
      );
    } else {
      coreAssignTask(state.request_id, "AIO-BROKER", "Standby EXEC interface watch");
      brokerIngestStatus(
        state.request_id,
        `auto-${state.request_id}`,
        "EXEC-ENGINEERING",
        "operational"
      );
    }

    coreAssignTask(state.request_id, "AIO-INTEL", "Build and lock labeled context");
    state = await intelBuildAndLockContext(state);
    if (state.error) {
      state = runMemory(state);
      programUpdateWave(state.request_id, "P6-staff-run", "FAIL");
      return emptyResult(state, enabled, founderVisible, false, snapshotMetrics());
    }

    coreAssignTask(state.request_id, "AIO-COUNSEL", "Draft STD-003 counsel pack");
    state = counselDraftPack(state);
    if (state.error) {
      state = runMemory(state);
      programUpdateWave(state.request_id, "P6-staff-run", "FAIL");
      return emptyResult(state, enabled, founderVisible, false, snapshotMetrics());
    }

    coreAssignTask(state.request_id, "AIO-GUARD", "Integrity validation");
    state = guardValidate(state);

    const permitted = corePermitEmission(state.request_id);
    if (
      !permitted ||
      !hasEvent("atlas.guard.validation", state.request_id)
    ) {
      state = traceStage(state, "hub", "Emission blocked — Guard gate");
    }

    let delivery: ExchangeDelivery | undefined;
    if (founderVisible && permitted) {
      const exchanged = runExchange(state);
      state = exchanged.state;
      delivery = exchanged.delivery;
    } else {
      state = traceStage(
        state,
        "exchange",
        "Founder-visible target delivery suppressed (ATLAS_RUNTIME_FOUNDER_VISIBLE off) or emission not permitted"
      );
    }

    state = runMemory(state);
    const ok =
      (state.validation?.result === "PASS" ||
        state.validation?.result === "ESCALATE") &&
      permitted;
    programUpdateWave(
      state.request_id,
      "P6-staff-run",
      ok ? "PASS" : "FAIL"
    );

    return {
      plane: "target",
      mode: "staff-coordinated",
      enabled,
      founderVisible,
      state,
      delivery,
      ok,
      tasks: [...getTasks()],
      events: [...getEventLog()],
      metrics: snapshotMetrics(),
      emissionPermitted: permitted,
    };
  } catch (err) {
    // WP-S4: office disable / dependency failure — contain, do not invent authority
    if (isOfficeDisabledError(err)) {
      state = {
        ...state,
        error: err instanceof Error ? err.message : "OFFICE_DISABLED",
      };
      state = traceStage(
        state,
        "hub",
        `Fail-closed: ${state.error}`
      );
      state = runMemory(state);
      programUpdateWave(state.request_id, "P6-staff-run", "FAIL");
      return emptyResult(state, enabled, founderVisible, false, snapshotMetrics());
    }
    throw err;
  }
}

function emptyResult(
  state: WorkflowState,
  enabled: boolean,
  founderVisible: boolean,
  ok: boolean,
  metrics: DelegationMetrics
): StaffPipelineResult {
  return {
    plane: "target",
    mode: "staff-coordinated",
    enabled,
    founderVisible,
    state,
    ok,
    tasks: [...getTasks()],
    events: [...getEventLog()],
    metrics,
    emissionPermitted: false,
  };
}
