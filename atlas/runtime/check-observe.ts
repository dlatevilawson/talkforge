/**
 * Founder Gate observation suite (ATLAS-GATE-FV).
 * Run: npm run atlas:runtime:observe
 *
 * Does NOT enable ATLAS_RUNTIME_FOUNDER_VISIBLE.
 */

import { mkdirSync, writeFileSync } from "fs";
import path from "path";
import { runObservationSuite } from "./observation/run";

async function main(): Promise<void> {
  const report = await runObservationSuite();

  const outDir = path.join(process.cwd(), "atlas/runtime/evidence");
  mkdirSync(outDir, { recursive: true });
  const jsonPath = path.join(outDir, "founder-visible-gate.json");
  writeFileSync(jsonPath, JSON.stringify(report, null, 2));

  const rows = report.criteria
    .map(
      (c) =>
        `| ${c.id} | ${c.name} | ${c.pass ? "**PASS**" : "**FAIL**"} | ${
          c.failures.length ? c.failures.join("; ") : c.evidence.slice(0, 2).join("; ")
        } |`
    )
    .join("\n");

  const md = `# Founder-Visible Gate Evidence

Generated: ${report.generated_at}  
Gate: **ATLAS-GATE-FV**  
Iterations: ${report.iterations}

## Flag posture (must hold)

| Flag | Value |
|---|---|
| ATLAS_RUNTIME_TARGET | \`${report.flags.target}\` |
| ATLAS_RUNTIME_FOUNDER_VISIBLE | \`${report.flags.founderVisible}\` |
| Observation window | \`${report.flags.observationWindow}\` |

## Criteria

| ID | Criterion | Result | Notes |
|---|---|---|---|
${rows}

## Recommendation to Founder

\`${report.recommendation}\`

- \`evidence_supports_founder_decision\` — tooling PASS; Founder may still decline or delay.  
- \`do_not_enable_founder_visible\` — do not lift the flag; remediate failures first.

**FOUNDER_VISIBLE remains off until an explicit Founder Decision.**

Machine-readable: \`atlas/runtime/evidence/founder-visible-gate.json\`
`;

  const mdPath = path.join(outDir, "FOUNDER-VISIBLE-GATE-EVIDENCE.md");
  writeFileSync(mdPath, md);

  if (!report.ok) {
    console.error("FAIL: ATLAS-GATE-FV observation suite");
    for (const c of report.criteria.filter((x) => !x.pass)) {
      console.error(`  ${c.id} ${c.name}:`, c.failures);
    }
    process.exit(1);
  }

  console.log("PASS: ATLAS-GATE-FV observation suite");
  console.log(
    JSON.stringify(
      {
        ok: report.ok,
        recommendation: report.recommendation,
        flags: {
          target: report.flags.target,
          founderVisible: report.flags.founderVisible,
          observationWindow: report.flags.observationWindow,
        },
        criteria: report.criteria.map((c) => ({ id: c.id, pass: c.pass })),
        evidence: [
          "atlas/runtime/evidence/FOUNDER-VISIBLE-GATE-EVIDENCE.md",
          jsonPath,
        ],
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});
