#!/usr/bin/env node
/**
 * ATOS MS-SYNC integrity check — governance state synchronization.
 * Document ID: SCRIPT-ATOS-SYNC
 * Status: Draft
 */
import { existsSync, readFileSync, readdirSync } from "fs";
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

const constitutional = [];
for (const dir of ["specifications", "standards"]) {
  for (const name of readdirSync(path.join(root, `atos/${dir}`))) {
    if (!name.endsWith(".md") || name === "README.md") continue;
    constitutional.push(`atos/${dir}/${name}`);
  }
}

for (const rel of constitutional) {
  const body = read(rel);
  if (!body.includes("**Status** | Authoritative")) fail(`${rel}: metadata Status must be Authoritative`);
  if (/Version:\s*1\.0\s*\(Draft\)/.test(body)) fail(`${rel}: stale body Version Draft`);
  if (/^Status:\s*Draft\s*$/m.test(body)) fail(`${rel}: stale body Status Draft`);
  if (!/^Version:\s*1\.0\.0\s*$/m.test(body) && !body.includes("Version: 1.0.0\nStatus: Authoritative")) {
    // SPEC-001 has Version/Status in Approval section; others near title
    if (!/Version:\s*1\.0\.0/.test(body) || !/Status:\s*Authoritative/.test(body)) {
      fail(`${rel}: body must declare Version 1.0.0 and Status Authoritative`);
    }
  }
}

// Registry agreement: Specs/Standards authoritative in REG-DOC, REG-ARCH
const regDoc = read("atos/registries/document-registry.yaml");
const regArch = read("atos/registries/architecture-registry.yaml");
const regRepo = read("atos/registries/repository-index.yaml");
const regKnow = read("atos/registries/knowledge-registry.yaml");
const regAtos = read("atos/registries/atos-registry.yaml");

for (const id of [
  "SPEC-001",
  "SPEC-002",
  "SPEC-003",
  "SPEC-004",
  "SPEC-005",
  "SPEC-006",
  "STD-001",
  "STD-002",
  "STD-003",
  "STD-004",
  "STD-005",
  "STD-006",
]) {
  const docBlock = regDoc.match(new RegExp(`- id: ${id}\\n(?:    .*\\n){0,8}`));
  if (!docBlock) fail(`REG-DOC missing ${id}`);
  else if (!docBlock[0].includes("state: authoritative")) fail(`REG-DOC ${id} not authoritative`);

  const archBlock = regArch.match(new RegExp(`- id: ${id}\\n    path: .*\\n    state: .*`));
  if (!archBlock) fail(`REG-ARCH missing ${id}`);
  else if (!archBlock[0].includes("state: authoritative")) fail(`REG-ARCH ${id} not authoritative`);
}

if (!regRepo.includes("atos/specifications/\n    role: level_1\n    state: authoritative")) {
  fail("REG-REPO specifications path not authoritative");
}
if (!regRepo.includes("atos/standards/\n    role: level_2\n    state: authoritative")) {
  fail("REG-REPO standards path not authoritative");
}

if (/SPEC-002\s+Draft/.test(regKnow) || /SPEC-002 Draft is not yet/.test(regKnow)) {
  fail("REG-KNOW retains stale SPEC-002 Draft note");
}
if (!regAtos.includes("name: Specifications\n    path: atos/specifications\n    state: authoritative")) {
  fail("REG-ATOS L1 not authoritative");
}
if (!regAtos.includes("name: Standards\n    path: atos/standards\n    state: authoritative")) {
  fail("REG-ATOS L2 not authoritative");
}

// REG-DOC self-entry authoritative
const regDocSelf = regDoc.match(/- id: REG-DOC\n(?:    .*\n){0,8}/);
if (!regDocSelf || !regDocSelf[0].includes("state: authoritative")) {
  fail("REG-DOC self-entry must be authoritative");
}

// Foundational docs
for (const [rel, status] of [
  ["atos/governance/ADR-0001-repository-layout.md", "Authoritative"],
  ["atos/governance/authority-model.md", "Authoritative"],
  ["atos/governance/GOV-FREEZE-1.0.0.md", "Review"],
  ["atos/RELEASE-1.0.0.md", "Review"],
  ["atos/references/templates/REF-R1101-architecture-decision-record-template.md", "Draft"],
  ["atos/milestones/MS-SYNC-governance-state.md", "Review"],
]) {
  if (!existsSync(path.join(root, rel))) {
    fail(`missing ${rel}`);
    continue;
  }
  const body = read(rel);
  if (!body.includes(`**Status** | ${status}`)) fail(`${rel} Status must be ${status}`);
}

// Cross-ref: REF-R1101 exists and is referenced by STD-001
const std001 = read(
  spawnSync("bash", ["-lc", "ls atos/standards/STD-001-*.md"], { cwd: root, encoding: "utf8" })
    .stdout.trim()
    .split("\n")[0],
);
if (!std001.includes("REF-R1101")) fail("STD-001 must reference REF-R1101");

// Markdown links in ATOS.md + NAVIGATION
function checkLinks(file) {
  const t = read(file);
  const dir = path.dirname(path.join(root, file));
  const re = /\[([^\]]+)\]\(([^)]+)\)/g;
  let m;
  while ((m = re.exec(t))) {
    let p = m[2].split("#")[0];
    if (!p || p.startsWith("http") || p.startsWith("mailto:")) continue;
    const abs = path.resolve(dir, p);
    if (!existsSync(abs)) fail(`broken link in ${file}: ${m[2]}`);
  }
}
checkLinks("ATOS.md");
checkLinks("atos/NAVIGATION.md");

// Canonical library still empty (only README)
const canonicalDir = path.join(root, "atos/knowledge/canonical");
const canonicalFiles = readdirSync(canonicalDir).filter((f) => f !== "README.md");
if (canonicalFiles.length > 0) fail("Canonical library must remain empty until STD-002 promotions");

// Loader freeze
const loader = read("atlas/engine/loader.ts");
if (loader.includes("atos/")) fail("Ask Atlas loader must not bind atos/");

if (failures === 0) {
  console.log("PASS: ATOS MS-SYNC governance state integrity");
  process.exit(0);
}
console.error(`\n${failures} failure(s)`);
process.exit(1);
