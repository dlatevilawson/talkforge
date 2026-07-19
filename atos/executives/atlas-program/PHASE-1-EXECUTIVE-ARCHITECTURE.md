# Atlas Program — Phase 1 Executive Architecture Contract

| Field | Value |
|---|---|
| **Document ID** | ATLAS-P1 |
| **Version** | 1.0.0 |
| **Status** | Authoritative |
| **Owner** | Founder |
| **AI Steward** | Atlas |
| **Human Approver** | Founder |
| **Review Cycle** | Until Founder-amended |
| **Dependencies** | RES-004, RES-003, ATLAS-P0, SPEC-006, STD-003, STD-002 |
| **Related Documents** | CHARTER-ATLAS, EXEC-COLLAB, RUNTIME-CTX, RUNTIME-MEM, FWS-REPORTS |
| **Approval History** | 2026-07-19 — Founder approved Phase 1 Steps 1–10 |
| **Change Log** | 2026-07-19 — Executive Architecture Contract published |

---

## Ratification

Phase 1 is the binding **Executive Architecture Contract** for Atlas.

| Rule | Statement |
|---|---|
| Infrastructure design | Must satisfy Phase 1 |
| Implementation | Must satisfy Phase 0 and Phase 1 |
| Conflict | Design changes — not Phase 1 — unless Founder amends |

Phase 0 remains the design contract for *what Atlas is*. Phase 1 defines *how Atlas is internally organized*.

---

## 1. Core components (SRP)

| Component | Single responsibility |
|---|---|
| Ingress Gate | Admit/classify legitimate inputs only |
| Authority Guard | Enforce Atlas may/must-not before action |
| Knowledge Reader | Retrieve governed knowledge with authority labels |
| Context Assembler | Assemble smallest sufficient labeled context for the request |
| Situation Monitor | Maintain operational awareness (ops-labeled) |
| Reasoning Engine | Only stage that thinks (STD-003 path) on Context only |
| Recommendation Composer | Package non-binding recommendations / Decision Packs |
| Briefing Composer | Package cadence executive intelligence outputs |
| Coordination Broker | Coordinate executives without becoming them |
| Escalation path | Hard-boundary packages to Founder |
| Memory Classifier | Classify retain / promote-candidate / discard |
| Trace Recorder | Audit trail without silent Canonicalization |
| Integrity Watch | Validation Pipeline hard gate before Founder |

**Forbidden components:** Final Decision Engine · Constitutional Editor · Canonical Publisher · Priority Sovereign · Sentinel Override · Domain Executive Simulator · Knowledge Inventor · Authority Launderer · Independent Sovereign Core.

---

## 2. Information flow

```text
Request → Authority → Knowledge → Context → Reasoning → Recommendation → Validation → Founder → Audit
```

Principles: one entry; authority before reasoning; labeled governed knowledge; request-relevant context; no raw-memory reasoning; recommendations not decisions; full source traceability; integrity check before Founder; Founder decides; audit without silent institutional promotion.

---

## 3. Reasoning architecture

Reasoning Engine only after Context lock. STD-003 pipeline; alternatives required; Sentinel findings preserved; missing info → insufficient/conditional/escalate; confidence ≠ authority; escalation is a hard boundary.

---

## 4. Recommendation composition

STD-003 fields mandatory; non-binding language; types include Standard, Decision Pack, Priority Proposal, Coordination, Escalation Package, Insufficient-Knowledge Notice, Cadence Brief embedding; full claim→evidence→source→label traceability; no direct Founder publish (must Validate).

---

## 5. Validation pipeline

Integrity Watch stages V1–V8: Structure · Authority · Knowledge · Evidence/Trace · Reasoning fidelity · Collaboration · Escalation compliance · Output posture.  
Gate: PASS | RETURN | ESCALATE | STOP. No urgency bypass.

---

## 6. Executive interfaces

Atlas ↔ Founder / Sentinel / Product / Growth / Marketing / Finance / Customer / future executives via Request · Report · Delegation · Coordination · Escalation · Boundary. Coordinate, don’t absorb. EXEC-COLLAB conflict path.

---

## 7. Memory architecture

Working · Session · Operational · Institutional · Temporary reasoning · Scratchpad · Promotion candidates · Audit memory.  
Classify before store. Reasoning never reads raw memory — recall only via Knowledge → Context.

---

## 8. Knowledge architecture

Consume with labels: Authoritative → Canonical → Operational → Legacy → Draft → Proposal; Scaffold excluded as institutional. Prefer higher tier; contradictions surfaced; promotion via STD-002 only.

---

## 9. Executive reporting

Daily Brief · Weekly Review · Decision Pack · Priority Proposal · Risk · Opportunity · Project Summary · Escalation · Coordination notes · Dashboard intelligence contract · Quarterly support. Incident briefs remain Sentinel-owned.

---

## 10. Failure architecture

Detect/contain/correct authority, knowledge, reasoning, context, memory, reporting, escalation, and collaboration failures. Recovery: Stop → Surface → Contain → Correct → Learn through governance.

---

## Success tests

1. Flow always describable as Request → Authority → Knowledge → Context → Reasoning → Recommendation → Validation → Founder → Audit.  
2. Founder: “I decided better because of Atlas” and “Atlas never decided for me.”  

---

## Deferred note

Standalone deep Context-selection algorithm addendum remains optional before implementation if Founder requests it; Steps 2 and 8 define governing context/knowledge rules.
