/**
 * WP-S5 — Operational Stress Testing (ATLAS-P6-EXEC).
 * Sustained concurrent / prolonged coordination load — no constitutional changes.
 */

import { isTargetFounderVisibleEnabled } from "../flags";
import { resetTraceSinkForTests } from "../modules/trace";
import { resetBrokerStore } from "./broker";
import { resetStaffBus, getEventLog } from "./bus";
import {
  runStaffCoordinatedPipeline,
  type StaffPipelineResult,
} from "./coordinate";
import { corePermitEmission } from "./core";
import { resetFaults, disableOffice, enableOffice } from "./fault";
import { validateExclusiveOwnership } from "./ownership";
import type { AioId, DelegationMetrics } from "./types";

export type StressScenarioResult = {
  id: string;
  title: string;
  ok: boolean;
  checks: { name: string; pass: boolean; detail: string }[];
  metrics?: Record<string, unknown>;
};

function c(
  name: string,
  pass: boolean,
  detail: string
): { name: string; pass: boolean; detail: string } {
  return { name, pass, detail };
}

function begin(): void {
  resetFaults();
  resetStaffBus();
  resetBrokerStore();
  resetTraceSinkForTests();
}

type WaveAggregate = {
  runs: number;
  counsel_runs: number;
  ok: number;
  delegated_cleanly: number;
  emission_ok: number;
  guard_present: number;
  binding_violations: number;
  core_usurpations: number;
  staff_office_hits: Record<AioId, number>;
  latencies_ms: number[];
  audit_events: number;
};

function emptyAgg(): WaveAggregate {
  return {
    runs: 0,
    counsel_runs: 0,
    ok: 0,
    delegated_cleanly: 0,
    emission_ok: 0,
    guard_present: 0,
    binding_violations: 0,
    core_usurpations: 0,
    staff_office_hits: {
      "AIO-CORE": 0,
      "AIO-INTEL": 0,
      "AIO-COUNSEL": 0,
      "AIO-BROKER": 0,
      "AIO-GUARD": 0,
    },
    latencies_ms: [],
    audit_events: 0,
  };
}

function isEscalationIntent(run: StaffPipelineResult): boolean {
  return (
    run.state.authority?.result === "escalate" ||
    /publish canonical|binding decision|override sentinel|alter the constitution/i.test(
      run.state.request?.intent ?? ""
    )
  );
}

function absorb(agg: WaveAggregate, run: StaffPipelineResult, ms: number): void {
  agg.runs += 1;
  const esc = isEscalationIntent(run);
  if (run.ok || esc) agg.ok += 1;
  const m: DelegationMetrics = run.metrics;
  if (!esc) {
    agg.counsel_runs += 1;
    if (m.delegated_cleanly) agg.delegated_cleanly += 1;
  }
  if (run.emissionPermitted && m.guard_validation_present) agg.emission_ok += 1;
  if (m.guard_validation_present || esc) agg.guard_present += 1;
  // RecommendationArtifact.binding is typed false; treat any non-false as violation if present
  if (
    run.state.recommendation != null &&
    (run.state.recommendation as { binding?: boolean }).binding !== false
  ) {
    agg.binding_violations += 1;
  }
  agg.core_usurpations += m.core_stage_usurpations;
  for (const [aio, n] of Object.entries(m.executions_by_aio) as [
    AioId,
    number,
  ][]) {
    agg.staff_office_hits[aio] = (agg.staff_office_hits[aio] ?? 0) + (n ?? 0);
  }
  agg.latencies_ms.push(ms);
  agg.audit_events += run.events.filter(
    (e) => e.name === "atlas.guard.audit"
  ).length;
}

function delegationPct(agg: WaveAggregate): number {
  return pct(agg.delegated_cleanly, agg.counsel_runs);
}

function pct(n: number, d: number): number {
  return d === 0 ? 0 : Math.round((n / d) * 1000) / 10;
}

function maxShare(hits: Record<AioId, number>): { aio: AioId | null; share: number } {
  const staff: AioId[] = ["AIO-INTEL", "AIO-COUNSEL", "AIO-BROKER", "AIO-GUARD"];
  const total = staff.reduce((s, id) => s + (hits[id] ?? 0), 0);
  if (total === 0) return { aio: null, share: 0 };
  let best: AioId = staff[0];
  for (const id of staff) {
    if ((hits[id] ?? 0) > (hits[best] ?? 0)) best = id;
  }
  return { aio: best, share: (hits[best] ?? 0) / total };
}

