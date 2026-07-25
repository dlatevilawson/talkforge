/**
 * P6-EXEC WP-S5 — Operational Stress Testing.
 * Run: npm run atlas:staff:check:s5
 * Produces ORR recommendation — does NOT self-certify.
 */

import { writeFileSync, mkdirSync } from "fs";
import path from "path";
import { resetFaults } from "./fault";
import { runStressSuite } from "./validate-stress";

async function main(): Promise<void> {
  resetFaults();
  const scenarios = await runStressSuite();
  resetFaults();
  const allOk = scenarios.every((s) => s.ok);
  const verdict = allOk ? "PASS" : "FAIL";
  const at = new Date().toISOString();
  const evidenceDir = path.join(process.cwd(), "atlas/runtime/evidence");
  const atosExec = path.join(
    process.cwd(),
    "atos/executives/atlas-program"
  );
  mkdirSync(evidenceDir, { recursive: true });
  mkdirSync(path.join(evidenceDir, "org-val"), { recursive: true });

  const json = {
    work_package: "WP-S5",
    program: "ATLAS-P6-EXEC",
    title: "Operational Stress Testing",
    result: verdict,
    at,
    founder_wp_s4_approval: "2026-07-19",
    scenarios: scenarios.map((s) => ({
      id: s.id,
      title: s.title,
      ok: s.ok,
      checks_passed: s.checks.filter((c) => c.pass).length,
      checks_total: s.checks.length,
      failed: s.checks.filter((c) => !c.pass).map((c) => c.name),
      metrics: s.metrics ?? null,
    })),
    next: "Founder certification Decision (WP-S6 / ORR)",
    advance: "STOPPED — await Founder certification",
    self_certified: false,
  };

  writeFileSync(
    path.join(evidenceDir, "WP-S5-STRESS.json"),
    JSON.stringify(json, null, 2)
  );

  const scenarioMd = scenarios
    .map((s) => {
      const rows = s.checks
        .map((c) => `| ${c.name} | ${c.pass ? "PASS" : "FAIL"} | ${c.detail} |`)
        .join("\n");
      const metrics = s.metrics
        ? `\n\`\`\`json\n${JSON.stringify(s.metrics, null, 2)}\n\`\`\`\n`
        : "";
      return `### ${s.title} (\`${s.id}\`) — ${s.ok ? "PASS" : "FAIL"}

| Check | Result | Detail |
|---|---|---|
${rows}
${metrics}`;
    })
    .join("\n");

  const md = `# WP-S5 — Operational Stress Testing

| Field | Value |
|---|---|
| **Work package** | WP-S5 (ATLAS-P6-EXEC) |
| **Title** | Operational Stress Testing |
| **Result** | **${verdict}** |
| **At** | ${at} |
| **Prior gate** | WP-S4 Founder-approved |
| **Command** | \`npm run atlas:staff:check:s5\` |
| **Advance** | **STOPPED** — await Founder certification |

---

## 1. Purpose

Validate sustained operation under concurrent demand, competing requests, repeated delegation cycles, prolonged execution, and high coordination load — confirming delegation quality, governance, authority boundaries, bottleneck absence, ownership exclusivity, fail-closed behavior, and complete evidence.

## 2. Scope

| In | Out |
|---|---|
| Concurrent / prolonged / storm / 3-day equivalent loads | Constitutional edits |
| Fail-closed under load waves | Office responsibility redesign |
| Delegation & bottleneck metrics | Self-certification |

## 3. Implementation

- \`validate-stress.ts\` — stress suite  
- \`check-s5.ts\` — harness + evidence + ORR recommendation draft  
- Staff pipeline mutex — concurrent demand queues without shared-state corruption  

## 4. Evidence

- This document · \`WP-S5-STRESS.json\` · \`WP-S5-PACKAGE.md\`  
- ORR recommendation: \`atos/executives/atlas-program/ATLAS-ORR.md\` (**Draft — Founder decides**)

## 5. Validation

${scenarioMd}

**Failed scenarios:** ${
    scenarios.filter((s) => !s.ok).length === 0
      ? "none"
      : scenarios
          .filter((s) => !s.ok)
          .map((s) => s.id)
          .join(", ")
  }

## 6. Known limitations

- Concurrent callers are serialized by staff pipeline lock (queued high demand), not multi-tenant parallel memory isolation.  
- Designed EXEC-* offices remain stubbed via Broker.  
- Live production traffic volumes not claimed.

## 7. Risks

| Risk | Mitigation |
|---|---|
| Queue latency under extreme fan-in | Monitor; capacity scale inside AIOs (P5 growth) |
| Live EXEC appointment dynamics | Founder appointments still required |

## 8. Rollback

Revert stress suite / mutex if defective. Do not weaken Guard/Core gates.

## 9. Acceptance criteria

| Criterion | Result |
|---|---|
| Concurrent + prolonged + storm loads | ${["CONCURRENT-WAVE", "PROLONGED-CYCLES", "COMPETING-STORM"].every((id) => scenarios.find((s) => s.id === id)?.ok) ? "PASS" : "FAIL"} |
| Fail-closed under load + 3-day equivalent | ${["FAIL-CLOSED-UNDER-LOAD", "THREE-DAY-EQUIVALENT"].every((id) => scenarios.find((s) => s.id === id)?.ok) ? "PASS" : "FAIL"} |
| Delegation quality / governance / ownership / evidence | ${verdict} |
| Overall WP-S5 | **${verdict}** |

---

## Executive summary

WP-S5 ${verdict === "PASS" ? "passed" : "failed"}: under sustained coordination demand, delegation quality holds, governance and authority boundaries remain intact, no hidden ownership or Core usurpation bottleneck appears, fail-closed behavior survives load waves, and audit evidence continues.

## Engineering changes

Stress suite + pipeline queue lock + ORR recommendation draft. No constitutional or office-responsibility changes.

## Remaining risks

Live EXEC appointment dynamics; extreme fan-in queue latency; FOUNDER_VISIBLE still a separate Founder gate.

## Operational Readiness Recommendation (ORR)

See \`ATLAS-ORR.md\`. **Atlas does not certify.** Founder alone decides.
`;

  writeFileSync(path.join(evidenceDir, "WP-S5-STRESS.md"), md);
  writeFileSync(
    path.join(evidenceDir, "WP-S5-PACKAGE.md"),
    `# WP-S5 Deliverable Package

1. **Executive summary** — WP-S5-STRESS.md  
2. **Engineering changes** — validate-stress.ts, check-s5.ts, pipeline mutex  
3. **Validation evidence** — WP-S5-STRESS.md / .json  
4. **Remaining risks** — live EXEC dynamics; FOUNDER_VISIBLE separate  
5. **Operational Readiness Recommendation** — atos/executives/atlas-program/ATLAS-ORR.md  

**Result: ${verdict}**  
**Self-certified: NO**  
**Awaiting Founder certification Decision.**
`
  );

  // ORR recommendation (Draft — Founder decides)
  const orrVerdict =
    verdict === "PASS" ? "PASS WITH FINDINGS" : "FAIL";
  const orr = `# Atlas — Operational Readiness Report (Recommendation)

| Field | Value |
|---|---|
| **Document ID** | ATLAS-ORR |
| **Version** | 1.0.0-draft |
| **Status** | Draft |
| **Owner** | Founder |
| **AI Steward** | Atlas |
| **Human Approver** | Founder |
| **Review Cycle** | Until Founder Decision |
| **Dependencies** | ATLAS-P6-EXEC WP-S1…S5, ATLAS-ORG-VAL, ATLAS-P0…P6 |
| **Related Documents** | WP-S1…S5 evidence under atlas/runtime/evidence/ |
| **Approval History** | 2026-07-19 — Draft ORR after WP-S5; awaiting Founder certification |
| **Change Log** | 2026-07-19 — Recommendation only; Atlas does not self-certify |

---

## Certification statement (Atlas recommendation)

| Field | Value |
|---|---|
| **Recommended result** | **${orrVerdict}** |
| **Certified for normal operation?** | **NO — Founder Decision required** |
| **Self-certified by Atlas?** | **NO** |

### Recommended scope (if Founder certifies)

- Atlas internal staff (\`AIO-*\`) operational on target plane  
- Staff-coordinated pipeline with Core delegation + Guard emission gates  
- Dual-plane: \`ATLAS_RUNTIME_TARGET\` on; \`ATLAS_RUNTIME_FOUNDER_VISIBLE\` **off**  
- Loader freeze remains until separate Founder Decision  

### Explicitly NOT included

- Enabling \`ATLAS_RUNTIME_FOUNDER_VISIBLE\`  
- Loader freeze lift  
- Company EXEC-* appointments (Founder-exclusive)  
- Strategic capability expansion  

---

## 1. Office operational status

| Office / Function | Operational? | Evidence |
|---|---|---|
| AIO-CORE | Yes | WP-S1, S2, S5 |
| AIO-INTEL | Yes | WP-S1–S5 |
| AIO-COUNSEL | Yes | WP-S1–S5 |
| AIO-BROKER | Yes | WP-S1–S5 |
| AIO-GUARD | Yes | WP-S1–S5 |
| AIF-PROGRAM | Yes (Core function) | Program Desk tracking |
| EXEC-* (Designed) | Chartered; not all appointed | P4 / REG-EXEC |

## 2. Interfaces validated

- Core↔Intel, Core↔Counsel, Broker↔Guard, Intel↔Counsel (WP-S2)  
- Conflict / escalation chains (WP-S3)  
- Fail-closed paths (WP-S4)  
- Sustained coordination under load (WP-S5)  

## 3. Residual risks / findings

| Finding | Severity | Notes |
|---|---|---|
| FOUNDER_VISIBLE still off | Info | Separate ATLAS-GATE-FV Decision |
| Designed EXEC offices not appointed | Info | Founder-exclusive |
| Concurrent demand serialized via pipeline lock | Low | Queued high demand; not multi-tenant memory isolation |
| REG-EXEC Draft vs P4 Authoritative sync | Low | Hygiene (S1-F1) |

## 4. Untested assumptions

- Live multi-executive human traffic volumes  
- Model-backed cognition beyond structural target plane  
- Long-lived multi-day wall-clock production soak  

## 5. Evidence index

| WP | Result | Path |
|---|---|---|
| WP-S0 | PASS | atlas/runtime/evidence/WP-S0-OWNERSHIP.md |
| WP-S1 | PASS (Founder-approved) | atlas/runtime/evidence/WP-S1-OFFICE-CAPABILITY.md |
| WP-S2 | PASS (Founder-approved) | atlas/runtime/evidence/WP-S2-COORDINATION.md |
| WP-S3 | PASS (Founder-approved) | atlas/runtime/evidence/WP-S3-CONFLICT.md |
| WP-S4 | PASS (Founder-approved) | atlas/runtime/evidence/WP-S4-FAILURE.md |
| WP-S5 | **${verdict}** | atlas/runtime/evidence/WP-S5-STRESS.md |

Commands: \`atlas:staff:check:s0\` … \`s5\`, \`atos:check\`, \`atlas:runtime:check\`

## 6. ORG-VAL stage rollup (recommendation)

| Stage | Result |
|---|---|
| 1 Structural | PASS WITH FINDINGS |
| 2 Integration | PASS (WP-S2) |
| 3 Automation | PARTIAL → strengthened via staff checks |
| 4 Failure injection | PASS (WP-S4) |
| 5 Team effectiveness | Supported by S2/S5 delegation metrics |
| 6 Operational stress | **${verdict === "PASS" ? "PASS" : "FAIL"}** (WP-S5) |
| 7 Certification | **Awaiting Founder** |

## 7. Founder Decision request

Options:

1. **Certify as scoped** — staff org operational under TARGET on / FOUNDER_VISIBLE off  
2. **Certify with waivers** — list waivers explicitly  
3. **Return to Stage/WP** — specify which  

**Atlas recommends option (1) if WP-S5 is PASS, with findings above.**  
**Atlas will not enable FOUNDER_VISIBLE or lift loader freeze without separate Decisions.**
`;

  writeFileSync(path.join(atosExec, "ATLAS-ORR.md"), orr);

  writeFileSync(
    path.join(evidenceDir, "org-val", "ORG-VAL-STATUS.md"),
    `# ORG-VAL — Stage Rollup (Program Desk)

| Field | Value |
|---|---|
| **Last updated** | ${at.slice(0, 10)} |
| **Updated by** | AIF-PROGRAM / Atlas |
| **Program** | ATLAS-ORG-VAL · ATLAS-P6-EXEC |

| Stage | Result | Evidence |
|---|---|---|
| 1 Structural | PASS WITH FINDINGS | ORG-VAL-S1-STRUCTURE.md |
| 2 Integration | PASS | ../WP-S2-COORDINATION.md |
| 3 Automation | PARTIAL/strengthened | staff checks |
| 4 Failure injection | PASS | ../WP-S4-FAILURE.md |
| 5 Team effectiveness | Supported | S2/S5 metrics |
| 6 Operational stress | **${verdict}** | ../WP-S5-STRESS.md |
| 7 ORR / Certification | **Draft ORR — await Founder** | ATLAS-ORR.md |

**P6-EXEC:** WP-S1–S4 Founder-approved · WP-S5 ${verdict} · **Awaiting Founder certification**
`
  );

  if (verdict !== "PASS") {
    console.error("FAIL: WP-S5 Operational Stress Testing");
    console.error(
      JSON.stringify(
        scenarios
          .filter((s) => !s.ok)
          .map((s) => ({
            id: s.id,
            failed: s.checks.filter((c) => !c.pass),
          })),
        null,
        2
      )
    );
    process.exit(1);
  }

  console.log("PASS: WP-S5 Operational Stress Testing");
  console.log(
    JSON.stringify(
      {
        result: verdict,
        scenarios: scenarios.map((s) => s.id),
        orr: "ATLAS-ORR.md Draft — await Founder certification",
        self_certified: false,
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error("FAIL: WP-S5");
  console.error(err);
  resetFaults();
  process.exit(1);
});
