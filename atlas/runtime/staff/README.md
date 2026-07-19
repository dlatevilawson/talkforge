# Atlas Internal Staff (living organization)

**Contracts:** ATLAS-P5 · ATLAS-P6 · ATLAS-ENG-PROGRAM  
**Plane:** Target runtime only · Loader frozen · FOUNDER_VISIBLE off by default

This directory **is** the organization — executable AIO offices, not a document shelf.

| Path | Role |
|---|---|
| `offices/packs.ts` | Operating charter + prompts + standards + metrics per AIO |
| `coordinate.ts` | Coordination layer — Core delegates via `task_assigned` |
| `intel.ts` … `guard.ts` | Office facades over `rt.*` |
| `bus.ts` / `events.ts` | In-process event contracts |
| `program.ts` | AIF-PROGRAM (Program Desk) under Core |
| `metrics.ts` | Delegation effectiveness |
| `check.ts` | `npm run atlas:staff:check` |

```bash
npm run atlas:staff:check:s0   # ENG WP-S0 Ownership Skeleton
npm run atlas:staff:check:s1   # P6-EXEC WP-S1 Office Capability
npm run atlas:staff:check:s2   # P6-EXEC WP-S2 Cross-Office Coordination
npm run atlas:staff:check:s3   # P6-EXEC WP-S3 Authority & Conflict
npm run atlas:staff:check:s4   # P6-EXEC WP-S4 Failure Injection (Founder gate before S5)
npm run atlas:staff:check      # full staff suite
```

**Evidence:** `WP-S0` … `WP-S4-FAILURE.md`  
**Advance rule:** Do not start WP-S5 without Founder approval (ATLAS-P6-EXEC).
