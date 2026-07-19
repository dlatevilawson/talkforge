/**
 * W4 operational readiness evidence (ATLAS-D-W4).
 * Run: npm run atlas:runtime:check:w4
 */

import { writeFileSync, mkdirSync } from "fs";
import path from "path";
import { collectW4Evidence } from "./readiness/run-w4";

async function main(): Promise<void> {
  const pack = await collectW4Evidence();

  const outDir = path.join(process.cwd(), "atlas/runtime/evidence");
  mkdirSync(outDir, { recursive: true });
  const jsonPath = path.join(outDir, "w4-readiness.json");
  writeFileSync(jsonPath, JSON.stringify(pack, null, 2));

  const mdPath = path.join(outDir, "W4-READINESS-EVIDENCE.md");
  const md = `# W4 Operational Readiness Evidence

Generated: ${pack.cutover.generated_at}

## Founder Decisions

- **ATLAS-D-W4** — readiness proof before visibility  
- **ATLAS-D-FLAGS** — TARGET authorized **on**; FOUNDER_VISIBLE remains **off** (observation window)

| Flag | Value |
|---|---|
| ATLAS_RUNTIME_TARGET | \`${pack.flags.target}\` (authorized active internal) |
| ATLAS_RUNTIME_FOUNDER_VISIBLE | \`${pack.flags.founderVisible}\` (observation window) |

## 1. Production retention

| Sink | Count |
|---|---|
| ephemeral | ${pack.retention.ephemeral.length} |
| ops | ${pack.retention.ops.length} |
| discarded | ${pack.retention.discarded.length} |
| promo_staging | ${pack.retention.promoStaging.length} |

- Disposition class (normal path): \`${pack.pipeline.disposition_class}\`
- Disposition class (promo path): \`${pack.promo_pipeline.disposition_class}\`
- Auto-Canonical: **forbidden** (staging \`canonical=false\`, \`auto_published=false\`)

## 2. Exchange exposure (dry-run)

| Channel | Result |
|---|---|
| founder | ${pack.exchange.founder.channel} / binding=${pack.exchange.founder.binding} |
| sentinel | findings_intact=${pack.exchange.sentinel.sentinel_findings_intact} |
| domain | absorbed=${pack.exchange.domain.domain_absorbed} |
| promotion | canonical_published=${pack.exchange.promotion.canonical_published} |

Boundary violations: ${pack.exchange.boundary_violations.length === 0 ? "none" : pack.exchange.boundary_violations.join("; ")}

## 3. Cutover readiness / observation window

Observation window active (TARGET on, FOUNDER_VISIBLE off): **${pack.cutover.observation_window_active}**  
Ready for later FOUNDER_VISIBLE decision review: **${pack.cutover.ready_for_founder_flag_decision}**  
(Does not enable FOUNDER_VISIBLE. Does not lift loader freeze.)

| Gate | Status | Evidence |
|---|---|---|
${pack.cutover.gates
  .map(
    (g) =>
      `| ${g.id} ${g.gate} | ${g.status} | ${g.evidence.join("; ")} |`
  )
  .join("\n")}

Blockers: ${pack.cutover.blockers.length === 0 ? "none" : pack.cutover.blockers.join("; ")}

## Result

${pack.ok ? "**PASS** — W4 evidence pack complete under ATLAS-D-W4 constraints." : `**FAIL** — ${pack.failures.join("; ")}`}

Machine-readable: \`atlas/runtime/evidence/w4-readiness.json\`
`;

  writeFileSync(mdPath, md);

  if (!pack.ok) {
    console.error("FAIL: W4 readiness evidence");
    console.error(pack.failures);
    process.exit(1);
  }

  console.log("PASS: Atlas runtime W4 operational readiness evidence");
  console.log(
    JSON.stringify(
      {
        flags: pack.flags,
        retention_sinks: {
          ephemeral: pack.retention.ephemeral.length,
          ops: pack.retention.ops.length,
          promo_staging: pack.retention.promoStaging.length,
        },
        exchange_violations: pack.exchange.boundary_violations.length,
        observation_window_active: pack.cutover.observation_window_active,
        ready_for_founder_visible_decision:
          pack.cutover.ready_for_founder_flag_decision,
        evidence: ["atlas/runtime/evidence/W4-READINESS-EVIDENCE.md", jsonPath],
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
