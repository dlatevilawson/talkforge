/**
 * Independent per-office capability runners (WP-S1).
 * Each test isolates one AIO — no assuming another office's job.
 */

import { runIngress } from "../modules/ingress";
import { runAuthority } from "../modules/authority";
import { resetTraceSinkForTests } from "../modules/trace";
import {
  brokerIngestRiskNotice,
  brokerSignalDeadlock,
  brokerTryAlterRiskNotice,
  resetBrokerStore,
} from "./broker";
import { resetStaffBus, hasEvent, getEventLog } from "./bus";
import { coreAssignTask, corePermitEmission, coreCharterHalt } from "./core";
import { counselDraftPack } from "./counsel";
import { guardValidate, guardPackageEscalation } from "./guard";
import { intelBuildAndLockContext, intelEmitHealthSignal } from "./intel";
import { resetDelegationMetrics, snapshotMetrics } from "./metrics";
import { RESPONSIBILITY_OWNER } from "./ownership";
import { getCapability, type OfficeCapability } from "./offices/capabilities";
import { getOfficePack } from "./offices/packs";
import { instantiateOffice } from "./offices/registry";
import { runSentinelWallConformance } from "./sentinel-wall";
import type { AioId } from "./types";

export type OfficeValidationResult = {
  id: AioId;
  ok: boolean;
  checks: { name: string; pass: boolean; detail: string }[];
  capability: OfficeCapability;
};

function check(
  name: string,
  pass: boolean,
  detail: string
): { name: string; pass: boolean; detail: string } {
  return { name, pass, detail };
}

function assertNoForeignOwnership(id: AioId, cap: OfficeCapability): boolean {
  for (const foreign of cap.foreign_forbidden) {
    if (RESPONSIBILITY_OWNER[foreign] === id) return false;
  }
  // Also: this office must not be listed as owner of another's exclusive duties
  for (const [resp, owner] of Object.entries(RESPONSIBILITY_OWNER)) {
    if (owner === id && cap.foreign_forbidden.includes(resp)) return false;
  }
  return true;
}

