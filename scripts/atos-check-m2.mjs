#!/usr/bin/env node
/**
 * ATOS M2 integrity check — core registry infrastructure.
 * Document ID: SCRIPT-ATOS-M2
 * Status: Draft
 */
import { existsSync, readFileSync, readdirSync, statSync } from "fs";
import path from "path";

const root = process.cwd();
let failures = 0;
function fail(msg) {
  console.error(`FAIL: ${msg}`);
  failures += 1;
}

function read(rel) {
  return readFileSync(path.join(root, rel), "utf8");
}

const core = [
  "atos/registries/atos-registry.yaml",
  "atos/registries/document-registry.yaml",
  "atos/registries/executive-registry.yaml",
  "atos/registries/project-registry.yaml",
  "atos/governance/registry-operations.md",
  "atos/registries/INDEX.md",
  "atos/milestones/M2-registry-infrastructure.md",
];

for (const rel of core) {
  if (!existsSync(path.join(root, rel))) fail(`missing ${rel}`);
}

const atosReg = read("atos/registries/atos-registry.yaml");
// M2+ forward compatible: current milestone may advance after M2 approval
if (
  !/milestone:\s*M[2-9]/.test(atosReg) &&
  !atosReg.includes("completed: [M0, M1, M2")
) {
  fail("REG-ATOS must reflect M2 completion or later milestone");
}
if (!atosReg.includes("id: REG-DOC")) fail("REG-ATOS must index REG-DOC");
if (!atosReg.includes("id: REG-EXEC")) fail("REG-ATOS must index REG-EXEC");
if (!atosReg.includes("id: REG-PROJ")) fail("REG-ATOS must index REG-PROJ");

const docReg = read("atos/registries/document-registry.yaml");
const execReg = read("atos/registries/executive-registry.yaml");
const projReg = read("atos/registries/project-registry.yaml");

// Unique IDs
function ids(text, prefix = "  - id: ") {
  const out = [];
  for (const line of text.split("\n")) {
    if (line.startsWith(prefix)) out.push(line.slice(prefix.length).trim());
  }
  return out;
}

function assertUnique(list, label) {
  const seen = new Set();
  for (const id of list) {
    if (seen.has(id)) fail(`duplicate ${label} id: ${id}`);
    seen.add(id);
  }
}

const docIds = ids(docReg);
assertUnique(docIds, "document");
const execIds = ids(execReg);
assertUnique(execIds, "executive");
const projIds = ids(projReg);
assertUnique(projIds, "project");

for (const id of ["SPEC-001", "STD-001", "RES-001", "GOV-REGOPS", "ATOS-NAV", "REG-INDEX"]) {
  if (!docIds.includes(id) && !docReg.includes(`id: ${id}`)) {
    // REG-INDEX is Document ID in INDEX.md - should be scanned
    if (!docReg.includes(`id: ${id}`)) fail(`REG-DOC missing ${id}`);
  }
}

// Path integrity for document registry
const blocks = docReg.split(/\n  - id: /).slice(1);
for (const block of blocks) {
  const id = block.split("\n")[0].trim();
  const pathLine = block.split("\n").find((l) => l.trim().startsWith("path:"));
  if (!pathLine) {
    fail(`REG-DOC ${id} missing path field`);
    continue;
  }
  const p = pathLine.replace(/^\s*path:\s*/, "").trim();
  if (p === "null") continue;
  if (!existsSync(path.join(root, p))) fail(`REG-DOC ${id} path missing on disk: ${p}`);
}

// Required executives
for (const id of ["EXEC-FOUNDER", "EXEC-ATLAS", "EXEC-SENTINEL", "EXEC-CIO"]) {
  if (!execReg.includes(`id: ${id}`)) fail(`REG-EXEC missing ${id}`);
}

// Required projects
for (const id of ["PROJ-ATOS-V1", "PROJ-TALKFORGE-MVP", "PROJ-ATLAS-FOUNDER-OS"]) {
  if (!projReg.includes(`id: ${id}`)) fail(`REG-PROJ missing ${id}`);
}
if (!projReg.includes("source_of_truth:")) fail("REG-PROJ missing source_of_truth");

// Every atos markdown with Document ID must be in REG-DOC
function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, acc);
    else if (name.endsWith(".md") || name.endsWith(".yaml") || name.endsWith(".yml")) acc.push(full);
  }
  return acc;
}

for (const file of walk(path.join(root, "atos"))) {
  const text = readFileSync(file, "utf8");
  const m =
    text.match(/\|\s*\*\*Document ID\*\*\s*\|\s*([^|]+)\|/) ||
    text.match(/^# Document ID:\s*(\S+)/m);
  if (!m) continue;
  const id = m[1].trim();
  if (!docReg.includes(`id: ${id}`)) fail(`file ${path.relative(root, file)} has Document ID ${id} not in REG-DOC`);
}

// Loader freeze
const loader = read("atlas/engine/loader.ts");
if (loader.includes("atos/registries")) fail("Ask Atlas loader must not bind ATOS registries yet");

if (failures === 0) {
  console.log("PASS: ATOS M2 integrity checks");
  process.exit(0);
}
console.error(`\n${failures} failure(s)`);
process.exit(1);
