#!/usr/bin/env node
/**
 * ATOS M1 integrity check — Specs, Standards, navigation, registry paths.
 * Document ID: SCRIPT-ATOS-M1
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

const specs = [
  "atos/specifications/SPEC-001-core-architecture.md",
  "atos/specifications/SPEC-002-identity.md",
  "atos/specifications/SPEC-003-knowledge-governance.md",
  "atos/specifications/SPEC-004-operations.md",
  "atos/specifications/SPEC-005-runtime-infrastructure.md",
  "atos/specifications/SPEC-006-executive-systems.md",
];
const standards = [
  "atos/standards/STD-001-architecture-decision-standard.md",
  "atos/standards/STD-002-knowledge-promotion-standard.md",
  "atos/standards/STD-003-executive-decision-standard.md",
  "atos/standards/STD-004-project-governance-standard.md",
  "atos/standards/STD-005-incident-investigation-standard.md",
  "atos/standards/STD-006-runtime-workflow-standard.md",
];

const required = [
  "atos/NAVIGATION.md",
  "atos/milestones/M1-repository-organization.md",
  ...specs,
  ...standards,
];

for (const rel of required) {
  if (!existsSync(path.join(root, rel))) fail(`missing ${rel}`);
}

// Metadata + status: Draft until ratification; Authoritative after RES-002 (M9+)
const ratified = existsSync(
  path.join(root, "atos/resolutions/RES-002-atos-v1-ratification.md")
);
for (const rel of [...specs, ...standards]) {
  const body = readFileSync(path.join(root, rel), "utf8");
  if (!body.includes("**Document ID**")) fail(`${rel} missing metadata`);
  const isDraft = body.includes("**Status** | Draft");
  const isAuth = /^\| \*\*Status\*\* \| Authoritative/m.test(body);
  if (ratified) {
    if (!isAuth) fail(`${rel} must be Authoritative after RES-002 ratification`);
  } else if (!isDraft) {
    fail(`${rel} must remain Draft until Founder ratification`);
  }
}

// Navigation links
const nav = readFileSync(path.join(root, "atos/NAVIGATION.md"), "utf8");
for (const rel of [...specs, ...standards]) {
  const link = rel.replace(/^atos\//, "");
  if (!nav.includes(link)) fail(`NAVIGATION missing link to ${link}`);
  // resolve relative from atos/
  if (!existsSync(path.join(root, "atos", link))) fail(`broken nav target ${link}`);
}

// Document registry paths
const docReg = readFileSync(
  path.join(root, "atos/registries/document-registry.yaml"),
  "utf8"
);
for (const rel of [...specs, ...standards]) {
  if (!docReg.includes(`path: ${rel}`)) fail(`document-registry missing path ${rel}`);
}
for (const id of ["ATOS-NAV", "MS-M1", "SPEC-001", "STD-001"]) {
  if (!docReg.includes(`id: ${id}`)) fail(`document-registry missing ${id}`);
}

// Loader freeze
const loader = readFileSync(path.join(root, "atlas/engine/loader.ts"), "utf8");
if (loader.includes("atos/specifications") || loader.includes("SPEC-001")) {
  fail("Ask Atlas loader must not load ATOS Specs yet");
}

if (failures === 0) {
  console.log("PASS: ATOS M1 integrity checks");
  process.exit(0);
}
console.error(`\n${failures} failure(s)`);
process.exit(1);