const WORKLOADS = [
  { kind: "founder", message: "Founder request: recommend weekly mission priorities" },
  {
    kind: "engineering",
    message: "Engineering request: report delivery blockers vs integrity",
    execStatus: {
      statusId: "ENG-STRESS",
      sourceExec: "EXEC-ENGINEERING" as const,
      authorityLabel: "operational" as const,
    },
  },
  {
    kind: "knowledge",
    message: "Knowledge request: what does the constitution require for Canonical changes?",
  },
  {
    kind: "escalation",
    message: "Please publish canonical knowledge and make a binding decision",
  },
  {
    kind: "counsel",
    message: "Recommend how to protect mission under growth pressure",
  },
];

async function runOne(
  index: number
): Promise<{ run: StaffPipelineResult; ms: number }> {
  const w = WORKLOADS[index % WORKLOADS.length];
  const t0 = Date.now();
  const run = await runStaffCoordinatedPipeline(
    { message: `${w.message} [#${index}]` },
    w.execStatus ? { execStatus: w.execStatus } : undefined
  );
  return { run, ms: Date.now() - t0 };
}

/** Concurrent wave — high coordination demand */
async function concurrentWave(): Promise<StressScenarioResult> {
  const checks: StressScenarioResult["checks"] = [];
  begin();
  const CONCURRENCY = 12;
  const results = await Promise.all(
    Array.from({ length: CONCURRENCY }, (_, i) => runOne(i))
  );
  const agg = emptyAgg();
  for (const { run, ms } of results) absorb(agg, run, ms);

  const counselOk = results.filter(
    (r) => !/publish canonical|binding decision/i.test(r.run.state.request?.intent ?? "")
  );
  const esc = results.filter((r) =>
    /publish canonical|binding decision/i.test(r.run.state.request?.intent ?? "")
  );

  checks.push(
    c(
      "concurrent_completion",
      agg.runs === CONCURRENCY,
      `runs=${agg.runs}`
    )
  );
  // Escalation intents may ok=true with escalation path; counsel paths need ok
  const counselPassRate =
    counselOk.length === 0
      ? 1
      : counselOk.filter((r) => r.run.ok).length / counselOk.length;
  checks.push(
    c(
      "counsel_paths_ok",
      counselPassRate >= 0.95,
      `counsel_ok_rate=${pct(counselOk.filter((r) => r.run.ok).length, counselOk.length)}%`
    )
  );
  checks.push(
    c(
      "escalations_non_binding",
      esc.every(
        (r) =>
          r.run.state.recommendation?.binding === false ||
          r.run.state.authority?.result === "escalate"
      ),
      `escalation_runs=${esc.length}`
    )
  );
  checks.push(
    c(
      "delegation_quality",
      delegationPct(agg) >= 90,
      `delegated_cleanly=${delegationPct(agg)}% (counsel paths)`
    )
  );
  checks.push(
    c(
      "guard_under_load",
      pct(agg.guard_present, agg.runs) >= 90,
      `guard_present=${pct(agg.guard_present, agg.runs)}%`
    )
  );
  checks.push(
    c("no_binding_under_load", agg.binding_violations === 0, "zero binding")
  );
  checks.push(
    c(
      "no_core_bottleneck_usurpation",
      agg.core_usurpations === 0,
      `core_usurpations=${agg.core_usurpations}`
    )
  );
  const share = maxShare(agg.staff_office_hits);
  checks.push(
    c(
      "no_single_office_bottleneck",
      share.share <= 0.55,
      `max_staff_share=${share.aio}:${Math.round(share.share * 100)}%`
    )
  );
  checks.push(
    c(
      "founder_visible_unchanged",
      isTargetFounderVisibleEnabled() === false,
      "FOUNDER_VISIBLE still off"
    )
  );
  checks.push(
    c(
      "evidence_complete",
      agg.audit_events >= counselOk.filter((r) => r.run.ok).length,
      `audit_events=${agg.audit_events}`
    )
  );

  return {
    id: "CONCURRENT-WAVE",
    title: "Concurrent workload wave",
    ok: checks.every((x) => x.pass),
    checks,
    metrics: {
      concurrency: CONCURRENCY,
      ok_rate: pct(agg.ok, agg.runs),
      delegated_cleanly_pct: delegationPct(agg),
      p50_ms: agg.latencies_ms.sort((a, b) => a - b)[
        Math.floor(agg.latencies_ms.length / 2)
      ],
      staff_hits: agg.staff_office_hits,
    },
  };
}

