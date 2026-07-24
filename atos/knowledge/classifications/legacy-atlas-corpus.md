# Classification — Legacy Atlas Corpus

| Field | Value |
|---|---|
| **Document ID** | KNOW-CLASS-LEGACY |
| **Version** | 1.0.0-m4 |
| **Status** | Draft |
| **Owner** | Founder |
| **AI Steward** | Atlas |
| **Human Approver** | Founder |
| **Review Cycle** | Until cutover complete |
| **Dependencies** | GOV-KNOW, GOV-COMPAT, SPEC-003 |
| **Related Documents** | atlas/engine/loader.ts, REG-KNOW |
| **Approval History** | 2026-07-18 — M4 classification record |
| **Change Log** | 2026-07-18 — Initial classification of Ask Atlas load set |

---

## Purpose

Classify the pre-ATOS Ask Atlas corpus without promoting it to ATOS Canonical.

**Plane:** PLANE-LEGACY-ATLAS (`atlas/`) — legacy-live until Founder-gated cutover.

## Classification legend

| Class | Meaning |
|---|---|
| Identity Candidate | Maps toward SPEC-002 / foundational refs; promotion required for ATOS Canonical |
| Institutional Candidate | Strong candidate for Canonical after KPS |
| Operational | Live ops knowledge; remains operational until promoted |
| Working | In flux; not promotion-ready |
| Engineering Doctrine | Process knowledge (e.g., TEP); reconcile with Standards before Canonical |
| Archive Candidate | Retain historically; do not treat as current law |

## Load set (frozen)

| File | Classification | Confidence | Promotion posture | Notes |
|---|---|---|---|---|
| `atlas/constitution.md` | Identity Candidate | Verified (legacy) | Promotion Candidate | Do not dual-publish until Identity mapping approved |
| `atlas/founder-brief.md` | Identity Candidate | Verified (legacy) | Promotion Candidate | Maps toward REF-R001 |
| `atlas/forge-laws.md` | Identity Candidate | Verified (legacy) | Promotion Candidate | Maps toward REF-R005 |
| `atlas/philosophy.md` | Identity Candidate | Verified (legacy) | Promotion Candidate | Maps toward REF-R004 |
| `atlas/projects.md` | Operational | Investigated | Keep operational | Indexed via REG-PROJ; SoT consolidation later |
| `atlas/decisions.md` | Operational / Institutional Candidate | Investigated | Promotion Candidate (selective) | Narrative decisions ≠ ADS ADR schema |
| `atlas/roadmap.md` | Operational | Investigated | Keep operational | |
| `atlas/metrics.md` | Operational | Investigated | Keep operational | |
| `atlas/engineering-protocol.md` | Engineering Doctrine | Verified (legacy) | Promotion Candidate | Reconcile with STD-005 / MAN-009 before Canonical |
| `atlas/bug-log.md` | Operational | Investigated | Keep operational | Use BUG-001-CONTINUE alias (GOV-IDQ) |

## Non-load operational artifacts

| File | Classification | Notes |
|---|---|---|
| `atlas/ops/state.json` | Operational | Founder OS live state; BUG-001-AUTH alias |
| `atlas/projects.json` | Quarantined stub | Empty; not authoritative |
| `atlas/decisions.json` | Quarantined stub | Empty; not authoritative |

## Rules

1. Classification ≠ Canonical publication.
2. No file in this table is ATOS Canonical solely by appearing here.
3. Promotion requires REF-R1110 + queue entry + STD-002 stages + Founder institutional approval for Canonical.
4. Ask Atlas continues loading the frozen set until cutover approval.
