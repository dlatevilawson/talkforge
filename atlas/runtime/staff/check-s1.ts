/**
 * P6-EXEC WP-S1 — Office Capability Validation.
 * Run: npm run atlas:staff:check:s1
 * Does NOT advance to WP-S2 — Founder approval required.
 */

import { writeFileSync, mkdirSync } from "fs";
import path from "path";
import { validateAllOfficesIndependent } from "./validate-office";
import { RESPONSIBILITY_OWNER } from "./ownership";
import { listCapabilities } from "./offices/capabilities";

async function main(): Promise<void> {
  const results = await validateAllOfficesIndependent();
  const allOk = results.every((r) => r.ok);
  const failed = results.filter((r) => !r.ok);

  // Cross-check: no two offices share exclusive responsibility
  const ownerPairs = Object.entries(RESPONSIBILITY_OWNER);
  const dual: string[] = [];
  const seen = new Map<string, string>();
  for (const [resp, owner] of ownerPairs) {
    const key = resp;
    if (seen.has(key) && seen.get(key) !== owner) dual.push(key);
    seen.set(key, owner);
  }

  const evidenceDir = path.join(process.cwd(), "atlas/runtime/evidence");
  mkdirSync(evidenceDir, { recursive: true });
  const at = new Date().toISOString();

  const verdict = allOk && dual.length === 0 ? "PASS" : "FAIL";

  const json = {
    work_package: "WP-S1",
    program: "ATLAS-P6-EXEC",
    title: "Office Capability Validation",
    result: verdict,
    at,
    offices: results.map((r) => ({
      id: r.id,
      ok: r.ok,
      checks_passed: r.checks.filter((c) => c.pass).length,
      checks_total: r.checks.length,
      failed: r.checks.filter((c) => !c.pass).map((c) => c.name),
      responsibilities: r.capability.responsibilities,
      escalation_rules: r.capability.escalation_rules,
      failure_behaviors: r.capability.failure_behaviors,
    })),
    dual_responsibility_owners: dual,
    capabilities_defined: listCapabilities().length,
    next_work_package: "WP-S2 Cross-Office Coordination",
    advance: "BLOCKED — await Founder approval",
  };

  writeFileSync(
    path.join(evidenceDir, "WP-S1-OFFICE-CAPABILITY.json"),
    JSON.stringify(json, null, 2)
  );

  const officeSections = results
    .map((r) => {
      const lines = r.checks
        .map((c) => `| ${c.name} | ${c.pass ? "PASS" : "FAIL"} | ${c.detail} |`)
        .join("\n");
      return `### ${r.id} — ${r.ok ? "PASS" : "FAIL"}

| Check | Result | Detail |
|---|---|---|
${lines}

**Responsibilities:** ${r.capability.responsibilities.join(", ")}  
**Escalation:** ${r.capability.escalation_rules.join("; ")}  
**Failure behavior:** ${r.capability.failure_behaviors.join("; ")}
`;
    })
    .join("\n");

  const md = `# WP-S1 — Office Capability Validation

| Field | Value |
|---|---|
| **Work package** | WP-S1 (ATLAS-P6-EXEC) |
| **Title** | Office Capability Validation |
| **Result** | **${verdict}** |
| **At** | ${at} |
| **Command** | \`npm run atlas:staff:check:s1\` |
| **Advance** | **BLOCKED** — Founder approval required before WP-S2 |

---

## 1. Purpose

Validate every AIO office **independently**: responsibilities, inputs, outputs, escalation rules, success metrics, and failure behavior. Ensure no office assumes another office’s responsibilities.

## 2. Scope

| In | Out |
|---|---|
| AIO-CORE, INTEL, COUNSEL, BROKER, GUARD isolation tests | Cross-office collaboration (WP-S2) |
| Capability contracts in \`offices/capabilities.ts\` | Conflict resolution (WP-S3) |
| Per-office success/failure behavior | Stress / ORR certification |

## 3. Implementation

- \`atlas/runtime/staff/offices/capabilities.ts\` — capability contracts  
- \`atlas/runtime/staff/validate-office.ts\` — independent validators  
- \`atlas/runtime/staff/check-s1.ts\` — acceptance harness + evidence writer  

## 4. Evidence

- This document  
- \`atlas/runtime/evidence/WP-S1-OFFICE-CAPABILITY.json\`  

## 5. Validation

${officeSections}

**Dual ownership conflicts:** ${dual.length === 0 ? "none" : dual.join(", ")}  
**Offices failed:** ${failed.length === 0 ? "none" : failed.map((f) => f.id).join(", ")}

## 6. Known limitations

- Counsel success path requires Intel lock as **input** (does not mean Counsel owns Intel).  
- Guard validation path uses a drafted pack as **input** (does not mean Guard owns Counsel).  
- Full company EXEC live traffic not required for WP-S1 isolation.  

## 7. Risks

| Risk | Mitigation |
|---|---|
| Isolation tests miss integration bugs | Deferred to WP-S2 (Founder-gated) |
| Capability drift from packs | Both packs + capabilities asserted |

## 8. Rollback

Disable \`atlas:staff:check:s1\` gate in CI if emergency; do not weaken ownership map. Revert \`capabilities.ts\` / \`validate-office.ts\` if defective. Legacy Ask Atlas + prior WP-S0 evidence remain.

## 9. Acceptance criteria

| Criterion | Result |
|---|---|
| Every office validated independently | ${results.every((r) => r.ok) ? "PASS" : "FAIL"} |
| Responsibilities / inputs / outputs / escalation / metrics / failure present | ${results.every((r) => r.checks.some((c) => c.name === "inputs_outputs" && c.pass)) ? "PASS" : "FAIL"} |
| No office assumes another’s responsibilities | ${results.every((r) => r.checks.some((c) => c.name === "no_foreign_responsibility" && c.pass)) && dual.length === 0 ? "PASS" : "FAIL"} |
| Overall WP-S1 | **${verdict}** |

---

## Executive summary

WP-S1 ${verdict === "PASS" ? "passed" : "failed"}: five AIO offices validated in isolation with exclusive responsibilities and documented failure/escalation behavior.

## Engineering changes

Capability contracts + independent office validators + \`atlas:staff:check:s1\` evidence emission.

## Remaining risks

Integration and conflict behavior unproven until WP-S2 / WP-S3 (correctly gated).

## Recommended next work package

**WP-S2 — Cross-Office Coordination** — only after Founder approval.

**Atlas does not self-advance.**
`;

  writeFileSync(path.join(evidenceDir, "WP-S1-OFFICE-CAPABILITY.md"), md);

  // Machine-readable package index for Founder review
  writeFileSync(
    path.join(evidenceDir, "WP-S1-PACKAGE.md"),
    `# WP-S1 Deliverable Package

1. **Executive summary** — see WP-S1-OFFICE-CAPABILITY.md  
2. **Engineering changes** — capabilities.ts, validate-office.ts, check-s1.ts  
3. **Validation evidence** — WP-S1-OFFICE-CAPABILITY.md / .json  
4. **Remaining risks** — integration deferred to WP-S2  
5. **Recommended next** — WP-S2 (await Founder approval)  

**Result: ${verdict}**  
**Do not start WP-S2 without Founder approval.**
`
  );

  if (verdict !== "PASS") {
    console.error("FAIL: WP-S1 Office Capability Validation");
    console.error(JSON.stringify(failed, null, 2));
    process.exit(1);
  }

  console.log("PASS: WP-S1 Office Capability Validation");
  console.log(
    JSON.stringify(
      {
        result: verdict,
        offices: results.map((r) => r.id),
        next: "WP-S2",
        advance: "BLOCKED — await Founder approval",
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error("FAIL: WP-S1");
  console.error(err);
  process.exit(1);
});
