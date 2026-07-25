#!/usr/bin/env node
/**
 * Minimal ATOS M0 integrity check.
 * Document ID: SCRIPT-ATOS-M0
 * Status: Draft
 */
import { existsSync, readFileSync } from "fs";
import path from "path";

const root = process.cwd();
const required = [
  "ATOS.md",
  "atos/README.md",
  "atos/resolutions/RES-001-atos-v1-implementation.md",
  "atos/governance/ADR-0001-repository-layout.md",
  "atos/governance/repository-governance.md",
  "atos/governance/authority-model.md",
  "atos/governance/metadata-framework.md",
  "atos/governance/registry-framework.md",
  "atos/governance/compatibility-atlas-pre-atos.md",
  "atos/governance/id-namespace-quarantine.md",
  "atos/schemas/document-metadata.schema.yaml",
  "atos/schemas/registry-entry.schema.yaml",
  "atos/registries/atos-registry.yaml",
  "atos/registries/document-registry.yaml",
  "atos/registries/knowledge-registry.yaml",
  "atos/registries/executive-registry.yaml",
  "atos/registries/project-registry.yaml",
  "atos/registries/architecture-registry.yaml",
  "atos/registries/repository-index.yaml",
  "atos/specifications/README.md",
  "atos/standards/README.md",
  "atos/manuals/README.md",
  "atos/references/README.md",
  "atos/milestones/M0-governance-foundation.md",
  // Pre-ATOS freeze targets
  "atlas/engine/loader.ts",
  "atlas/constitution.md",
  "atlas/bug-log.md",
  "atlas/ops/state.json",
];

const metadataIds = [
  "ATOS-ROOT",
  "RES-001",
  "ADR-0001",
  "GOV-REPO",
  "GOV-AUTH",
  "GOV-META",
  "GOV-REG",
  "GOV-COMPAT",
  "GOV-IDQ",
];

let failures = 0;

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  failures += 1;
}

for (const rel of required) {
  if (!existsSync(path.join(root, rel))) fail(`missing ${rel}`);
}

const docReg = readFileSync(
  path.join(root, "atos/registries/document-registry.yaml"),
  "utf8"
);
for (const id of metadataIds) {
  if (!docReg.includes(`id: ${id}`)) fail(`document-registry missing ${id}`);
}

const res = readFileSync(
  path.join(root, "atos/resolutions/RES-001-atos-v1-implementation.md"),
  "utf8"
);
if (!res.includes("**Status** | Authoritative")) {
  fail("RES-001 must be Authoritative");
}

const loader = readFileSync(path.join(root, "atlas/engine/loader.ts"), "utf8");
for (const file of [
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
  if (!loader.includes(`"${file}"`)) fail(`loader missing freeze file ${file}`);
}

if (failures === 0) {
  console.log("PASS: ATOS M0 integrity checks");
  process.exit(0);
}

console.error(`\n${failures} failure(s)`);
process.exit(1);
