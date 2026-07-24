# KA-REORG-001 — Knowledge Reorganization Evidence

| Field | Value |
|---|---|
| **Document ID** | KA-REORG-001 |
| **Version** | 1.0.0 |
| **Status** | **Complete** |
| **Authority** | RES-020 / KA-001 §10 |
| **Owner** | Founder |
| **AI Steward** | Atlas |
| **Human Approver** | Founder (via RES-020 authorization) |
| **Dependencies** | KA-001, RES-020, GOV-COMPAT, REG-KNOW |
| **Related Documents** | LOAD-MANIFEST, KA-PAUSE-001, KNOW-CANONICAL |
| **Approval History** | 2026-07-24 — Authorized by RES-020; executed same day |
| **Change Log** | 2026-07-24 — Pointer-based domain homes; registries; question ledger; load manifest |

---

## Method (safe reorg)

**Certified pointers, not file moves** for Identity and live Ask Atlas corpus.

- Live Identity remains under `atlas/` (GOV-COMPAT / loader freeze).  
- Product doctrine remains under `atos/product/` (execution + Accepted sources).  
- Domain homes under `atos/knowledge/canonical/*` are **indexes** that name the one source per domain.  
- No unilateral Ask Atlas loader cutover.

---

## Phase completion

| Phase | Status | Evidence |
|---|---|---|
| **A — Freeze creation** | Complete (superseded by post-reorg pause rules) | No new foundations created during reorg |
| **B — Domain homes** | **Complete** | `identity/`, `product/`, `experience/`, `dignity/`, `craft/`, `engine/`, `gates/`, `ops/` indexes |
| **C — Registry truth** | **Complete** | REG-KNOW updated; KNOW-CANONICAL labeling clarified |
| **D — Agent load manifest** | **Complete** | [`../knowledge/LOAD-MANIFEST.md`](../knowledge/LOAD-MANIFEST.md) |
| **E — Resume framework work** | **Conditional** | Allowed only under KA domain mapping rules (KA-PAUSE-001 v1.1) |

---

## Deliverables

| Deliverable | Path |
|---|---|
| Domain indexes | `atos/knowledge/canonical/{identity,product,experience,dignity,craft,engine,gates,ops}/` |
| Canonical README | `atos/knowledge/canonical/README.md` |
| Question ledger (D-Q) | `atos/knowledge/working/questions.md` |
| Evidence index | `atos/knowledge/evidence/index/README.md` |
| Load manifest | `atos/knowledge/LOAD-MANIFEST.md` |
| REG-KNOW update | `atos/registries/knowledge-registry.yaml` |

---

## Explicit non-changes

1. Ask Atlas loader freeze — **unchanged** (needs Founder Decision).  
2. ATOS Specs / Standards — **not amended**.  
3. Identity file locations under `atlas/` — **not moved**.  
4. Product Canonical full-text locations — **not duplicated**.

---

## Status Upon Signature

| Field | Value |
|---|---|
| **Status Upon Signature** | **Complete** — reorganization recorded; pause lifts only under domain-mapping rules |
