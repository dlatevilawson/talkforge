# DEP-MAP-001 — Dependency Map

| Field | Value |
|---|---|
| **Document ID** | DEP-MAP-001 |
| **Version** | 1.0.0 |
| **Status** | **Complete — EXEC-001 Step 10** |
| **Updated** | 2026-08-02 |

---

## Purpose

Determine what must exist before something else can be built.

---

## Primary chain (Founder example — confirmed)

```
Living Profile (IV-PROD-004)
  → Readiness Engine (IV-FEAT-001)
    → Adaptive Homepage (IV-FEAT-004)
      → Personalized Coaching / Missions (IV-FEAT-002 · IV-UX-001)
```

---

## System layers

```
CONST-001 + Forge Laws
  → POM / SYS1 Truth
    → Living Profile + Provenance + Conversation Lifecycle
      → SYS2 Judgment (Readiness · Pedagogy · Recommendation)
        → Adaptive Experience (Homepage)
          → Conversation Engine practice loops
            → Reflection · Scoring · Transfer measurement
```

---

## Dependency table

| Item | Depends on | Blocks |
|---|---|---|
| Provenance / Evidence (IV-FEAT-006) | Laws #014–#016 | Trusted Living Profile |
| Living Profile (IV-PROD-004) | POM · Provenance · LP-LAW | Readiness · Unified UI |
| Personal Principles (IV-FEAT-008) | Living Profile · Purpose Autonomy | Judgment quality |
| Season model (IV-FEAT-009) | Living Profile | Readiness relevance |
| Conversation lifecycle (IV-FEAT-005) | Living Profile / SYS1 | Readiness targets |
| Readiness Engine (IV-FEAT-001) | Living Profile · lifecycle · seasons | Recommendation · Homepage |
| Pedagogy Engine (IV-FEAT-003) | Readiness (What) | Modality variety |
| Recommendation Engine (IV-FEAT-002) | Readiness · Pedagogy · S2-LAW-001 | Homepage mission packet |
| Mission fields (IV-AI-005) | Reco + Pedagogy | Homepage render |
| Adaptive Homepage (IV-FEAT-004) | Reco · Mission fields · LP | One-mission UX |
| Reflection before score (IV-FEAT-007) | Conversation completion | Trustworthy scoring |
| Persona simulations (IV-FUT-001) | CE maturity · lifecycle | Parked |
| Voice at scale (IV-FUT-002) | CE-001 + BR-001 | Parked |
| Discovery surface (IV-FUT-004) | Trusted one-mission homepage | Parked |

---

## Build order (Phase 3)

1. **System 1** — Living Profile, Memory, Evidence/Provenance, Understanding, Reflection hooks, Conversation Lifecycle  
2. **System 2** — Readiness, Recommendation, Pedagogy, Personalization, Adaptive Homepage  
3. **Conversation Engine** — Simulations, Personas, Voice, Interruptions, Memory, Scoring  
4. **UX surfaces** — Homepage, Missions, Progress, Canvas, Moments, Timeline, Discovery, Coach  
5. **User Testing** — then Iterate

## Deliverable

- [x] Dependency map published
- [x] Phase 3 build order locked to map
