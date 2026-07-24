#!/usr/bin/env node
/**
 * ATOS M7 integrity check — Founder Workspace.
 * Document ID: SCRIPT-ATOS-M7
 * Status: Draft
 */
import { existsSync, readFileSync } from "fs";
import path from "path";

const root = process.cwd();
let failures = 0;
function fail(msg) {
  console.error(`FAIL: ${msg}`);
  failures += 1;
}

const required = [
  "atos/founder/README.md",
  "atos/founder/dashboard.md",
  "atos/founder/reports.md",
  "atos/founder/planning.md",
  "atos/founder/reviews.md",
  "atos/founder/product-surface.md",
  "atos/manuals/MAN-017-founder-intelligence-manual.md",
  "atos/references/templates/REF-R1104-executive-brief-template.md",
  "atos/references/templates/REF-R1108-weekly-review-template.md",
  "atos/references/templates/REF-R1109-quarterly-planning-template.md",
  "atos/registries/founder-workspace-registry.yaml",
  "atos/milestones/M7-founder-workspace.md",
];

for (const rel of required) {
  if (!existsSync(path.join(root, rel))) fail(`missing ${rel}`);
}

const dash = readFileSync(path.join(root, "atos/founder/dashboard.md"), "utf8");
for (const panel of [
  "Mission",
  "Active projects",
  "Risks",
  "Decisions needed",
  "ATOS milestone",
  "Knowledge",
  "Notes",
]) {
  if (!dash.includes(panel)) fail(`dashboard.md missing panel concept: ${panel}`);
}

const reviews = readFileSync(path.join(root, "atos/founder/reviews.md"), "utf8");
for (const w of ["Daily Executive Review", "Weekly Planning", "Quarterly Review"]) {
  if (!reviews.includes(w)) fail(`reviews.md missing ${w}`);
}

const surface = readFileSync(path.join(root, "atos/founder/product-surface.md"), "utf8");
if (!surface.includes("FounderOS") && !surface.includes("app/atlas")) {
  fail("product-surface.md must reference app/atlas Founder OS");
}
if (!surface.includes("does not mandate UI rewrite") && !surface.includes("does not mandate")) {
  fail("product-surface.md must state M7 does not mandate UI rewrite");
}

const reg = readFileSync(
  path.join(root, "atos/registries/founder-workspace-registry.yaml"),
  "utf8"
);
if (!reg.includes("redesign_required_in_m7: false")) {
  fail("REG-FWS must set redesign_required_in_m7: false");
}

const man = readFileSync(
  path.join(root, "atos/manuals/MAN-017-founder-intelligence-manual.md"),
  "utf8"
);
if (!man.includes("**Document ID** | MAN-017")) fail("MAN-017 metadata missing");

const loader = readFileSync(path.join(root, "atlas/engine/loader.ts"), "utf8");
if (loader.includes("atos/founder")) {
  fail("Ask Atlas loader must not bind atos/founder without Founder cutover");
}

if (failures === 0) {
  console.log("PASS: ATOS M7 integrity checks");
  process.exit(0);
}
console.error(`\n${failures} failure(s)`);
process.exit(1);
