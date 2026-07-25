#!/usr/bin/env node
/**
 * ATOS M5 integrity check — runtime infrastructure documentation.
 * Document ID: SCRIPT-ATOS-M5
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
  "atos/governance/runtime-governance.md",
  "atos/runtime/README.md",
  "atos/runtime/interfaces.md",
  "atos/runtime/context-framework.md",
  "atos/runtime/memory-classification.md",
  "atos/runtime/workflows.md",
  "atos/runtime/legacy-mapping.md",
  "atos/runtime/records.md",
  "atos/manuals/MAN-013-runtime-operations.md",
  "atos/registries/runtime-registry.yaml",
  "atos/milestones/M5-runtime-infrastructure.md",
];

for (const rel of required) {
  if (!existsSync(path.join(root, rel))) fail(`missing ${rel}`);
}

const iface = readFileSync(path.join(root, "atos/runtime/interfaces.md"), "utf8");
for (const name of ["Hub", "Context Injector", "Memory Keeper", "Sandbox"]) {
  if (!iface.includes(name)) fail(`interfaces.md missing ${name}`);
}

const ctx = readFileSync(path.join(root, "atos/runtime/context-framework.md"), "utf8");
if (!ctx.includes("legacy-atlas")) fail("context framework missing legacy-atlas tier");
if (!ctx.includes("Scaffold")) fail("context framework must address Scaffold exclusion");

const mem = readFileSync(path.join(root, "atos/runtime/memory-classification.md"), "utf8");
for (const c of [
  "Temporary Memory",
  "Operational Memory",
  "Promotion Candidate",
  "Discarded Information",
]) {
  if (!mem.includes(c)) fail(`memory classification missing ${c}`);
}

const wf = readFileSync(path.join(root, "atos/runtime/workflows.md"), "utf8");
if (!wf.includes("Receive Request") || !wf.includes("Memory Classification")) {
  fail("workflows.md missing STD-006 stages");
}

const records = readFileSync(path.join(root, "atos/runtime/records.md"), "utf8");
for (const id of ["R1001", "R1002", "R1003", "R1004", "R1005", "R1006"]) {
  if (!records.includes(id)) fail(`records.md missing ${id}`);
}
if (!records.includes("do not") && !records.includes("do not**")) {
  // check non-git rule
  if (!records.toLowerCase().includes("do not") && !records.includes("non-git")) {
    fail("records.md must forbid git high-volume sinks");
  }
}
if (!records.includes("non-git") && !records.includes("Non-git")) {
  fail("records.md must declare non-git storage plane");
}

const reg = readFileSync(path.join(root, "atos/registries/runtime-registry.yaml"), "utf8");
if (!reg.includes("loader_freeze_until_founder_cutover: true")) {
  fail("REG-RUNTIME missing loader freeze rule");
}
if (!reg.includes("git_not_for_high_volume_runtime_logs: true")) {
  fail("REG-RUNTIME missing git log prohibition");
}

const man = readFileSync(path.join(root, "atos/manuals/MAN-013-runtime-operations.md"), "utf8");
if (!man.includes("**Document ID** | MAN-013")) fail("MAN-013 metadata missing");

// Loader freeze
const loader = readFileSync(path.join(root, "atlas/engine/loader.ts"), "utf8");
if (loader.includes("atos/runtime") || loader.includes("atos/knowledge")) {
  fail("Ask Atlas loader must remain frozen (no atos/runtime or atos/knowledge binding)");
}
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
  if (!loader.includes(`"${f}"`)) fail(`loader freeze broken: ${f}`);
}

if (failures === 0) {
  console.log("PASS: ATOS M5 integrity checks");
  process.exit(0);
}
console.error(`\n${failures} failure(s)`);
process.exit(1);
