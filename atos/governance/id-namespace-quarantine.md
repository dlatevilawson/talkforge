# ID Namespace Quarantine

| Field | Value |
|---|---|
| **Document ID** | GOV-IDQ |
| **Version** | 1.0.0-m0 |
| **Status** | Draft |
| **Owner** | Founder |
| **AI Steward** | Sentinel |
| **Human Approver** | Founder |
| **Review Cycle** | Until SoT consolidation (M4/ops milestones) |
| **Dependencies** | GOV-REG, RES-001 |
| **Related Documents** | `atlas/bug-log.md`, `atlas/ops/state.json` |
| **Approval History** | 2026-07-18 — M0 Draft |
| **Change Log** | 2026-07-18 — Quarantine colliding BUG-001 identities |

---

## Problem

Two different issues share the identifier **BUG-001**:

| Source | BUG-001 meaning |
|---|---|
| `atlas/bug-log.md` | Continue fails after mission begin (open production observation) |
| `atlas/ops/state.json` | Supabase Auth not connected |

## Quarantine rules (effective immediately)

1. **Do not create** new records using bare `BUG-001` without a namespace.
2. Until consolidation, refer to:
   - `BUG-001-CONTINUE` — Continue / coaching loop observation (`bug-log.md`)
   - `BUG-001-AUTH` — Guest auth / Supabase Auth not connected (`ops/state.json`)
3. **Do not “fix”** either item solely to resolve the ID collision.
4. Permanent ID reassignment and single Incident Register SoT occur when Operations registries are established (post-M2/M4 sequence per RES-001).
5. New incidents use `INC-NNN` (preferred) or a non-colliding `BUG-NNN` after registry SoT exists.

## Interim ownership

| Alias | Steward |
|---|---|
| BUG-001-CONTINUE | Sentinel |
| BUG-001-AUTH | Atlas / Engineering |