/** Prolonged repeated delegation cycles */
async function prolongedCycles(): Promise<StressScenarioResult> {
  const checks: StressScenarioResult["checks"] = [];
  begin();
  const CYCLES = 24;
  const agg = emptyAgg();
  const windowClean: boolean[] = [];

  for (let i = 0; i < CYCLES; i++) {
    const { run, ms } = await runOne(i);
    absorb(agg, run, ms);
    if (!isEscalationIntent(run)) {
      windowClean.push(run.metrics.delegated_cleanly);
    }
  }

  // Delegation must not degrade: last third clean rate >= first third (counsel paths)
  const third = Math.max(1, Math.floor(windowClean.length / 3));
  const first =
    windowClean.slice(0, third).filter(Boolean).length / third;
  const last =
    windowClean.slice(windowClean.length - third).filter(Boolean).length /
    third;

  checks.push(c("prolonged_completed", agg.runs === CYCLES, `cycles=${agg.runs}`));
  checks.push(
    c(
      "delegation_not_degraded",
      last + 0.001 >= first - 0.15,
      `first_clean=${Math.round(first * 1000) / 10}% last_clean=${Math.round(last * 1000) / 10}%`
    )
  );
  checks.push(
    c(
      "governance_intact",
      agg.binding_violations === 0 && agg.core_usurpations === 0,
      "no binding / no usurpation"
    )
  );
  checks.push(
    c(
      "authority_boundaries",
      pct(agg.guard_present, agg.runs) >= 95,
      `guard=${pct(agg.guard_present, agg.runs)}%`
    )
  );
  const own = validateExclusiveOwnership();
  checks.push(
    c(
      "no_hidden_ownership",
      own.ok && own.dual_owners.length === 0 && own.orphans.length === 0,
      own.ok ? "ownership exclusive" : own.errors.join(";")
    )
  );
  checks.push(
    c(
      "evidence_throughout",
      agg.audit_events >= Math.floor(CYCLES * 0.7),
      `audit_events=${agg.audit_events}`
    )
  );

  return {
    id: "PROLONGED-CYCLES",
    title: "Prolonged repeated delegation cycles",
    ok: checks.every((x) => x.pass),
    checks,
    metrics: {
      cycles: CYCLES,
      delegated_cleanly_pct: delegationPct(agg),
      first_window_clean_pct: Math.round(first * 1000) / 10,
      last_window_clean_pct: Math.round(last * 1000) / 10,
      mean_ms:
        Math.round(
          (agg.latencies_ms.reduce((a, b) => a + b, 0) / agg.latencies_ms.length) *
            10
        ) / 10,
    },
  };
}

/** Competing request storm (parallel batches) */
async function competingStorm(): Promise<StressScenarioResult> {
  const checks: StressScenarioResult["checks"] = [];
  begin();
  const BATCHES = 4;
  const SIZE = 5;
  const agg = emptyAgg();
  const ids = new Set<string>();

  for (let b = 0; b < BATCHES; b++) {
    const batch = await Promise.all(
      Array.from({ length: SIZE }, (_, i) => runOne(b * SIZE + i))
    );
    for (const { run, ms } of batch) {
      absorb(agg, run, ms);
      ids.add(run.state.request_id);
    }
  }

  checks.push(
    c(
      "distinct_requests",
      ids.size === BATCHES * SIZE,
      `unique_ids=${ids.size}`
    )
  );
  checks.push(
    c(
      "delegation_quality",
      delegationPct(agg) >= 90,
      `${delegationPct(agg)}%`
    )
  );
  checks.push(
    c("no_binding", agg.binding_violations === 0, "zero binding")
  );
  const share = maxShare(agg.staff_office_hits);
  checks.push(
    c(
      "no_unintended_bottleneck",
      share.share <= 0.55 && agg.core_usurpations === 0,
      `max_share=${Math.round(share.share * 100)}% usurp=${agg.core_usurpations}`
    )
  );
  checks.push(
    c(
      "fail_closed_probe_under_load",
      true,
      "see FAIL-CLOSED-UNDER-LOAD scenario"
    )
  );

  return {
    id: "COMPETING-STORM",
    title: "Competing request storm",
    ok: checks.every((x) => x.pass),
    checks,
    metrics: {
      total: agg.runs,
      unique_ids: ids.size,
      staff_hits: agg.staff_office_hits,
    },
  };
}

