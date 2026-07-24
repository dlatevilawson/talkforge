# Founder Executive Dashboard

| Field | Value |
|---|---|
| **Document ID** | FWS-DASH |
| **Version** | 1.0.0-m7 |
| **Status** | Draft |
| **Owner** | Founder |
| **AI Steward** | Atlas |
| **Human Approver** | Founder |
| **Review Cycle** | Each milestone |
| **Dependencies** | FWS-ROOT, REG-PROJ, REG-EXEC, REG-KNOW, RUNTIME-CTX |
| **Related Documents** | product-surface.md, MAN-002 |
| **Approval History** | 2026-07-18 — M7 Draft |
| **Change Log** | 2026-07-18 — Dashboard IA for Founder Workspace |

---

## Purpose

Define what the Founder must see to lead — not a product redesign. The dashboard is an information contract; UI may evolve under Atlas/Sentinel without changing this contract without Founder approval.

## Required panels (information contract)

| Panel | Source of truth | Purpose |
|---|---|---|
| Mission & today | Identity + ops priorities | Stay mission-aligned |
| Active projects | REG-PROJ (+ legacy ops until SoT merge) | Progress vs priority |
| Risks & incidents | Ops / bug registers (GOV-IDQ aliases) | See danger early |
| Decisions needed | Atlas recommendations / ADR queue | Founder action items |
| ATOS milestone status | REG-ATOS / milestone records | Governance delivery |
| Knowledge / promotion | REG-PROMO-Q | Institutional pipeline |
| Executive health | REG-EXEC + Atlas/Sentinel reports | Delegation working? |
| Notes & ideas | Founder notes (product) + journal (R901) | Capture without Canonicalizing |

## Rules

1. Panels must label authority (`legacy-atlas`, `operational`, `draft`, `authoritative`).
2. Draft Specs are not shown as law.
3. Dashboard does not create Canonical knowledge.
4. Atlas prepares; Founder decides.
