/**
 * Sprint 1 / WP-S0 — Ownership Skeleton acceptance.
 * Run: npm run atlas:staff:check:s0
 */

import { writeFileSync, mkdirSync } from "fs";
import path from "path";
import { resetTraceSinkForTests } from "../modules/trace";
import { runStaffCoordinatedPipeline } from "./coordinate";
import { resetFaults } from "./fault";
import {
  assertAllOfficesRegistered,
  instantiateAllOffices,
  REQUIRED_OFFICES,
} from "./offices/registry";
import {
  assertNotSixthAio,
  assertOwnershipInvariants,
  validateExclusiveOwnership,
  MODULE_OWNER,
  RESPONSIBILITY_OWNER,
} from "./ownership";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

async function main(): Promise<void> {
  resetFaults();
  const evidenceDir = path.join(
    process.cwd(),
    "atlas/runtime/evidence"
  );
  mkdirSync(evidenceDir, { recursive: true });

  // 1. Register + instantiate every office
  assertAllOfficesRegistered();
  const offices = instantiateAllOffices();
  assert(offices.length === 5, "instantiate all five AIO offices");
  for (const id of REQUIRED_OFFICES) {
    assert(
      offices.some((o) => o.id === id && o.status === "operational"),
      `office ${id} operational`
    );
  }

  // 2. Ownership map — exactly one owner, no orphans
  const ownership = validateExclusiveOwnership();
  assert(ownership.ok, `ownership: ${ownership.errors.join("; ")}`);
  assertOwnershipInvariants();
  assert(
    ownership.offices_with_work.length === 5,
    "every office owns at least one responsibility/module"
  );
  assert(ownership.orphans.length === 0, "no orphaned responsibilities");
  assert(ownership.dual_owners.length === 0, "no dual owners");

  try {
    assertNotSixthAio("AIO-PROGRAM");
    throw new Error("expected sixth-AIO rejection");
  } catch (e) {
    assert(
      e instanceof Error && /not a peer office/i.test(e.message),
      "reject AIO-PROGRAM"
    );
  }

  // 3. Staff coordinator + delegation pipeline end-to-end
  resetTraceSinkForTests();
  const run = await runStaffCoordinatedPipeline({
    message: "WP-S0 ownership skeleton end-to-end delegation",
  });
  assert(run.ok, "staff coordinator pipeline ok");
  assert(run.mode === "staff-coordinated", "coordinator mode");
  assert(run.metrics.delegated_cleanly, "delegation end-to-end");
  assert(run.metrics.staff_offices_used >= 3, "multiple offices used");
  assert(run.metrics.tasks_assigned >= 4, "tasks assigned");
  assert(
    run.tasks.every((t) => REQUIRED_OFFICES.includes(t.assignee_aio)),
    "tasks only to registered offices"
  );

  const evidence = {
    work_package: "WP-S0",
    sprint: "Sprint 1",
    result: "PASS",
    at: new Date().toISOString(),
    acceptance: {
      instantiate_every_office: true,
      delegation_end_to_end: true,
      no_orphaned_responsibilities: true,
      ownership_validation_passes: true,
    },
    offices: offices.map((o) => ({
      id: o.id,
      facade: o.facade,
      status: o.status,
      mission: o.pack.mission,
    })),
    ownership: {
      modules: MODULE_OWNER,
      responsibilities: RESPONSIBILITY_OWNER,
      report: ownership,
    },
    delegation: {
      tasks_assigned: run.metrics.tasks_assigned,
      distinct_assignees: run.metrics.distinct_assignees,
      staff_offices_used: run.metrics.staff_offices_used,
      delegated_cleanly: run.metrics.delegated_cleanly,
      emission_permitted: run.emissionPermitted,
    },
  };

  const jsonPath = path.join(evidenceDir, "WP-S0-OWNERSHIP.json");
  const mdPath = path.join(evidenceDir, "WP-S0-OWNERSHIP.md");
  writeFileSync(jsonPath, JSON.stringify(evidence, null, 2));
  writeFileSync(
    mdPath,
    `# WP-S0 — Ownership Skeleton Evidence

| Field | Value |
|---|---|
| **Work package** | WP-S0 |
| **Sprint** | Sprint 1 |
| **Result** | **PASS** |
| **At** | ${evidence.at} |
| **Command** | \`npm run atlas:staff:check:s0\` |

## Acceptance criteria

| Criterion | Result |
|---|---|
| Atlas can instantiate every office | PASS (${offices.length}/5) |
| Delegation works end-to-end | PASS (delegated_cleanly=${run.metrics.delegated_cleanly}) |
| No orphaned responsibilities | PASS |
| Ownership validation passes | PASS (VC1) |

## Offices instantiated

${offices.map((o) => `- **${o.id}** → \`${o.facade}\``).join("\n")}

## Delegation snapshot

\`\`\`json
${JSON.stringify(evidence.delegation, null, 2)}
\`\`\`

## Notes

- \`aio.core.program\` (AIF-PROGRAM) owned by **AIO-CORE** — not a sixth AIO.
- Loader untouched; \`FOUNDER_VISIBLE\` unchanged by this WP.
`
  );

  console.log("PASS: WP-S0 Ownership Skeleton");
  console.log(JSON.stringify(evidence.acceptance, null, 2));
  console.log(`Evidence: ${mdPath}`);
}

main().catch((err) => {
  console.error("FAIL: WP-S0 Ownership Skeleton");
  console.error(err);
  process.exit(1);
});
