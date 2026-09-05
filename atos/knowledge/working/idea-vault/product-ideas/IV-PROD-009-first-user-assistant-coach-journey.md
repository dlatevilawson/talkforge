# IV-PROD-009 — First-user Assistant Coach journey (pre-account value)

| Field | Value |
|---|---|
| **ID** | IV-PROD-009 |
| **Title** | First-user Assistant Coach journey (pre-account value) |
| **Category** | Product Ideas |
| **Status** | Building |
| **Importance** | Critical |
| **Owner** | Founder |
| **Last Updated** | 2026-09-05 |
| **Captured** | 2026-08-16 |
| **AI Steward** | Atlas |

---

## Statement

Visitors should experience Assistant Coach and receive a meaningful understanding moment before creating an account. Authentication attaches ownership and persistence to an already-started understanding session — it does not gate first value. Forge remains coaching-only and receives a validated Living Profile / handoff context after Assistant Coach is ready.

---

## Why it matters

Account-first gating (current shipping truth) conflicts with “feel understood before you commit.” Pre-account Assistant Coach + claim-on-signup is the conversion architecture that protects continuity without collapsing Assistant Coach into Assessment or Forge.

---

## Relationships

| Direction | Ideas |
|---|---|
| **Depends on** | IV-PROD-001 · IV-PROD-004 · IV-AI-001 · Assistant Coach Phases 1–3 (lib) |
| **Supports** | IV-PROD-007 · IV-PROD-008 · IV-FUT-004 |
| **Related** | IV-PROD-005 · AUTH-001 · HARDEN-005 · OWN-001 · FREEZE-001 · Decision 059 |
| **Conflicts (shipping)** | Account-first proxy gates · guest retirement · Assessment-as-FTUE — **resolved by Decision 059 / Phase 4B** |

---

## Evidence

| Field | Value |
|---|---|
| **Why we believe this** | Founder OD-0…OD-10 (Decision 059); conversion best practice is value-before-auth when continuity can be claimed safely. |
| **Sources** | Founder Decision 059 · Phase 4A architecture audit · AC-JOURNEY-001 |
| **Confidence** | High (Founder decided) |

---

## Downstream

| Field | Value |
|---|---|
| Blind spot review | Covered in Decision 059 + AC-JOURNEY-001; revisit after first prod slices |
| Roadmap link | Spec: [AC-JOURNEY-001](../../../product/AC-JOURNEY-001-first-user-architecture.md) · Sequence: [PHASE4B-AC](../../../product/PHASE4B-AC-IMPLEMENTATION-SEQUENCE.md) |
| Priority | Critical — next code slice **4B.1** |

---

## Notes

Working Knowledge. Implementation authorized by Decision 059 for this track only. Phase 4B ships in small slices — not one monster change. Gate copy deferred (OD-10). Turn safety cap ≠ conversion gate.

Founder-directed opening refinement (2026-09-05): Coach opens with “What conversation are you preparing for?” and optional starters for Interview, Salary negotiation, Difficult feedback, Setting a boundary, or custom input. This orients discovery toward a real communication moment without turning Coach into Forge rehearsal.