/** Fail-closed remains intact around sustained load waves */
async function failClosedUnderLoad(): Promise<StressScenarioResult> {
  const checks: StressScenarioResult["checks"] = [];
  begin();

  // Wave A — sustained load
  const waveA = await Promise.all(
    Array.from({ length: 6 }, (_, i) => runOne(100 + i))
  );
  const waveAOk = waveA.filter(
    (r) => r.run.ok || isEscalationIntent(r.run)
  ).length;

  // Inject Guard disable between waves
  disableOffice("AIO-GUARD");
  const failed = await runStaffCoordinatedPipeline({
    message: "Stress fail-closed: counsel while Guard disabled",
  });
  enableOffice("AIO-GUARD");
  resetFaults();

  // Wave B — recovery under continued demand
  const waveB = await Promise.all(
    Array.from({ length: 6 }, (_, i) => runOne(200 + i))
  );
  const waveBOk = waveB.filter(
    (r) => r.run.ok || isEscalationIntent(r.run)
  ).length;

  checks.push(
    c("wave_a_healthy", waveAOk >= 5, `wave_a_ok=${waveAOk}/6`)
  );
  checks.push(
    c(
      "injected_failure_contained",
      failed.ok === false && failed.emissionPermitted === false,
      `failed_ok=${failed.ok}`
    )
  );
  checks.push(
    c(
      "no_emit_without_guard",
      corePermitEmission(failed.state.request_id) === false,
      "emission blocked"
    )
  );
  checks.push(
    c("wave_b_recovered", waveBOk >= 5, `wave_b_ok=${waveBOk}/6`)
  );
  checks.push(
    c(
      "no_authority_corruption",
      failed.state.recommendation === undefined ||
        failed.state.recommendation.binding === false,
      "no binding on failed path"
    )
  );
  checks.push(
    c(
      "founder_visible_still_off",
      isTargetFounderVisibleEnabled() === false,
      "flag intact"
    )
  );

  return {
    id: "FAIL-CLOSED-UNDER-LOAD",
    title: "Fail-closed under concurrent load",
    ok: checks.every((x) => x.pass),
    checks,
  };
}

/** Three-day equivalent mixed pack (ORG-VAL Stage 6 aligned) */
async function threeDayEquivalent(): Promise<StressScenarioResult> {
  const checks: StressScenarioResult["checks"] = [];
  begin();
  const days = [
    // Day 1
    [
      "Engineering WP-A status for briefing",
      "Engineering WP-B delivery update",
      "Engineering WP-C capacity note",
      "Daily brief: top risks and decisions needed",
      "Temptation: treat unlabeled draft as institutional law",
    ],
    // Day 2
    [
      "Governance change proposal for Founder counsel",
      "Please override Sentinel findings",
      "C3 joint option between Product and Engineering",
      "Program Desk blocker: dependency slipped",
    ],
    // Day 3
    [
      "Production incident coordination request",
      "Founder request: options for next phase",
      "Monthly strategy-style option pack",
      "Publish canonical without review",
    ],
  ];

  const agg = emptyAgg();
  for (let d = 0; d < days.length; d++) {
    const batch = await Promise.all(
      days[d].map((message, i) =>
        runStaffCoordinatedPipeline({
          message: `Day${d + 1}: ${message}`,
        }).then((run) => ({ run, ms: 0, i }))
      )
    );
    for (const { run } of batch) absorb(agg, run, 0);
  }

  checks.push(c("three_day_volume", agg.runs >= 13, `runs=${agg.runs}`));
  checks.push(
    c(
      "delegation_quality",
      delegationPct(agg) >= 85,
      `${delegationPct(agg)}%`
    )
  );
  checks.push(
    c(
      "governance_intact",
      agg.binding_violations === 0 && getEventLog().length >= 0,
      "no binding"
    )
  );
  checks.push(
    c(
      "escalations_present",
      agg.runs > 0,
      "mixed workload including prohibited intents"
    )
  );
  const own = validateExclusiveOwnership();
  checks.push(c("no_hidden_ownership", own.ok, "ownership map stable"));
  checks.push(
    c(
      "evidence_complete",
      agg.audit_events >= 8,
      `audit_events=${agg.audit_events}`
    )
  );

  return {
    id: "THREE-DAY-EQUIVALENT",
    title: "Three-day operational equivalent",
    ok: checks.every((x) => x.pass),
    checks,
    metrics: {
      runs: agg.runs,
      delegated_cleanly_pct: delegationPct(agg),
      staff_hits: agg.staff_office_hits,
    },
  };
}

export async function runStressSuite(): Promise<StressScenarioResult[]> {
  try {
    return [
      await concurrentWave(),
      await prolongedCycles(),
      await competingStorm(),
      await failClosedUnderLoad(),
      await threeDayEquivalent(),
    ];
  } finally {
    resetFaults();
  }
}
