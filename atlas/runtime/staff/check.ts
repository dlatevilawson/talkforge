/**
 * Atlas staff operationalization checks (ATLAS-P6 / ENG-PROGRAM WP-S0–S8 slice).
 * Run: npm run atlas:staff:check
 */

import { resetTraceSinkForTests } from "../modules/trace";
import {
  brokerIngestRiskNotice,
  brokerSignalDeadlock,
  brokerTryAlterRiskNotice,
  resetBrokerStore,
} from "./broker";
import { resetStaffBus, getEventLog, hasEvent } from "./bus";
import { runStaffCoordinatedPipeline } from "./coordinate";
import { corePermitEmission } from "./core";
import { EVENT_CATALOG } from "./events";
import { listOfficePacks } from "./offices/packs";
import { resetDelegationMetrics } from "./metrics";
import {
  assertNotSixthAio,
  assertOwnershipInvariants,
} from "./ownership";
import { runSentinelWallConformance } from "./sentinel-wall";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function main(): Promise<void> {
  // --- S0 ownership + office packs ---
  assertOwnershipInvariants();
  try {
    assertNotSixthAio("AIO-PROGRAM");
    throw new Error("expected AIO-PROGRAM rejection");
  } catch (e) {
    assert(
      e instanceof Error && /not a peer office/i.test(e.message),
      "AIO-PROGRAM must be rejected"
    );
  }

  const packs = listOfficePacks();
  assert(packs.length === 5, "five office packs");
  for (const p of packs) {
    assert(p.prompt.length > 40, `${p.id} prompt`);
    assert(p.standards.length >= 1, `${p.id} standards`);
    assert(p.success_metrics.length >= 1, `${p.id} metrics`);
    assert(p.must_not.length >= 1, `${p.id} must_not`);
  }

  // --- Sentinel wall ---
  runSentinelWallConformance();

  // --- Broker immutability + deadlock ---
  resetBrokerStore();
  resetStaffBus();
  const notice = brokerIngestRiskNotice("req-risk", {
    id: "RN-TEST",
    summary: "Do not ship",
    body: "Integrity finding",
    source: "EXEC-SENTINEL",
  });
  let immutabilityHeld = false;
  try {
    brokerTryAlterRiskNotice(notice.id, "softened", notice.body);
  } catch {
    immutabilityHeld = true;
  }
  assert(immutabilityHeld, "Risk Notice immutability");
  brokerSignalDeadlock("req-risk", "t1", ["EXEC-PRODUCT", "EXEC-ENGINEERING"], "scope");
  assert(
    getEventLog().some((e) => e.name === "atlas.broker.deadlock"),
    "deadlock event"
  );
  assert(
    !getEventLog().some(
      (e) =>
        e.name === "atlas.broker.deadlock" &&
        e.payload &&
        Array.isArray(e.payload.parties) &&
        (e.payload.parties as string[]).includes("AIO-COUNSEL")
    ),
    "deadlock must not route Counsel as party resolver"
  );

  // --- Staff-coordinated happy path + delegation ---
  resetTraceSinkForTests();
  const run = await runStaffCoordinatedPipeline({
    message: "Recommend how to protect mission under growth pressure",
  });
  assert(run.ok, "staff pipeline ok");
  assert(run.mode === "staff-coordinated", "staff mode");
  assert(run.state.validation?.result === "PASS", "integrity PASS");
  assert(run.state.recommendation?.binding === false, "non-binding");
  assert(hasEvent("atlas.intel.context_locked", run.state.request_id), "context_locked");
  assert(hasEvent("atlas.counsel.pack_ready", run.state.request_id), "pack_ready");
  assert(hasEvent("atlas.guard.validation", run.state.request_id), "guard validation");
  assert(run.emissionPermitted === true, "emission permitted after Guard");
  assert(hasEvent("atlas.core.emission_permitted", run.state.request_id), "emission event");
  assert(run.metrics.staff_offices_used >= 3, "delegation uses staff offices");
  assert(run.metrics.delegated_cleanly === true, "Core did not usurp staff stages");
  assert(run.metrics.tasks_assigned >= 4, "tasks assigned");
  assert(run.founderVisible === false, "FOUNDER_VISIBLE remains off");
  assert(run.delivery === undefined, "no Founder delivery without flag");

  // --- Emission without Guard must fail ---
  resetStaffBus();
  resetDelegationMetrics("no-guard-request");
  const blocked = corePermitEmission("no-guard-request");
  assert(blocked === false, "emission blocked without Guard");

  // --- Catalog coverage note ---
  assert(EVENT_CATALOG.length >= 11, "event catalog present");

  // --- Org-val Stage 2-A / 5 proxies ---
  resetTraceSinkForTests();
  const s2 = await runStaffCoordinatedPipeline(
    { message: "Engineering WP status for Founder briefing" },
    {
      execStatus: {
        statusId: "WP-S0",
        sourceExec: "EXEC-ENGINEERING",
        authorityLabel: "operational",
      },
    }
  );
  assert(s2.ok, "S2-A staff path ok");
  assert(
    s2.events.some((e) => e.name === "atlas.broker.status_ingested"),
    "S2-A broker intake"
  );
  assert(s2.metrics.distinct_assignees.includes("AIO-INTEL"), "TE: Intel used");
  assert(s2.metrics.distinct_assignees.includes("AIO-COUNSEL"), "TE: Counsel used");
  assert(s2.metrics.distinct_assignees.includes("AIO-GUARD"), "TE: Guard used");
  assert(s2.metrics.distinct_assignees.includes("AIO-BROKER"), "TE: Broker used");

  console.log("PASS: atlas:staff:check — offices operational, delegation measured");
  console.log(
    JSON.stringify(
      {
        staff_offices_used: run.metrics.staff_offices_used,
        delegated_cleanly: run.metrics.delegated_cleanly,
        tasks_assigned: run.metrics.tasks_assigned,
        emission_permitted: run.emissionPermitted,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error("FAIL: atlas:staff:check");
  console.error(err);
  process.exit(1);
});
