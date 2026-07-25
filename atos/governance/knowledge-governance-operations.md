# ATOS Knowledge Governance Operations

| Field | Value |
|---|---|
| **Document ID** | GOV-KNOW |
| **Version** | 1.0.0-m4 |
| **Status** | Draft |
| **Owner** | Founder |
| **AI Steward** | Atlas |
| **Human Approver** | Founder |
| **Review Cycle** | Each milestone |
| **Dependencies** | SPEC-003, STD-002, GOV-AUTH, GOV-COMPAT, RES-001 |
| **Related Documents** | REG-KNOW, REF-R1110, atos/knowledge/* |
| **Approval History** | 2026-07-18 — M4 Draft |
| **Change Log** | 2026-07-18 — Knowledge governance operations for ATOS v1.0 |

---

## Purpose

Defines how TalkForge runs Knowledge Governance day to day: classification, promotion, canonical authority, and historical preservation — without bypassing Spec 003 / STD-002.

## Canonical authority rule

1. **ATOS Canonical** knowledge is only that which:
   - has completed the promotion pipeline, **or**
   - is an `Authoritative` Specification/Standard/Resolution, **or**
   - is Identity knowledge ratified by the Founder into ATOS Canonical publication.
2. **`Draft` / `Scaffold` ATOS documents are not Canonical.**
3. **Legacy `atlas/` corpus** remains the Ask Atlas live plane until Founder-gated cutover (GOV-COMPAT). It is **not** automatically ATOS Canonical.
4. Each knowledge domain has **exactly one** ATOS Canonical source. Duplicates are prohibited.
5. No executive (including Atlas/Sentinel/CIO) may independently create institutional knowledge.

## Knowledge locations (M4)

| Store | Path | Holds |
|---|---|---|
| Working | `atos/knowledge/working/` | In-progress knowledge |
| Evidence | `atos/knowledge/evidence/` | Evidence packs for promotion |
| Promotion Queue | `atos/knowledge/promotion/queue.yaml` | Items awaiting review/approval |
| Canonical | `atos/knowledge/canonical/` | ATOS Canonical publications |
| Archive | `atos/knowledge/archive/` | Superseded/historical knowledge |
| Classifications | `atos/knowledge/classifications/` | Plane/classification records |

## Promotion pipeline (STD-002)

1. Observation  
2. Investigation  
3. Evidence Collection  
4. Evidence Review  
5. Recommendation  
6. Executive Review  
7. Institutional Approval (**Founder** for institutional/canonical)  
8. Canonical Publication  
9. Historical Preservation  

**No stage skipping.** Use template `REF-R1110` for promotion requests.

## Confidence levels

Observation → Hypothesis → Investigated → Verified → Canonical → Superseded → Archived

Confidence communicates certainty; **Status/Authority** communicates governance power.

## Classification of legacy corpus

All pre-ATOS `atlas/*.md` files loaded by Ask Atlas are classified in:

`atos/knowledge/classifications/legacy-atlas-corpus.md`

Classifications are **Working / Operational / Promotion Candidate / Archive Candidate**. They do not auto-promote.

## Runtime / AI rules (until Founder cutover)

1. Ask Atlas loader file list remains frozen (GOV-COMPAT).
2. Context Injectors (future M5) must exclude Scaffold and unapproved Draft from Canonical context.
3. Sandbox outputs are proposals only.
4. Memory Keeper (future) may enqueue promotion candidates; it may not publish Canonical knowledge.

## Historical archive

When Canonical knowledge is superseded:

1. Set confidence/status to Superseded.
2. Move or copy prior Canonical version into `atos/knowledge/archive/` (and/or `atos/history/` for constitutional docs).
3. Update REG-KNOW and REG-DOC in the same change set.
4. Preserve lineage (prior version ID + supersession note).
