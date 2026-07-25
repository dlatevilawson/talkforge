#!/usr/bin/env node
/**
 * ATOS M6 integrity check — executive systems.
 * Document ID: SCRIPT-ATOS-M6
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
  "atos/executives/README.md",
  "atos/executives/collaboration.md",
  "atos/executives/charters/CHARTER-FOUNDER.md",
  "atos/executives/charters/CHARTER-ATLAS.md",
  "atos/executives/charters/CHARTER-SENTINEL.md",
  "atos/manuals/MAN-001-founder-operating-manual.md",
  "atos/manuals/MAN-002-atlas-operating-manual.md",
  "atos/manuals/MAN-003-sentinel-operating-manual.md",
  "atos/manuals/MAN-016-ai-executive-manual.md",
  "atos/milestones/M6-executive-systems.md",
];

for (const rel of required) {
  if (!existsSync(path.join(root, rel))) fail(`missing ${rel}`);
}

const atlas = readFileSync(path.join(root, "atos/executives/charters/CHARTER-ATLAS.md"), "utf8");
if (!atlas.includes("may not") && !atlas.includes("Prohibited")) {
  fail("Atlas charter must include prohibitions");
}
if (!atlas.includes("Create institutional") && !atlas.includes("institutional")) {
  fail("Atlas charter must restrict institutional knowledge creation");
}

const sentinel = readFileSync(
  path.join(root, "atos/executives/charters/CHARTER-SENTINEL.md"),
  "utf8"
);
if (!sentinel.includes("Chief Engineering")) fail("Sentinel charter role missing");
if (!sentinel.includes("alter constitutional") && !sentinel.includes("Alter constitutional")) {
  fail("Sentinel charter must forbid constitutional alteration");
}

const execReg = readFileSync(path.join(root, "atos/registries/executive-registry.yaml"), "utf8");
for (const key of [
  "charter_path: atos/executives/charters/CHARTER-ATLAS.md",
  "charter_path: atos/executives/charters/CHARTER-SENTINEL.md",
  "manual_path: atos/manuals/MAN-002-atlas-operating-manual.md",
  "manual_path: atos/manuals/MAN-003-sentinel-operating-manual.md",
  "atlas_charter: present",
  "sentinel_charter: present",
]) {
  if (!execReg.includes(key)) fail(`REG-EXEC missing ${key}`);
}

const collab = readFileSync(path.join(root, "atos/executives/collaboration.md"), "utf8");
if (!collab.includes("Conflict resolution")) fail("collaboration.md missing conflict resolution");

const aiem = readFileSync(path.join(root, "atos/manuals/MAN-016-ai-executive-manual.md"), "utf8");
if (!aiem.includes("Scaffold") || !aiem.includes("Canonical")) {
  fail("AIEM must include Scaffold/Canonical safety boundaries");
}

const loader = readFileSync(path.join(root, "atlas/engine/loader.ts"), "utf8");
if (loader.includes("CHARTER-ATLAS") || loader.includes("atos/executives")) {
  fail("Ask Atlas loader must not auto-bind executive charters without Founder cutover");
}

if (failures === 0) {
  console.log("PASS: ATOS M6 integrity checks");
  process.exit(0);
}
console.error(`\n${failures} failure(s)`);
process.exit(1);
