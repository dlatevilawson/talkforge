#!/usr/bin/env node
/**
 * ATOS M4 integrity check — knowledge governance.
 * Document ID: SCRIPT-ATOS-M4
 * Status: Draft
 */
import { existsSync, readFileSync, readdirSync } from "fs";
import path from "path";

const root = process.cwd();
let failures = 0;
function fail(msg) {
  console.error(`FAIL: ${msg}`);
  failures += 1;
}

const required = [
  "atos/governance/knowledge-governance-operations.md",
  "atos/knowledge/README.md",
  "atos/knowledge/working/README.md",
  "atos/knowledge/evidence/README.md",
  "atos/knowledge/promotion/README.md",
  "atos/knowledge/promotion/queue.yaml",
  "atos/knowledge/canonical/README.md",
  "atos/knowledge/archive/README.md",
  "atos/knowledge/classifications/legacy-atlas-corpus.md",
  "atos/references/templates/REF-R1110-knowledge-promotion-request.md",
  "atos/milestones/M4-knowledge-governance.md",
  "atos/registries/knowledge-registry.yaml",
];

for (const rel of required) {
  if (!existsSync(path.join(root, rel))) fail(`missing ${rel}`);
}

const know = readFileSync(path.join(root, "atos/registries/knowledge-registry.yaml"), "utf8");
if (
  !know.includes("milestone: M4") &&
  !/milestone:\s*M[4-9]/.test(know) &&
  !know.includes("milestone: MS-SYNC")
) {
  fail("REG-KNOW must be at M4 or later");
}
if (!know.includes("promotion_pipeline:")) fail("REG-KNOW missing promotion_pipeline");
if (!know.includes("state: active")) fail("REG-KNOW promotion pipeline must be active");
if (!know.includes("draft_and_scaffold_are_not_canonical: true")) {
  fail("REG-KNOW missing canonical authority anti-hollow rule");
}
if (!know.includes("legacy_atlas_is_not_auto_canonical: true")) {
  fail("REG-KNOW missing legacy non-auto-canonical rule");
}

const queue = readFileSync(path.join(root, "atos/knowledge/promotion/queue.yaml"), "utf8");
if (!queue.includes("items:")) fail("promotion queue missing items");
if (!queue.includes("no_stage_skipping: true")) fail("queue missing no_stage_skipping rule");
if (!queue.includes("draft_cannot_become_canonical_without_approval: true")) {
  fail("queue missing draft_cannot_become_canonical_without_approval");
}

const classification = readFileSync(
  path.join(root, "atos/knowledge/classifications/legacy-atlas-corpus.md"),
  "utf8"
);
for (const f of [
  "constitution.md",
  "founder-brief.md",
  "forge-laws.md",
  "philosophy.md",
  "projects.md",
  "decisions.md",
  "roadmap.md",
  "metrics.md",
  "engineering-protocol.md",
  "bug-log.md",
]) {
  if (!classification.includes(f)) fail(`legacy classification missing ${f}`);
}

// Canonical library must not contain premature publications (only README scaffold)
const canonicalDir = path.join(root, "atos/knowledge/canonical");
const canonicalFiles = readdirSync(canonicalDir);
for (const name of canonicalFiles) {
  if (name === "README.md") continue;
  fail(`unexpected canonical publication before approval: ${name}`);
}

// Loader freeze
const loader = readFileSync(path.join(root, "atlas/engine/loader.ts"), "utf8");
const freeze = [
  "constitution.md",
  "founder-brief.md",
  "forge-laws.md",
  "philosophy.md",
  "projects.md",
  "decisions.md",
  "roadmap.md",
  "metrics.md",
  "engineering-protocol.md",
  "bug-log.md",
];
for (const f of freeze) {
  if (!loader.includes(`"${f}"`)) fail(`loader freeze broken for ${f}`);
}
if (loader.includes("atos/knowledge")) {
  fail("Ask Atlas loader must not bind atos/knowledge until Founder cutover");
}

const ops = readFileSync(
  path.join(root, "atos/governance/knowledge-governance-operations.md"),
  "utf8"
);
if (!ops.includes("No executive") && !ops.includes("may independently create institutional knowledge")) {
  // soft — check key phrase
  if (!ops.includes("independently create institutional knowledge")) {
    fail("GOV-KNOW must forbid unilateral institutional knowledge");
  }
}

if (failures === 0) {
  console.log("PASS: ATOS M4 integrity checks");
  process.exit(0);
}
console.error(`\n${failures} failure(s)`);
process.exit(1);
