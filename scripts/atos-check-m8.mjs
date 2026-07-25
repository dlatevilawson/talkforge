#!/usr/bin/env node
/**
 * ATOS M8 integrity check — operational validation (cross-cutting).
 * Document ID: SCRIPT-ATOS-M8
 * Status: Draft
 */
import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import path from "path";
import { spawnSync } from "child_process";

const root = process.cwd();
let failures = 0;
function fail(msg) {
  console.error(`FAIL: ${msg}`);
  failures += 1;
}

function read(rel) {
  return readFileSync(path.join(root, rel), "utf8");
}

const required = [
  "atos/validation/README.md",
  "atos/validation/checklist.md",
  "atos/validation/mvi-readiness.md",
  "atos/milestones/M8-operational-validation.md",
];
for (const rel of required) {
  if (!existsSync(path.join(root, rel))) fail(`missing ${rel}`);
}

// Re-run M0–M7
for (let i = 0; i <= 7; i++) {
  const script = path.join(root, `scripts/atos-check-m${i}.mjs`);
  const r = spawnSync(process.execPath, [script], { encoding: "utf8" });
  if (r.status !== 0) {
    fail(`atos-check-m${i} failed`);
    if (r.stdout) process.stdout.write(r.stdout);
    if (r.stderr) process.stderr.write(r.stderr);
  }
}

// Navigation link integrity
function checkMdLinks(fileRel, baseDir) {
  const text = read(fileRel);
  const re = /\[([^\]]+)\]\(([^)]+)\)/g;
  let m;
  while ((m = re.exec(text))) {
    const href = m[2];
    if (href.startsWith("http") || href.startsWith("#") || href.startsWith("mailto:")) continue;
    const target = path.resolve(baseDir, href);
    if (!existsSync(target)) fail(`broken link in ${fileRel}: ${href}`);
  }
}
checkMdLinks("atos/NAVIGATION.md", path.join(root, "atos"));
checkMdLinks("ATOS.md", root);

// REG-DOC path integrity
const docReg = read("atos/registries/document-registry.yaml");
for (const block of docReg.split(/\n  - id: /).slice(1)) {
  const id = block.split("\n")[0].trim();
  const pathLine = block.split("\n").find((l) => l.trim().startsWith("path:"));
  if (!pathLine) continue;
  const p = pathLine.replace(/^\s*path:\s*/, "").trim();
  if (p === "null") continue;
  if (!existsSync(path.join(root, p))) fail(`REG-DOC ${id} missing path ${p}`);
}

// Core constitutional files present
for (const rel of [
  "atos/specifications/SPEC-001-core-architecture.md",
  "atos/specifications/SPEC-006-executive-systems.md",
  "atos/standards/STD-001-architecture-decision-standard.md",
  "atos/standards/STD-006-runtime-workflow-standard.md",
  "atos/executives/charters/CHARTER-ATLAS.md",
  "atos/executives/charters/CHARTER-SENTINEL.md",
  "atos/knowledge/promotion/queue.yaml",
  "atos/runtime/interfaces.md",
  "atos/founder/dashboard.md",
  "atos/resolutions/RES-001-atos-v1-implementation.md",
]) {
  if (!existsSync(path.join(root, rel))) fail(`missing core artifact ${rel}`);
}

// Knowledge validation
const queue = read("atos/knowledge/promotion/queue.yaml");
if (!queue.includes("draft_cannot_become_canonical_without_approval: true")) {
  fail("promotion queue missing anti-auto-canonical rule");
}
const canonicalDir = path.join(root, "atos/knowledge/canonical");
for (const name of readdirSync(canonicalDir)) {
  if (name !== "README.md") fail(`unexpected canonical file ${name}`);
}

// Runtime validation
const runtimeReg = read("atos/registries/runtime-registry.yaml");
if (!runtimeReg.includes("loader_freeze_until_founder_cutover: true")) {
  fail("runtime registry loader freeze missing");
}

// Loader freeze
const loader = read("atlas/engine/loader.ts");
if (loader.includes("atos/")) fail("Ask Atlas loader must not bind atos/ paths");

// MVI scorecard exists and has dimensions
const mvi = read("atos/validation/mvi-readiness.md");
for (const section of [
  "## Governance",
  "## Knowledge",
  "## Operations",
  "## Repository",
  "## Runtime",
  "## Executive Systems",
]) {
  if (!mvi.includes(section)) fail(`mvi-readiness missing ${section}`);
}

// RES-001 still Authoritative
if (!read("atos/resolutions/RES-001-atos-v1-implementation.md").includes("**Status** | Authoritative")) {
  fail("RES-001 must remain Authoritative");
}

if (failures === 0) {
  console.log("PASS: ATOS M8 operational validation");
  process.exit(0);
}
console.error(`\n${failures} failure(s)`);
process.exit(1);
