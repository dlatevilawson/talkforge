# Pre-ATOS Compatibility Contract (`atlas/`)

| Field | Value |
|---|---|
| **Document ID** | GOV-COMPAT |
| **Version** | 1.0.0-m0 |
| **Status** | Draft |
| **Owner** | Founder |
| **AI Steward** | Atlas |
| **Human Approver** | Founder |
| **Review Cycle** | Until cutover complete |
| **Dependencies** | ADR-0001, GOV-AUTH |
| **Related Documents** | `atlas/engine/loader.ts`, RES-001, GOV-KNOW, KNOW-CLASS-LEGACY |
| **Approval History** | 2026-07-18 — M0 Draft |
| **Change Log** | 2026-07-18 — Freeze live Ask Atlas corpus; 2026-07-18 — M4 classification cross-link |

---

## Purpose

Prevent dual-authority damage while ATOS is implemented beside the existing Atlas corpus.

## Live plane (current)

Ask Atlas loads **only** these files via `atlas/engine/loader.ts`:

- `constitution.md`
- `founder-brief.md`
- `forge-laws.md`
- `philosophy.md`
- `projects.md`
- `decisions.md`
- `roadmap.md`
- `metrics.md`
- `engineering-protocol.md`
- `bug-log.md`

Founder OS additionally uses `atlas/ops/state.json`, Supabase founder tables, and GitHub — separate from Ask Atlas context.

## M0 rules

1. **Do not change** `loadAtlasContext()` file list in M0.
2. **Do not delete or rename** the ten loaded markdown files in M0.
3. **Do not** point Ask Atlas at `/atos/` until Context Injector policy + Founder-gated cutover.
4. ATOS documents may **reference** pre-ATOS files as legacy sources.
5. Promotion of legacy content into ATOS Canonical knowledge is an **M4+** concern.

## Cutover (future; Founder-gated)

Cutover requires:

1. Authoritative Identity/Knowledge Specs.
2. Classification of each legacy file (Canonical candidate / Operational / Archive).
3. Context Injector respecting Authority States.
4. Explicit Founder approval of loader change.