export async function validateOfficeIndependent(
  id: AioId
): Promise<OfficeValidationResult> {
  const capability = getCapability(id);
  const pack = getOfficePack(id);
  const checks: OfficeValidationResult["checks"] = [];

  // Structural pack / capability alignment
  const inst = instantiateOffice(id);
  checks.push(
    check("instantiate", inst.status === "operational", `facade=${inst.facade}`)
  );
  checks.push(
    check(
      "responsibilities_nonempty",
      capability.responsibilities.length > 0,
      `${capability.responsibilities.length} responsibilities`
    )
  );
  checks.push(
    check(
      "inputs_outputs",
      capability.inputs.length > 0 && capability.outputs.length > 0,
      `in=${capability.inputs.length} out=${capability.outputs.length}`
    )
  );
  checks.push(
    check(
      "escalation_rules",
      capability.escalation_rules.length > 0,
      `${capability.escalation_rules.length} rules`
    )
  );
  checks.push(
    check(
      "success_metrics",
      capability.success_metrics.length > 0 && pack.success_metrics.length > 0,
      "pack + capability metrics present"
    )
  );
  checks.push(
    check(
      "failure_behaviors",
      capability.failure_behaviors.length > 0,
      `${capability.failure_behaviors.length} failure behaviors`
    )
  );
  checks.push(
    check(
      "no_foreign_responsibility",
      assertNoForeignOwnership(id, capability),
      "does not own foreign_forbidden duties"
    )
  );

  // Behavioral isolation tests
  resetStaffBus();
  resetBrokerStore();
  resetTraceSinkForTests();
  resetDelegationMetrics(`iso-${id}`);

  if (id === "AIO-CORE") {
    const t = coreAssignTask("iso-core", "AIO-INTEL", "Isolate assign");
    checks.push(
      check(
        "output_task_assigned",
        hasEvent("atlas.core.task_assigned", "iso-core") && t.assignee_aio === "AIO-INTEL",
        "task_assigned published"
      )
    );
    const blocked = corePermitEmission("iso-core");
    checks.push(
      check(
        "failure_no_guard_emission",
        blocked === false,
        "emission refused without Guard"
      )
    );
    coreCharterHalt("iso-core", "test halt");
    checks.push(
      check(
        "escalation_charter_halt",
        getEventLog().some((e) => e.name === "atlas.program.blocked"),
        "charter halt / blocked event"
      )
    );
    // Must not run Intel stage itself
    const m = snapshotMetrics();
    checks.push(
      check(
        "no_usurp_intel",
        (m.executions_by_aio["AIO-INTEL"] ?? 0) === 0,
        "Core did not execute Intel stage in isolation assign test"
      )
    );
  }

  if (id === "AIO-INTEL") {
    const ingress = runIngress({ message: "Intel isolation context build" });
    let state = runAuthority(ingress.state);
    coreAssignTask(state.request_id, "AIO-INTEL", "Lock context");
    state = await intelBuildAndLockContext(state);
    checks.push(
      check(
        "output_context_locked",
        hasEvent("atlas.intel.context_locked", state.request_id) &&
          state.context?.locked === true,
        "context_locked"
      )
    );
    checks.push(
      check(
        "success_labels",
        (state.context?.items.every((i) => Boolean(i.authority_label)) ?? false),
        "all items labeled"
      )
    );
    intelEmitHealthSignal(state.request_id, "info", ["ops ok"], ["assume steady"]);
    checks.push(
      check(
        "output_health_signal",
        hasEvent("atlas.intel.health_signal", state.request_id),
        "health_signal"
      )
    );
    // Must not emit pack_ready or validation
    checks.push(
      check(
        "no_assume_counsel",
        !hasEvent("atlas.counsel.pack_ready", state.request_id),
        "Intel did not emit pack_ready"
      )
    );
    checks.push(
      check(
        "no_assume_guard",
        !hasEvent("atlas.guard.validation", state.request_id),
        "Intel did not emit validation"
      )
    );
  }

  if (id === "AIO-COUNSEL") {
    // Failure: draft without lock
    const ingress = runIngress({ message: "Counsel isolation" });
    let state = runAuthority(ingress.state);
    resetStaffBus();
    resetDelegationMetrics(state.request_id);
    const refused = counselDraftPack(state);
    checks.push(
      check(
        "failure_without_lock",
        Boolean(refused.error),
        refused.error ?? "expected refuse"
      )
    );
    // Success path: provide lock event then draft
    resetStaffBus();
    resetDelegationMetrics(state.request_id);
    state = await intelBuildAndLockContext(state);
    // Clear counsel usurpation concern: Intel ran — that's input dependency, not Counsel assuming Intel ownership
    state = counselDraftPack(state);
    checks.push(
      check(
        "output_pack_ready",
        !state.error && hasEvent("atlas.counsel.pack_ready", state.request_id),
        "pack_ready after lock"
      )
    );
    checks.push(
      check(
        "success_non_binding",
        state.recommendation?.binding === false,
        "binding=false"
      )
    );
    checks.push(
      check(
        "no_assume_emission",
        !hasEvent("atlas.core.emission_permitted", state.request_id),
        "Counsel did not permit emission"
      )
    );
  }

  if (id === "AIO-BROKER") {
    const notice = brokerIngestRiskNotice("iso-broker", {
      id: "RN-ISO",
      summary: "Integrity",
      body: "Finding",
      source: "EXEC-SENTINEL",
    });
    checks.push(
      check(
        "output_status_ingested",
        hasEvent("atlas.broker.status_ingested", "iso-broker"),
        "status_ingested"
      )
    );
    let imm = false;
    try {
      brokerTryAlterRiskNotice(notice.id, "soft", notice.body);
    } catch {
      imm = true;
    }
    checks.push(check("failure_immutability", imm, "Risk Notice mutate rejected"));
    brokerSignalDeadlock("iso-broker", "th1", ["EXEC-A", "EXEC-B"], "conflict");
    checks.push(
      check(
        "escalation_deadlock",
        hasEvent("atlas.broker.deadlock", "iso-broker"),
        "deadlock event"
      )
    );
    checks.push(
      check(
        "no_assume_counsel_tiebreak",
        !getEventLog().some((e) => e.name === "atlas.counsel.pack_ready"),
        "Broker did not author counsel pack on deadlock"
      )
    );
    checks.push(
      check(
        "no_assume_guard",
        !hasEvent("atlas.guard.validation", "iso-broker"),
        "Broker did not validate"
      )
    );
  }

  if (id === "AIO-GUARD") {
    runSentinelWallConformance();
    checks.push(check("success_sentinel_wall", true, "GUARD≠Sentinel conformance"));
    const ingress = runIngress({
      message: "Recommend how to protect mission under growth pressure",
    });
    let state = runAuthority(ingress.state);
    state = await intelBuildAndLockContext(state);
    state = counselDraftPack(state);
    // Isolation focus: Guard validate + audit; Guard must not assign tasks as Core
    const beforeAssign = getEventLog().filter(
      (e) => e.name === "atlas.core.task_assigned" && e.publisher === "AIO-GUARD"
    ).length;
    state = guardValidate(state);
    checks.push(
      check(
        "output_validation",
        hasEvent("atlas.guard.validation", state.request_id),
        `result=${state.validation?.result}`
      )
    );
    checks.push(
      check(
        "output_audit",
        hasEvent("atlas.guard.audit", state.request_id),
        "audit event"
      )
    );
    const audit = getEventLog().find(
      (e) => e.name === "atlas.guard.audit" && e.request_id === state.request_id
    );
    checks.push(
      check(
        "success_audit_not_canonical",
        audit?.payload?.canonical === false,
        "canonical=false"
      )
    );
    checks.push(
      check(
        "no_assume_core_assign",
        beforeAssign === 0 &&
          !getEventLog().some(
            (e) => e.name === "atlas.core.task_assigned" && e.publisher === "AIO-GUARD"
          ),
        "Guard did not publish task_assigned"
      )
    );
    // Escalation packaging path
    resetStaffBus();
    const escIngress = runIngress({
      message: "Please publish canonical knowledge without review",
    });
    let escState = runAuthority(escIngress.state);
    escState = guardPackageEscalation(escState);
    checks.push(
      check(
        "escalation_package",
        hasEvent("atlas.guard.escalation_ready", escState.request_id),
        "escalation_ready"
      )
    );
  }

  // Shared: every responsibility claimed is exclusively owned by this office
  for (const resp of capability.responsibilities) {
    const owner = RESPONSIBILITY_OWNER[resp];
    checks.push(
      check(
        `owns_${resp}`,
        owner === id,
        owner === id ? "exclusive owner" : `owned by ${owner}`
      )
    );
  }

  const ok = checks.every((c) => c.pass);
  return { id, ok, checks, capability };
}

export async function validateAllOfficesIndependent(): Promise<
  OfficeValidationResult[]
> {
  const ids: AioId[] = [
    "AIO-CORE",
    "AIO-INTEL",
    "AIO-COUNSEL",
    "AIO-BROKER",
    "AIO-GUARD",
  ];
  const results: OfficeValidationResult[] = [];
  for (const id of ids) {
    results.push(await validateOfficeIndependent(id));
  }
  return results;
}
