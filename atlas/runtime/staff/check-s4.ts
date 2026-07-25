/**
 * P6-EXEC WP-S4 — Failure Injection.
 * Run: npm run atlas:staff:check:s4
 * Do NOT advance to WP-S5 without Founder approval.
 */

import { writeFileSync, mkdirSync } from "fs";
import path from "path";
import { resetFaults } from "./fault";
import { runFailureSuite } from "./validate-failure";

async function main(): Promise<void> {
  resetFaults();
  const scenarios = await runFailureSuite();
  resetFaults();
  const allOk = scenarios.every((s) => s.ok);
  const verdict = allOk ? "PASS" : "FAIL";
  const at = new Date().toISOString();
  const evidenceDir = path.join(process.cwd(), "atlas/runtime/evidence");
  mkdirSync(evidenceDir, { recursive: true });

  const json = {
    work_package: "WP-S4",
    program: "ATLAS-P6-EXEC",
    title: "Failure Injection",
    result: verdict,
    at,
    founder_wp_s3_approval: "2026-07-19",
    scenarios: scenarios.map((s) => ({
      id: s.id,
      title: s.title,
      ok: s.ok,
      checks_passed: s.checks.filter((c) => c.pass).length,
      checks_total: s.checks.length,
      failed: s.checks.filter((c) => !c.pass).map((c) => c.name),
    })),
    next_work_package: "WP-S5 Operational Stress Testing",
    advance: "BLOCKED — await Founder approval",
  };

  writeFileSync(
    path.join(evidenceDir, "WP-S4-FAILURE.json"),
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

  const md = `# WP-S4 — Failure Injection

| Field | Value |
|---|---|
| **Work package** | WP-S4 (ATLAS-P6-EXEC) |
| **Title** | Failure Injection |
| **Result** | **${verdict}** |
| **At** | ${at} |
| **Prior gate** | WP-S3 Founder-approved |
| **Command** | \`npm run atlas:staff:check:s4\` |
| **Advance** | **BLOCKED** — Founder approval required before WP-S5 |

---

## 1. Purpose

Validate organizational resilience under controlled failures across offices, communication paths, validation gates, and dependencies — ensuring failures are contained, detected, escalate/fail closed through governance, and do not corrupt institutional authority or knowledge.

## 2. Scope

| In | Out |
|---|---|
| Disable offices; corrupt/drop messages; delay; restart | Constitutional architecture edits |
| Malformed evidence; broken dependencies | Office responsibility redesign |
| Containment, detection, audit, recovery | Stress load (WP-S5) / ORR certification |

## 3. Implementation

- \`atlas/runtime/staff/fault.ts\` — ephemeral fault injector  
- \`atlas/runtime/staff/validate-failure.ts\` — failure scenarios  
- \`atlas/runtime/staff/check-s4.ts\` — harness + evidence  
- Minimal fail-closed hooks in bus/facades/coordinator (no responsibility changes)  

## 4. Evidence

- This document · \`WP-S4-FAILURE.json\` · \`WP-S4-PACKAGE.md\`

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

- Delays are injected at Intel boundary (representative), not every facade.  
- Corruption is bus-level payload tampering, not network partitions.  
- Designed EXEC-* still stubbed.  

## 7. Risks

| Risk | Mitigation |
|---|---|
| Unseen race under heavy parallel load | WP-S5 (Founder-gated) |
| Fault injector left enabled in production | \`resetFaults()\` in suite finally + check entrypoints |

## 8. Rollback

Call \`resetFaults()\`; revert \`fault.ts\` / \`validate-failure.ts\` / check-s4. Do not weaken Guard/Core fail-closed behavior.

## 9. Acceptance criteria

| Criterion | Result |
|---|---|
| Office disable contained & detected | ${["DISABLE-GUARD", "DISABLE-INTEL"].every((id) => scenarios.find((s) => s.id === id)?.ok) ? "PASS" : "FAIL"} |
| Corrupt/drop paths fail closed; no governance bypass | ${["CORRUPT-MESSAGES", "DROP-VALIDATION"].every((id) => scenarios.find((s) => s.id === id)?.ok) ? "PASS" : "FAIL"} |
| Delay / restart / malformed / broken dependency | ${["DELAY-RESPONSES", "RESTART-OFFICES", "MALFORMED-EVIDENCE", "BROKEN-DEPENDENCY", "SINGLE-RESTART"].every((id) => scenarios.find((s) => s.id === id)?.ok) ? "PASS" : "FAIL"} |
| No authority/knowledge corruption | ${verdict} |
| Overall WP-S4 | **${verdict}** |

---

## Executive summary

WP-S4 ${verdict === "PASS" ? "passed" : "failed"}: injected failures remain contained, are detected, fail closed through Guard/Core, recover after restart, and do not corrupt institutional authority or knowledge.

## Engineering changes

Fault injector + failure scenario suite + fail-closed hooks. No constitutional or office-responsibility changes.

## Remaining risks

Operational stress under parallel realistic load unproven (WP-S5).

## Recommended next work package

**WP-S5 — Operational Stress Testing** — only after Founder approval.

**Atlas does not self-advance.**
`;

  writeFileSync(path.join(evidenceDir, "WP-S4-FAILURE.md"), md);
  writeFileSync(
    path.join(evidenceDir, "WP-S4-PACKAGE.md"),
    `# WP-S4 Deliverable Package

1. **Executive summary** — WP-S4-FAILURE.md  
2. **Engineering changes** — fault.ts, validate-failure.ts, check-s4.ts, fail-closed hooks  
3. **Validation evidence** — WP-S4-FAILURE.md / .json  
4. **Remaining risks** — stress deferred to WP-S5  
5. **Recommended next** — WP-S5 (await Founder approval)  

**Result: ${verdict}**  
**Do not start WP-S5 without Founder approval.**
`
  );

  if (verdict !== "PASS") {
    console.error("FAIL: WP-S4 Failure Injection");
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

  console.log("PASS: WP-S4 Failure Injection");
  console.log(
    JSON.stringify(
      {
        result: verdict,
        scenarios: scenarios.map((s) => s.id),
        next: "WP-S5",
        advance: "BLOCKED — await Founder approval",
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error("FAIL: WP-S4");
  console.error(err);
  resetFaults();
  process.exit(1);
});
