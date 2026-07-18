#!/usr/bin/env node
/**
 * ATOS M3 integrity check — metadata completeness.
 * Document ID: SCRIPT-ATOS-M3
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

const mdFields = [
  "Document ID",
  "Version",
  "Status",
  "Owner",
  "AI Steward",
  "Human Approver",
  "Review Cycle",
  "Dependencies",
  "Related Documents",
  "Approval History",
  "Change Log",
];

const yamlFields = [
  "Document ID",
  "Version",
  "Status",
  "Owner",
  "AI Steward",
  "Human Approver",
  "Review Cycle",
  "Approval History",
  "Change Log",
];

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

const requiredFiles = [
  "atos/governance/metadata-framework.md",
  "atos/governance/metadata-application.md",
  "atos/references/templates/REF-R1100-document-metadata-template.md",
  "atos/registries/ownership-registry.yaml",
  "atos/milestones/M3-metadata-framework.md",
];
for (const rel of requiredFiles) {
  if (!existsSync(path.join(root, rel))) fail(`missing ${rel}`);
}

// Markdown under atos/ + ATOS.md
const mdFiles = [path.join(root, "ATOS.md"), ...walk(path.join(root, "atos")).filter((f) => f.endsWith(".md"))];
for (const file of mdFiles) {
  const text = readFileSync(file, "utf8");
  if (!text.includes("**Document ID**")) {
    fail(`${path.relative(root, file)} missing metadata table`);
    continue;
  }
  for (const field of mdFields) {
    const re = new RegExp(`\\|\\s*\\*\\*${field}\\*\\*\\s*\\|\\s*([^|]*)\\|`);
    const m = text.match(re);
    if (!m) fail(`${path.relative(root, file)} missing field ${field}`);
    else if (!m[1].trim()) fail(`${path.relative(root, file)} empty field ${field}`);
  }
}

// YAML registries + schemas
for (const file of walk(path.join(root, "atos")).filter((f) => f.endsWith(".yaml"))) {
  const text = readFileSync(file, "utf8");
  if (!/^# Document ID:\s*\S+/m.test(text)) {
    fail(`${path.relative(root, file)} missing Document ID header`);
    continue;
  }
  for (const field of yamlFields) {
    const re = new RegExp(`^# ${field}:\\s*\\S+`, "m");
    if (!re.test(text)) fail(`${path.relative(root, file)} missing YAML header ${field}`);
  }
}

// REG-DOC must carry owner + ai_steward on path entries
const docReg = readFileSync(path.join(root, "atos/registries/document-registry.yaml"), "utf8");
const blocks = docReg.split(/\n  - id: /).slice(1);
for (const block of blocks) {
  const id = block.split("\n")[0].trim();
  const pathLine = block.split("\n").find((l) => l.trim().startsWith("path:"));
  if (!pathLine || pathLine.includes("null")) continue;
  if (!block.includes("owner:")) fail(`REG-DOC ${id} missing owner`);
  if (!block.includes("ai_steward:")) fail(`REG-DOC ${id} missing ai_steward`);
}

if (!docReg.includes("id: GOV-META-APP") || !docReg.includes("id: REF-R1100") || !docReg.includes("id: REG-OWN")) {
  // may fail before rebuild — check after rebuild in workflow
  if (!docReg.includes("id: GOV-META-APP")) fail("REG-DOC missing GOV-META-APP");
  if (!docReg.includes("id: REF-R1100")) fail("REG-DOC missing REF-R1100");
  if (!docReg.includes("id: REG-OWN")) fail("REG-DOC missing REG-OWN");
}

const loader = readFileSync(path.join(root, "atlas/engine/loader.ts"), "utf8");
if (loader.includes("GOV-META-APP")) fail("Ask Atlas loader must not bind ATOS metadata docs yet");

if (failures === 0) {
  console.log("PASS: ATOS M3 integrity checks");
  process.exit(0);
}
console.error(`\n${failures} failure(s)`);
process.exit(1);
