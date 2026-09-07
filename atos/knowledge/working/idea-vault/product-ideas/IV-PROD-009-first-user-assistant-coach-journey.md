# IV-PROD-009 — First-user Coach journey (deterministic cards → auth → Forge)

| Field | Value |
|---|---|
| **ID** | IV-PROD-009 |
| **Title** | First-user Coach journey (deterministic cards → auth → Forge) |
| **Category** | Product Ideas |
| **Status** | In Development |
| **Importance** | Critical |
| **Owner** | Founder |
| **Last Updated** | 2026-09-07 |
| **Captured** | 2026-08-16 |
| **AI Steward** | Atlas |

---

## Statement

Visitors move through “Pick your moments,” “Narrow the context,” and a deterministic Living Profile verification card. The signed anonymous session may retain provisional topic/audience/pattern/urgency choices, but **Looks right** requires authentication for guests before activating one `member_practice_profile` JSONB field inside the Living Profile and entering contextual Forge. The first-user path does not use an LLM, desired-outcome question, or semantic value gate.

---

## Why it matters

The fixed catalogs and deterministic verification card give visitors a concrete, low-load way to define practice without making conversion depend on model behavior. Authentication protects ownership and persistence before training, while Phase 3 verification avoids asking the same questions again after signup.

---

## Relationships

| Direction | Ideas |
|---|---|
| **Depends on** | IV-PROD-004 · IV-LAW-004 · IV-LAW-007 · IV-UX-011 |
| **Supports** | IV-PROD-007 · IV-PROD-008 · IV-FUT-004 |
| **Related** | IV-PROD-005 · AUTH-001 · HARDEN-005 · OWN-001 · FREEZE-001 · Decision 059 · Decision 060 |

---

## Evidence

| Field | Value |
|---|---|
| **Why we believe this** | Formal Founder direction A supersedes conversational discovery/value-gate design with deterministic cards and authentication before Forge. |
| **Sources** | Founder Decision 060 · AC-JOURNEY-001 · BS-018 |
| **Confidence** | High (Founder decided) |

---

## Downstream

| Field | Value |
|---|---|
| Blind spot review | [BS-018](../../blind-spot-register/bs-018.md) |
| Roadmap link | Spec: [AC-JOURNEY-001](../../../product/AC-JOURNEY-001-first-user-architecture.md) · Sequence: [PHASE4B-AC](../../../product/PHASE4B-AC-IMPLEMENTATION-SEQUENCE.md) |
| Priority | Critical — governance pivot authorized by Decision 060 |

---

## Notes

Working Knowledge. Decision 059 remains the historical authorization for the Assistant Coach track. Decision 060 supersedes its pre-account conversational discovery, semantic-value gate, claim, confirmation, and soft-verification direction. Phase 1 selects 1–3 exact topic cards; Phase 2 selects audiences, one pattern, and one urgency; Phase 3 deterministically verifies focus areas, selected-pattern template, and an initial Forge target from first topic + first audience. Only “Something else” may reveal bounded custom text. Retain the signed HttpOnly anonymous session and 14-day TTL only for provisional wizard continuity; do not revive guests. After **Looks right**, guests authenticate and members activate declarations into the Living Profile’s `member_practice_profile`; then route directly to contextual Forge without duplicate post-auth confirmation. Assessment remains available but demoted from default FTUE.
