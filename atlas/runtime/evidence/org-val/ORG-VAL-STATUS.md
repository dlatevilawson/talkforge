# ORG-VAL — Stage Rollup (Program Desk)

| Field | Value |
|---|---|
| **Last updated** | 2026-07-19 |
| **Updated by** | AIF-PROGRAM / Atlas |
| **Program** | ATLAS-ORG-VAL · ATLAS-P6 |

| Stage | Result | Evidence |
|---|---|---|
| 1 Structural | **PASS WITH FINDINGS** | [ORG-VAL-S1-STRUCTURE.md](ORG-VAL-S1-STRUCTURE.md) |
| 2 Integration | **PARTIAL PASS** | [ORG-VAL-S2-INTEGRATION.md](ORG-VAL-S2-INTEGRATION.md) |
| 3 Automation | **PARTIAL** | Event bus + Guard gate + rollback fail-closed in `atlas:staff:check` |
| 4 Failure injection | **PARTIAL** | Missing Guard emission block; Risk Notice mutate; Sentinel impersonation |
| 5 Team effectiveness | **PARTIAL** (avg 1.71) | [ORG-VAL-S5-TEAM.md](ORG-VAL-S5-TEAM.md) |
| 6 Operational stress | PENDING | — |
| 7 ORR / Certification | **Not issued / Not certified** | Strategic expansion blocked until Founder Decision |

**Command:** `npm run atlas:staff:check`
