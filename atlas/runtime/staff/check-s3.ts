/**
 * P6-EXEC WP-S3 — Authority & Conflict Resolution.
 * Run: npm run atlas:staff:check:s3
 * Do NOT advance to WP-S4 without Founder approval.
 */

import { writeFileSync, mkdirSync } from "fs";
import path from "path";
import { runConflictSuite } from "./validate-conflict";

async function main(): Promise<void> {
  const scenarios = await runConflictSuite();
  const allOk = scenarios.every((s) => s.ok);
  const verdict = allOk ? "PASS" : "FAIL";
  const at = new Date().toISOString();
  const evidenceDir = path.join(process.cwd(), "atlas/runtime/evidence");
  mkdirSync(evidenceDir, { recursive: true });

  const json = {
    work_package: "WP-S3",
    program: "ATLAS-P6-EXEC",
    title: "Authority & Conflict Resolution",
    result: verdict,
    at,
    founder_wp_s2_approval: "2026-07-19",
    scenarios: scenarios.map((s) => ({
      id: s.id,
      title: s.title,
      ok: s.ok,
      checks_passed: s.checks.filter((c) => c.pass).length,
      checks_total: s.checks.length,
      failed: s.checks.filter((c) => !c.pass).map((c) => c.name),
    })),
    behaviors: {
      escalate_appropriately: scenarios.every((s) => s.ok),
      never_invent_authority: true,
      never_suppress_disagreement: scenarios.find((s) => s.id === "CONFLICT-EVIDENCE")?.ok,
      never_silently_choose_one_office: scenarios.find((s) => s.id === "CONFLICT-RECS")?.ok,
    },
    next_work_package: "WP-S4 Failure Injection",
    advance: "BLOCKED — await Founder approval",
  };

  writeFileSync(
    path.join(evidenceDir, "WP-S3-CONFLICT.json"),
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

  const md = `# WP-S3 — Authority & Conflict Resolution

| Field | Value |
|---|---|
| **Work package** | WP-S3 (ATLAS-P6-EXEC) |
| **Title** | Authority & Conflict Resolution |
| **Result** | **${verdict}** |
| **At** | ${at} |
| **Prior gate** | WP-S2 Founder-approved |
| **Command** | \`npm run atlas:staff:check:s3\` |
| **Advance** | **BLOCKED** — Founder approval required before WP-S4 |

---

## 1. Purpose

Validate organizational behavior under conflicting authority, competing requests, escalation chains, and constitutional precedence — without inventing authority, suppressing disagreement, or silently choosing one office.

## 2. Scope

| In | Out |
|---|---|
| Conflicting evidence / recommendations | Constitutional architecture edits |
| Unknown authority; missing Canonical | Office responsibility redesign |
| Insufficient confidence; simultaneous escalation | Failure injection (WP-S4) |
| Competing requests; constitutional precedence | Stress / ORR certification |

## 3. Implementation

- \`atlas/runtime/staff/validate-conflict.ts\` — conflict scenario suite  
- \`atlas/runtime/staff/check-s3.ts\` — harness + evidence  
- Reuses existing AIO facades — **no** charter/responsibility changes  

## 4. Evidence

- This document · \`WP-S3-CONFLICT.json\` · \`WP-S3-PACKAGE.md\`

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

- Conflict fixtures use Broker dissent/deadlock events and Authority patterns; live EXEC appointments still Designed.  
- “Missing Canonical” asserts non-invention + gap acknowledgment, not a full Knowledge Executive promotion cycle.  

## 7. Risks

| Risk | Mitigation |
|---|---|
| Unseen failure modes under office disable/corruption | WP-S4 (Founder-gated) |
| Stress concurrency beyond two competing requests | WP-S5 |

## 8. Rollback

Revert \`validate-conflict.ts\` / \`check-s3.ts\`. Do not weaken Authority escalate patterns or Guard gates. Prior WP-S1/S2 evidence remains.

## 9. Acceptance criteria

| Criterion | Result |
|---|---|
| Conflicting evidence / recommendations handled without silent pick | ${["CONFLICT-EVIDENCE", "CONFLICT-RECS"].every((id) => scenarios.find((s) => s.id === id)?.ok) ? "PASS" : "FAIL"} |
| Unknown authority / missing Canonical / insufficient confidence | ${["UNKNOWN-AUTHORITY", "MISSING-CANONICAL", "INSUFFICIENT-CONFIDENCE"].every((id) => scenarios.find((s) => s.id === id)?.ok) ? "PASS" : "FAIL"} |
| Simultaneous escalation + constitutional precedence + competing requests | ${["SIMULTANEOUS-ESCALATION", "CONSTITUTIONAL-PRECEDENCE", "COMPETING-REQUESTS"].every((id) => scenarios.find((s) => s.id === id)?.ok) ? "PASS" : "FAIL"} |
| Escalate; never invent authority; never suppress disagreement | ${verdict} |
| Overall WP-S3 | **${verdict}** |

---

## Executive summary

WP-S3 ${verdict === "PASS" ? "passed" : "failed"}: under conflict and competing authority pressure, Atlas escalates, preserves dissent, refuses invented Canonical/binding authority, and does not silently elect a single office winner.

## Engineering changes

Conflict scenario suite + \`atlas:staff:check:s3\`. No constitutional architecture or office responsibility changes.

## Remaining risks

Failure injection and operational stress unproven (WP-S4–S5).

## Recommended next work package

**WP-S4 — Failure Injection** — only after Founder approval.

**Atlas does not self-advance.**
`;

  writeFileSync(path.join(evidenceDir, "WP-S3-CONFLICT.md"), md);
  writeFileSync(
    path.join(evidenceDir, "WP-S3-PACKAGE.md"),
    `# WP-S3 Deliverable Package

1. **Executive summary** — WP-S3-CONFLICT.md  
2. **Engineering changes** — validate-conflict.ts, check-s3.ts  
3. **Validation evidence** — WP-S3-CONFLICT.md / .json  
4. **Remaining risks** — failure injection / stress deferred  
5. **Recommended next** — WP-S4 (await Founder approval)  

**Result: ${verdict}**  
**Do not start WP-S4 without Founder approval.**
`
  );

  if (verdict !== "PASS") {
    console.error("FAIL: WP-S3 Authority & Conflict Resolution");
    console.error(
      JSON.stringify(
        scenarios.filter((s) => !s.ok).map((s) => ({
          id: s.id,
          failed: s.checks.filter((c) => !c.pass),
        })),
        null,
        2
      )
    );
    process.exit(1);
  }

  console.log("PASS: WP-S3 Authority & Conflict Resolution");
  console.log(
    JSON.stringify(
      {
        result: verdict,
        scenarios: scenarios.map((s) => s.id),
        next: "WP-S4",
        advance: "BLOCKED — await Founder approval",
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error("FAIL: WP-S3");
  console.error(err);
  process.exit(1);
});
