#!/usr/bin/env node
/**
 * ATOS M9 integrity check — Version 1.0.0 release.
 * Document ID: SCRIPT-ATOS-M9
 * Status: Draft
 */
import { existsSync, readFileSync } from "fs";
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
  "atos/VERSION",
  "atos/RELEASE-1.0.0.md",
  "atos/governance/GOV-FREEZE-1.0.0.md",
  "atos/resolutions/RES-002-atos-v1-ratification.md",
  "atos/milestones/M9-version-1-release.md",
];
for (const rel of required) {
  if (!existsSync(path.join(root, rel))) fail(`missing ${rel}`);
}

const version = read("atos/VERSION").trim();
if (version !== "1.0.0") fail(`atos/VERSION must be 1.0.0 (got ${version})`);

const res2 = read("atos/resolutions/RES-002-atos-v1-ratification.md");
if (!res2.includes("**Status** | Authoritative")) fail("RES-002 must be Authoritative");

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
  // find file
  const dir = id.startsWith("SPEC") ? "specifications" : "standards";
  const files = spawnSync("bash", ["-lc", `ls atos/${dir}/${id}-*.md`], {
    cwd: root,
    encoding: "utf8",
  });
  const file = (files.stdout || "").trim().split("\n")[0];
  if (!file) {
    fail(`missing file for ${id}`);
    continue;
  }
  const body = read(file);
  if (!body.includes("**Status** | Authoritative")) fail(`${id} not Authoritative`);
}

const release = read("atos/RELEASE-1.0.0.md");
if (!release.includes("1.0.0")) fail("release notes missing 1.0.0");
if (!release.includes("atos-v1.0.0")) fail("release notes missing git tag name");

const freeze = read("atos/governance/GOV-FREEZE-1.0.0.md");
if (!freeze.includes("Frozen")) fail("freeze policy incomplete");

const atos = read("ATOS.md");
if (!atos.includes("1.0.0")) fail("ATOS.md must reference 1.0.0");

// Loader still frozen (ratification ≠ cutover)
const loader = read("atlas/engine/loader.ts");
if (loader.includes("atos/")) fail("Ask Atlas loader must not bind atos/ at v1.0.0 publication");

// Re-run M8 for release confidence
const m8 = spawnSync(process.execPath, [path.join(root, "scripts/atos-check-m8.mjs")], {
  encoding: "utf8",
});
if (m8.status !== 0) {
  fail("M8 validation must pass for release");
  if (m8.stdout) process.stdout.write(m8.stdout);
  if (m8.stderr) process.stderr.write(m8.stderr);
}

if (failures === 0) {
  console.log("PASS: ATOS M9 Version 1.0.0 release checks");
  process.exit(0);
}
console.error(`\n${failures} failure(s)`);
process.exit(1);
