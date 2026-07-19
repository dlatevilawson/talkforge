/**
 * P6-EXEC WP-S2 — Cross-Office Coordination.
 * Run: npm run atlas:staff:check:s2
 * Do NOT advance to WP-S3 without Founder approval.
 */

import { writeFileSync, mkdirSync } from "fs";
import path from "path";
import { runCoordinationSuite } from "./validate-coordination";

async function main(): Promise<void> {
  const scenarios = await runCoordinationSuite();
  const allOk = scenarios.every((s) => s.ok);
  const verdict = allOk ? "PASS" : "FAIL";
  const at = new Date().toISOString();
  const evidenceDir = path.join(process.cwd(), "atlas/runtime/evidence");
  mkdirSync(evidenceDir, { recursive: true });
  mkdirSync(path.join(evidenceDir, "org-val"), { recursive: true });

  const json = {
    work_package: "WP-S2",
    program: "ATLAS-P6-EXEC",
    title: "Cross-Office Coordination",
    result: verdict,
    at,
    founder_wp_s1_approval: "2026-07-19",
    scenarios: scenarios.map((s) => ({
      id: s.id,
      title: s.title,
      ok: s.ok,
      checks_passed: s.checks.filter((c) => c.pass).length,
      checks_total: s.checks.length,
      failed: s.checks.filter((c) => !c.pass).map((c) => c.name),
    })),
    next_work_package: "WP-S3 Authority & Conflict Resolution",
    advance: "BLOCKED — await Founder approval",
  };

  writeFileSync(
    path.join(evidenceDir, "WP-S2-COORDINATION.json"),
    JSON.stringify(json, null, 2)
  );

  const scenarioMd = scenarios
    .map((s) => {
      const rows = s.checks
        .map((c) => `| ${c.name} | ${c.pass ? "PASS" : "FAIL"} | ${c.detail} |`)
        .join("\n");
      return `### ${s.title} (\`${s.id}\`) — ${s.ok ? "PASS" : "FAIL"}

| Check | Result | Detail |
|---|---|---|
${rows}
`;
    })
    .join("\n");

  const md = `# WP-S2 — Cross-Office Coordination

| Field | Value |
|---|---|
| **Work package** | WP-S2 (ATLAS-P6-EXEC) |
| **Title** | Cross-Office Coordination |
| **Result** | **${verdict}** |
| **At** | ${at} |
| **Prior gate** | WP-S1 Founder-approved |
| **Command** | \`npm run atlas:staff:check:s2\` |
| **Advance** | **BLOCKED** — Founder approval required before WP-S3 |

---

## 1. Purpose

Validate that AIO offices **collaborate** through Atlas coordination: delegation chains, pair interfaces, Founder/Engineering/Knowledge request paths — without bypassing Core/Guard gates.

## 2. Scope

| In | Out |
|---|---|
| CORE↔INTEL, CORE↔COUNSEL, BROKER↔GUARD, INTEL↔COUNSEL | Constitutional / charter edits |
| Multi-office pipeline | Conflict resolution (WP-S3) |
| Founder / Engineering / Knowledge request paths | Failure injection (WP-S4) |
| No-bypass probes | Stress / ORR certification |

## 3. Implementation

- \`atlas/runtime/staff/validate-coordination.ts\` — scenario suite  
- \`atlas/runtime/staff/check-s2.ts\` — harness + evidence  
- Reuses staff coordinator (\`coordinate.ts\`) — no constitutional changes  

## 4. Evidence

- This document  
- \`WP-S2-COORDINATION.json\`  
- \`WP-S2-PACKAGE.md\`  

## 5. Validation

${scenarioMd}

**Scenarios failed:** ${
    scenarios.filter((s) => !s.ok).length === 0
      ? "none"
      : scenarios
          .filter((s) => !s.ok)
          .map((s) => s.id)
          .join(", ")
  }

## 6. Known limitations

- Designed EXEC-* offices remain simulated via Broker status stubs.  
- Pair tests use governed stage modules; they do not open FOUNDER_VISIBLE.  
- Disagreement / conflict handling is deferred to WP-S3.  

## 7. Risks

| Risk | Mitigation |
|---|---|
| Happy-path coordination masks conflict bugs | WP-S3 (Founder-gated) |
| Live EXEC traffic differs from stubs | Note in ORR; appointments still Founder-exclusive |

## 8. Rollback

Revert \`validate-coordination.ts\` / \`check-s2.ts\` if defective. Do not weaken Guard/Core gates. WP-S1 evidence remains authoritative for isolation.

## 9. Acceptance criteria

| Criterion | Result |
|---|---|
| CORE↔INTEL / CORE↔COUNSEL / BROKER↔GUARD / INTEL↔COUNSEL | ${["CORE-INTEL", "CORE-COUNSEL", "BROKER-GUARD", "INTEL-COUNSEL"].every((id) => scenarios.find((s) => s.id === id)?.ok) ? "PASS" : "FAIL"} |
| Multi-office + Founder/Engineering/Knowledge requests | ${["MULTI", "FOUNDER-REQ", "ENG-REQ", "KNOWLEDGE-REQ"].every((id) => scenarios.find((s) => s.id === id)?.ok) ? "PASS" : "FAIL"} |
| Delegation chains; no coordination bypass | ${scenarios.find((s) => s.id === "NO-BYPASS")?.ok && scenarios.find((s) => s.id === "MULTI")?.ok ? "PASS" : "FAIL"} |
| Overall WP-S2 | **${verdict}** |

---

## Executive summary

WP-S2 ${verdict === "PASS" ? "passed" : "failed"}: offices coordinate through Core delegation and Guard emission gates across pair, multi-office, and request-class scenarios.

## Engineering changes

Coordination scenario suite + \`atlas:staff:check:s2\` evidence emission. No constitutional architecture changes.

## Remaining risks

Authority conflicts, failure injection, and stress remain unproven (WP-S3–S5).

## Recommended next work package

**WP-S3 — Authority & Conflict Resolution** — only after Founder approval.

**Atlas does not self-advance.**
`;

  writeFileSync(path.join(evidenceDir, "WP-S2-COORDINATION.md"), md);
  writeFileSync(
    path.join(evidenceDir, "WP-S2-PACKAGE.md"),
    `# WP-S2 Deliverable Package

1. **Executive summary** — WP-S2-COORDINATION.md  
2. **Engineering changes** — validate-coordination.ts, check-s2.ts  
3. **Validation evidence** — WP-S2-COORDINATION.md / .json  
4. **Remaining risks** — conflict/failure/stress deferred  
5. **Recommended next** — WP-S3 (await Founder approval)  

**Result: ${verdict}**  
**Do not start WP-S3 without Founder approval.**
`
  );

  // Refresh ORG-VAL Stage 2 rollup pointer
  writeFileSync(
    path.join(evidenceDir, "org-val", "ORG-VAL-S2-INTEGRATION.md"),
    `# ORG-VAL Stage 2 — Integration

| Field | Value |
|---|---|
| **Result** | **${verdict === "PASS" ? "PASS" : "FAIL"}** (via ATLAS-P6-EXEC WP-S2) |
| **Evidence** | ../WP-S2-COORDINATION.md |
| **At** | ${at} |

WP-S2 coordination suite is the instrumented Stage 2 integration proof.
`
  );

  if (verdict !== "PASS") {
    console.error("FAIL: WP-S2 Cross-Office Coordination");
    console.error(JSON.stringify(scenarios.filter((s) => !s.ok), null, 2));
    process.exit(1);
  }

  console.log("PASS: WP-S2 Cross-Office Coordination");
  console.log(
    JSON.stringify(
      {
        result: verdict,
        scenarios: scenarios.map((s) => s.id),
        next: "WP-S3",
        advance: "BLOCKED — await Founder approval",
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error("FAIL: WP-S2");
  console.error(err);
  process.exit(1);
});
