# Founder Workspace ↔ Product Surface Mapping

| Field | Value |
|---|---|
| **Document ID** | FWS-SURFACE |
| **Version** | 1.0.0-m7 |
| **Status** | Draft |
| **Owner** | Founder |
| **AI Steward** | Atlas |
| **Human Approver** | Founder |
| **Review Cycle** | Until UI cutover |
| **Dependencies** | FWS-DASH, GOV-COMPAT, RUNTIME-LEGACY |
| **Related Documents** | app/atlas/FounderOS.tsx, atlas/engine/ops.ts |
| **Approval History** | 2026-07-18 — M7 Draft |
| **Change Log** | 2026-07-18 — Map existing Founder OS to ATOS workspace contract |

---

## Purpose

Relate the existing product Founder OS (`/atlas`, dev nav) to the ATOS Founder Workspace information contract — **without** requiring a large product redesign in M7.

## Mapping

| FWS panel (contract) | Current product surface | Gap |
|---|---|---|
| Mission & today | `todayMission` / sprint in ops snapshot | Authority labels missing |
| Active projects | Priorities + milestone in `ops/state.json` | Not REG-PROJ-native |
| Risks & incidents | Bugs panel | BUG-001 ID collision (GOV-IDQ) |
| Decisions needed | Implicit via Ask Atlas / notes | No formal decision pack queue UI |
| ATOS milestone status | Not shown | **Gap** — add when UI evolves |
| Knowledge / promotion | Not shown | **Gap** |
| Executive health | Company/product health metrics | Not REG-EXEC |
| Notes & ideas | FounderNotesPanel + briefs | Operational OK |

## Rules

1. M7 does not mandate UI rewrite (documentation contract only).  
2. Future UI work should close gaps toward FWS-DASH.  
3. Product surface remains operational/legacy until Founder-gated ATOS binding.  
