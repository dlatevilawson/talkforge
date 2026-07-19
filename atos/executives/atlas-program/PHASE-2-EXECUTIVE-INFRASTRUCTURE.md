# Atlas Program — Phase 2 Executive Infrastructure Design

| Field | Value |
|---|---|
| **Document ID** | ATLAS-P2 |
| **Version** | 0.1.0-draft |
| **Status** | Draft |
| **Owner** | Founder |
| **AI Steward** | Atlas |
| **Human Approver** | Founder |
| **Review Cycle** | Each Phase 2 step |
| **Dependencies** | ATLAS-P0, ATLAS-P1, RES-003, RES-004 |
| **Related Documents** | SPEC-005, STD-006, RUNTIME-IFACE, GOV-MAINT-1.0.0 |
| **Approval History** | 2026-07-19 — Phase 2 opened after Phase 1 approval |
| **Change Log** | 2026-07-19 — Phase 2 package opened; Step 1 principles recorded |

---

## Purpose

Phase 2 designs the **Executive Infrastructure** that realizes ATLAS-P1 — still design, not production implementation.

**Must satisfy:** Phase 0 · Phase 1 · ATOS · Specs/Standards applicable · Maintenance Mode (build on ATOS, not rewrite ATOS).

**Must not:** Write production code · Design product UI · Change ATOS Specs/Standards · Redefine Phase 0 or Phase 1.

---

## Phase 2 step sequence

| Step | Focus | Status |
|---|---|---|
| 1 | Infrastructure principles & constraints | In progress |
| 2 | Component infrastructure map | Pending |
| 3 | Inter-component contracts | Pending |
| 4 | Knowledge & context infrastructure | Pending |
| 5 | Memory & audit infrastructure | Pending |
| 6 | Reasoning → recommendation → validation pipeline infrastructure | Pending |
| 7 | Executive interface infrastructure | Pending |
| 8 | Reporting infrastructure | Pending |
| 9 | Failure & recovery infrastructure | Pending |
| 10 | Infrastructure design validation & Founder ratification request | Pending |

Every step ends with: **Step X complete. Awaiting Founder review.**

---

## Step 1 — Infrastructure principles & constraints (discovery)

### Verified constraints (from ATLAS-P0 / P1 / ATOS)

1. Infrastructure exists to serve the Phase 1 flow — it may not invent new authority.  
2. One logical ingress; authority before knowledge/context/reasoning.  
3. No raw-memory reasoning path.  
4. Validation hard gate before Founder-visible output.  
5. Audit must not silently Canonicalize.  
6. Atlas infrastructure must not become Sentinel, Founder, or domain executives.  
7. ATOS Program CLOSED / Maintenance Mode — infrastructure is Atlas Program work **on** ATOS.  
8. Hub / Context Injector / Memory Keeper production cutover remains Founder-gated (SPEC-005 / GOV-COMPAT).  

### Proposed infrastructure principles

| Principle | Meaning |
|---|---|
| **P-Flow** | Every execution path must be expressible as Request → Authority → Knowledge → Context → Reasoning → Recommendation → Validation → Founder → Audit |
| **P-Stage-Isolation** | Stages do not absorb each other’s SRP |
| **P-Label-Transport** | Authority labels survive every hop; never upgrade silently |
| **P-Fail-Closed** | On authority/knowledge/validation failure, deny PASS — do not soften |
| **P-Founder-Final** | No infrastructure shortcut grants binding decisions |
| **P-Trace-Always** | Material interactions leave audit records |
| **P-Promote-Only-by-Governance** | Persistence ≠ Canonical |
| **P-Minimal-Surface** | Smallest sufficient interfaces between components |
| **P-No-Impl-Leak** | Phase 2 specifies contracts and responsibilities, not production code or UI |
| **P-Conflict-Rule** | If infrastructure conflicts with P0/P1, change infrastructure |

### Infrastructure planes (proposed logical, not deployment)

| Plane | Holds |
|---|---|
| Control plane | Ingress, Authority Guard, Escalation, Integrity Watch |
| Knowledge plane | Knowledge Reader access to governed sources + labels |
| Context plane | Context Assembler session for a request |
| Cognition plane | Reasoning Engine |
| Composition plane | Recommendation / Briefing Composers |
| Coordination plane | Coordination Broker |
| Awareness plane | Situation Monitor (operational) |
| Retention plane | Memory Classifier + Trace Recorder |

Deployment topology is **out of scope for Step 1** (deferred to later Phase 2 steps / implementation phases).

### Explicit non-goals (Step 1)

- Choosing languages, frameworks, hosts, or databases  
- Designing Ask Atlas UI  
- Implementing Hub/Context Injector/Memory Keeper  
- Amending ATOS  

---

## Step 1 success test

Infrastructure principles are adequate when every later Phase 2 artifact can be checked against:

1. Does it preserve the governing flow?  
2. Does it preserve Phase 0 authority?  
3. Does it preserve Phase 1 SRPs?  
4. Does it fail closed?  
5. Does it avoid implementation leakage?
