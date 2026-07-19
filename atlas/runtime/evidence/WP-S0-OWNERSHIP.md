# WP-S0 — Ownership Skeleton Evidence

| Field | Value |
|---|---|
| **Work package** | WP-S0 |
| **Sprint** | Sprint 1 |
| **Result** | **PASS** |
| **At** | 2026-07-19T14:16:30.388Z |
| **Command** | `npm run atlas:staff:check:s0` |

## Acceptance criteria

| Criterion | Result |
|---|---|
| Atlas can instantiate every office | PASS (5/5) |
| Delegation works end-to-end | PASS (delegated_cleanly=true) |
| No orphaned responsibilities | PASS |
| Ownership validation passes | PASS (VC1) |

## Offices instantiated

- **AIO-CORE** → `atlas/runtime/staff/core.ts`
- **AIO-INTEL** → `atlas/runtime/staff/intel.ts`
- **AIO-COUNSEL** → `atlas/runtime/staff/counsel.ts`
- **AIO-BROKER** → `atlas/runtime/staff/broker.ts`
- **AIO-GUARD** → `atlas/runtime/staff/guard.ts`

## Delegation snapshot

```json
{
  "tasks_assigned": 5,
  "distinct_assignees": [
    "AIO-CORE",
    "AIO-BROKER",
    "AIO-INTEL",
    "AIO-COUNSEL",
    "AIO-GUARD"
  ],
  "staff_offices_used": 4,
  "delegated_cleanly": true,
  "emission_permitted": true
}
```

## Notes

- `aio.core.program` (AIF-PROGRAM) owned by **AIO-CORE** — not a sixth AIO.
- Loader untouched; `FOUNDER_VISIBLE` unchanged by this WP.
