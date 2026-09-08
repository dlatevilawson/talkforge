# IV-PROD-009 — First-user Assistant Coach journey (pre-account value)

| Field | Value |
|---|---|
| **ID** | IV-PROD-009 |
| **Title** | First-user Assistant Coach journey (pre-account value) |
| **Category** | Product Ideas |
| **Status** | Archived |
| **Importance** | Critical |
| **Owner** | Founder |
| **Last Updated** | 2026-09-07 |
| **Captured** | 2026-08-16 |
| **AI Steward** | Atlas |

---

## Statement

Visitors should experience Assistant Coach and receive a meaningful understanding moment before creating an account. Authentication attaches ownership and persistence to an already-started understanding session — it does not gate first value. Forge remains coaching-only and receives a validated Living Profile / handoff context after Assistant Coach is ready.

**Historical status:** Decision 060 supersedes this journey’s active mechanics. The controlling final approach is [IV-PROD-010](IV-PROD-010-single-session-coach-preview.md): a seven-topic `/coach` card grid enters one anonymous private Forge preview, followed by optional auth claim. This entry remains intact as the Working Knowledge record behind Decision 059.

---

## Why it matters

Account-first gating (current shipping truth) conflicts with “feel understood before you commit.” Pre-account Assistant Coach + claim-on-signup is the conversion architecture that protects continuity without collapsing Assistant Coach into Assessment or Forge.

---

## Relationships

| Direction | Ideas |
|---|---|
| **Depends on** | IV-PROD-001 · IV-PROD-004 · IV-AI-001 · Assistant Coach Phases 1–3 (lib) |
| **Supports** | IV-PROD-007 · IV-PROD-008 · IV-FUT-004 |
| **Related** | IV-PROD-005 · IV-PROD-010 · AUTH-001 · HARDEN-005 · OWN-001 · FREEZE-001 · Decision 059 · Decision 060 |
| **Conflicts (shipping)** | Superseded by Decision 060 final Coach approach; retained historically |

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
| Blind spot review | Historical Decision 059 review; active approach uses BS-015 |
| Roadmap link | Historical architecture superseded by Decision 060 / IV-PROD-010 |
| Priority | Archived — do not implement |

---

## Notes

Working Knowledge historical record. Decision 059 authorized this track, but Decision 060 supersedes its journey mechanics. Do not implement the conversational discovery, provisional LP, semantic gate, claim-before-Forge, confirmation, or second-Forge handoff from this entry.

Founder-directed opening refinement (2026-09-05): Coach opens with “What conversation are you preparing for?” and optional starters for Interview, Salary negotiation, Difficult feedback, Setting a boundary, or custom input. Starter context supplies concise composer guidance and survives session restore. Coach does not paraphrase the member’s opening; it moves directly to one useful discovery question. This orients discovery toward a real communication moment without turning Coach into Forge rehearsal.
