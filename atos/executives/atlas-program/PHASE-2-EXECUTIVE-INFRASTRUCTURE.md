# Atlas Program — Phase 2 Executive Infrastructure Contract

| Field | Value |
|---|---|
| **Document ID** | ATLAS-P2 |
| **Version** | 1.0.0 |
| **Status** | Authoritative |
| **Owner** | Founder |
| **AI Steward** | Atlas |
| **Human Approver** | Founder |
| **Review Cycle** | Until Founder-amended |
| **Dependencies** | RES-005, ATLAS-P0, ATLAS-P1, RES-003, RES-004 |
| **Related Documents** | SPEC-005, STD-006, RUNTIME-IFACE, RUNTIME-CTX, RUNTIME-MEM, GOV-MAINT-1.0.0 |
| **Approval History** | 2026-07-19 — Founder approved Phase 2 in full (RES-005) |
| **Change Log** | 2026-07-19 — Full Phase 2 infrastructure design package; ratified Authoritative |

---

## Ratification

Phase 2 is the binding **Executive Infrastructure Contract** for Atlas.

| Rule | Statement |
|---|---|
| Implementation | Every Atlas implementation must satisfy Phase 2 |
| Extension | Future architecture may extend this infrastructure but may not violate it |
| Conflict | Implementation changes — not Phase 2 — unless Founder amends |

Phase 0 remains the design contract for *what Atlas is*. Phase 1 defines *how Atlas is organized*. Phase 2 defines the *infrastructure that realizes Phase 1*.

---

## Purpose

Phase 2 designs the **Executive Infrastructure** that realizes ATLAS-P1 — design only, not production implementation.

**Must satisfy:** Phase 0 · Phase 1 · ATOS · applicable Specs/Standards · Maintenance Mode.  
**Must not:** Production code · Product UI · ATOS Spec/Standard rewrite · Redefine Phase 0/1.

**Governing flow:**

```text
Request → Authority → Knowledge → Context → Reasoning → Recommendation → Validation → Founder → Audit
```

---

## Phase 2 step status

| Step | Focus | Status |
|---|---|---|
| 1 | Infrastructure principles & constraints | **Approved** |
| 2 | Component infrastructure map | **Approved** |
| 3 | Inter-component contracts | **Approved** |
| 4 | Knowledge & context infrastructure | **Approved** |
| 5 | Memory & audit infrastructure | **Approved** |
| 6 | Pipeline infrastructure (Reason→Recommend→Validate) | **Approved** |
| 7 | Executive interface infrastructure | **Approved** |
| 8 | Reporting infrastructure | **Approved** |
| 9 | Failure & recovery infrastructure | **Approved** |
| 10 | Infrastructure design validation | **Approved** |

---

## Step 1 — Principles & constraints (Approved)

### Verified constraints

1. Serve Phase 1 flow — invent no new authority.  
2. One logical ingress; authority before knowledge/context/reasoning.  
3. No raw-memory reasoning path.  
4. Validation hard gate before Founder-visible output.  
5. Audit must not silently Canonicalize.  
6. Must not become Sentinel, Founder, or domain executives.  
7. Atlas Program work **on** ATOS (Maintenance Mode).  
8. Hub / Context Injector / Memory Keeper production cutover remains Founder-gated.  

### Principles

| ID | Principle |
|---|---|
| P-Flow | Preserve governing sequence always |
| P-Stage-Isolation | No SRP absorption |
| P-Label-Transport | Labels survive hops; never silent upgrade |
| P-Fail-Closed | Deny PASS on authority/knowledge/validation failure |
| P-Founder-Final | No binding shortcut |
| P-Trace-Always | Material interactions audited |
| P-Promote-Only-by-Governance | Persistence ≠ Canonical |
| P-Minimal-Surface | Smallest sufficient contracts |
| P-No-Impl-Leak | Contracts/responsibilities only — not code/UI |
| P-Conflict-Rule | Conflict with P0/P1 → change infrastructure; after ratification, conflict with P2 → change implementation |

### Logical planes

Control · Knowledge · Context · Cognition · Composition · Coordination · Awareness · Retention  

*(Deployment topology deferred to implementation phases.)*

---

## Step 2 — Component infrastructure map

Maps each ATLAS-P1 component to a logical infrastructure unit and plane.

| Component | Plane | Infrastructure unit (logical) | Upstream | Downstream |
|---|---|---|---|---|
| Ingress Gate | Control | Request Intake | External callers | Authority Guard |
| Authority Guard | Control | Authority Checkpoint | Ingress | Knowledge Reader **or** Escalation |
| Knowledge Reader | Knowledge | Knowledge Access Adapter | Authority Guard | Context Assembler |
| Situation Monitor | Awareness | Ops Awareness Adapter | (async/ops feeds) | Knowledge Reader (as operational sources) |
| Context Assembler | Context | Context Session Builder | Knowledge Reader | Reasoning Engine |
| Reasoning Engine | Cognition | Reasoning Processor | Context Assembler | Recommendation Composer |
| Recommendation Composer | Composition | Recommendation Builder | Reasoning | Integrity Watch |
| Briefing Composer | Composition | Briefing Builder | Reasoning / Recommendations | Integrity Watch |
| Coordination Broker | Coordination | Executive Exchange | Ingress / Composer | Ingress (responses) / Composer |
| Escalation path | Control | Escalation Builder | Authority Guard / Reasoning / Validation | Integrity Watch → Founder |
| Integrity Watch | Control | Validation Gate | Composers / Escalation | Founder **or** RETURN/STOP |
| Memory Classifier | Retention | Memory Disposition | Post-Founder / post-attempt | Retention sinks / promo queue |
| Trace Recorder | Retention | Audit Log | All material stages | Audit store (non-Canonical) |

**Forbidden infra units:** Decision Authority Service · Canonical Publisher · Priority Sovereign · Sentinel Override Proxy · Domain Executive Simulator.

**Relation to ATOS runtime (SPEC-005 / RUNTIME-IFACE) — alignment, not cutover:**

| ATOS runtime concept | Atlas infra relationship |
|---|---|
| Hub | May eventually orchestrate; must not grant Atlas extra authority; cutover Founder-gated |
| Context Injector | Aligns with Knowledge Reader + Context Assembler rules (RUNTIME-CTX) |
| Memory Keeper | Aligns with Memory Classifier (RUNTIME-MEM); never Canonical alone |
| Sandbox | Proposal-only inputs via Ingress; labeled `proposal` |

---

## Step 3 — Inter-component contracts

### Shared envelope types (logical)

**RequestEnvelope**  
`request_id`, `source` (Founder/cadence/executive/ops/correction), `intent`, `payload_ref`, `received_at`

**AuthorityVerdict**  
`request_id`, `result` (pass/escalate/reject), `reasons[]`, `limits_applied[]`

**KnowledgeItem**  
`source_id`, `authority_label`, `status`, `excerpt_or_ref`, `plane`

**ContextBundle**  
`request_id`, `items[]` (KnowledgeItems), `objective`, `constraints[]`, `assembled_at`  
*Locked before Reasoning.*

**ReasoningProduct**  
STD-003 intermediate: objective, evidence[], facts/assumptions/inferences, alternatives[], tradeoffs, risks[], long_term_notes, missing_info, draft_recommendation, confidence, escalation_flag

**RecommendationArtifact**  
STD-003 fields + metadata (`recommendation_id`, `type`, `binding=false`, `escalation`, `authority_labels_used[]`)

**ValidationVerdict**  
`result` (PASS/RETURN/ESCALATE/STOP), `failed_stages[]`, `notes`

**AuditEvent**  
`event_id`, `request_id`, `stage`, `summary`, `refs[]`, `canonical=false` (always)

### Stage contracts (must / must not)

| From → To | Must pass | Must not pass |
|---|---|---|
| Ingress → Authority | RequestEnvelope | Pre-reasoned recommendations |
| Authority → Knowledge | RequestEnvelope + AuthorityVerdict=pass | Failed authority |
| Knowledge → Context | KnowledgeItem[] labeled | Unlabeled / Scaffold-as-institutional |
| Context → Reasoning | ContextBundle locked | Raw memory handles |
| Reasoning → Recommendation | ReasoningProduct | Binding decisions |
| Recommendation → Validation | RecommendationArtifact | Direct Founder channel |
| Validation → Founder | Artifact + ValidationVerdict=PASS (or validated Escalation) | Failed validation |
| Any → Trace | AuditEvent | Canonical publish flag true |
| Post-path → Memory Classifier | Disposition candidate | Auto-Canonical |

**Label transport rule:** Downstream may narrow use of items; may never upgrade `authority_label`.

---

## Step 4 — Knowledge & context infrastructure

### Knowledge Access Adapter

| Concern | Design |
|---|---|
| Sources | Authoritative docs, Canonical library, operational registries/ops, legacy-atlas (labeled), Draft (non-binding), Proposal (sandbox) |
| Filter | Scaffold excluded as institutional/Canonical |
| Preference | Authoritative → Canonical → Operational → Legacy → Draft → Proposal |
| Output | KnowledgeItem[] with mandatory labels |
| Gaps | Emit explicit missing-knowledge records — no invention |
| ATOS alignment | Obeys RUNTIME-CTX injection rules; Ask Atlas loader cutover Founder-gated |

### Context Session Builder

| Concern | Design |
|---|---|
| Input | RequestEnvelope + KnowledgeItem[] (+ ops items via Situation Monitor) |
| Selection | Smallest sufficient set for current request only |
| Lock | ContextBundle immutable for Reasoning pass |
| Re-entry | New knowledge requires new Authority→Knowledge→Context cycle (no mid-reason hot-patch with unlabeled data) |

### Ops Awareness Adapter

Provides **operational**-labeled items only (priorities, projects, blockers). Never Identity/Canonical by itself.

---

## Step 5 — Memory & audit infrastructure

### Memory Disposition

| Class | Sink (logical) | Notes |
|---|---|---|
| Temporary | Ephemeral store / TTL | Working/session/scratch |
| Operational | Ops plane / registries | Not Canonical |
| Promotion Candidate | REG-PROMO-Q via STD-002 process | Founder institutional approval for Canonical |
| Discarded | Explicit discard (+ optional audit crumb) | |

**Recall rule:** Anything retained may re-enter cognition **only** as KnowledgeItem through Knowledge → Context — never as raw memory into Reasoning.

### Audit Log

- Record material stage transitions and ValidationVerdicts  
- `canonical=false` always on AuditEvent  
- Supports Founder challenge and failure learning  
- Does not publish institutional knowledge  

Aligns with Memory Keeper spirit (RUNTIME-IFACE) without implementing cutover.

---

## Step 6 — Pipeline infrastructure (Reason → Recommend → Validate)

### Reasoning Processor

- Input: locked ContextBundle only  
- Process: STD-003 pipeline (ATLAS-P1 Step 3)  
- Output: ReasoningProduct  
- On escalation_flag: hand to Escalation Builder (still Validation before Founder)  

### Recommendation Builder / Briefing Builder

- Input: ReasoningProduct (+ Coordination attachments if any)  
- Output: RecommendationArtifact / Brief embedding  
- Enforces STD-003 fields, non-binding posture, Sentinel-intact risks  

### Validation Gate (Integrity Watch)

Mandatory V1–V8 (ATLAS-P1 Step 5).  
Results: PASS → Founder channel; RETURN → upstream; ESCALATE → Escalation artifact path; STOP → no clean Founder brief.  
**No urgency bypass.**

---

## Step 7 — Executive interface infrastructure

### Executive Exchange (Coordination Broker infra)

| Channel | Direction | Payload |
|---|---|---|
| Founder delivery channel | Atlas → Founder | Validated briefs / packs / escalations only |
| Founder intake | Founder → Ingress | Requests/corrections |
| Sentinel exchange | Bidirectional | Requests for findings; shared options; **findings not rewritten** |
| Domain executive exchange | Bidirectional | Status/options requests; coordination reports |
| Knowledge promotion channel | Atlas → Governance | Promotion candidates only (STD-002) |

**Boundary enforcement:** Exchange cannot invoke Decision Authority, Canonical publish, or domain execution ownership.

**Future executives:** Same channel template; activation follows charter + REG-EXEC.

---

## Step 8 — Reporting infrastructure

| Output | Builder | Delivery rule |
|---|---|---|
| Daily Brief | Briefing Builder | Validation gate; REF-R1104 fields |
| Weekly Review | Briefing Builder | Sentinel risks attributed |
| Decision Pack | Recommendation Builder | STD-003; Validation |
| Priority Proposal | Recommendation Builder | Labeled proposal |
| Risk / Opportunity / Project summaries | Briefing / Recommendation | Validation for material recommend sections |
| Escalation Report | Escalation Builder | Validation as escalation |
| Dashboard intelligence feed | Awareness → Briefing contract | Labels required; FWS-DASH information contract |
| Quarterly support | Briefing + Recommendation | Founder decides |

**Incident Brief infrastructure:** Sentinel-owned; Atlas may reference, not own.

**Storage posture:** Operational brief stores allowed; ATOS Canonical only via promotion governance.

---

## Step 9 — Failure & recovery infrastructure

| Capability | Design |
|---|---|
| Detection | Authority Checkpoint, Validation Gate stages, Trace anomalies |
| Containment | Fail-closed verdicts (RETURN/ESCALATE/STOP); block Founder PASS |
| Correction | Upstream re-entry only; Validation must not invent evidence |
| Surfacing | Failure class recorded on AuditEvent + Founder-visible when STOP/ESCALATE |
| Learning | Audit review; optional Promotion Candidate for institutional lessons via STD-002 |

**Recovery sequence:** Stop → Surface → Contain → Correct → Learn through governance.

---

## Step 10 — Infrastructure design validation

### Checklist

| Check | Result |
|---|---|
| Preserves governing flow | **Met** |
| Phase 0 authority preserved | **Met** |
| Phase 1 SRPs preserved | **Met** |
| Fail closed | **Met** |
| No raw-memory reasoning path | **Met** |
| Validation before Founder | **Met** |
| Audit ≠ Canonical | **Met** |
| Executive non-absorption | **Met** |
| ATOS Maintenance Mode respected | **Met** |
| RUNTIME-CTX / RUNTIME-MEM aligned (design) | **Met** |
| Hub/Context/Memory cutover not assumed | **Met** |
| No production code / UI leakage | **Met** |
| No ATOS Spec/Standard rewrite | **Met** |

### Deferred to Phase 3+

1. Physical deployment topology (services vs modular monolith, etc.).  
2. Exact persistence technology for audit/ops.  
3. Founder-gated cutover schedule for Ask Atlas → ATOS context injection.  
4. Optional deeper context-selection scoring algorithm (deferred addendum).  

### Architectural risks

| Risk | Mitigation |
|---|---|
| Future Hub orchestrator grants implicit authority | P-Founder-Final + Authority Checkpoint remain mandatory |
| Ops store treated as Canonical | Label transport + Memory Disposition rules |
| Coordination channels become command bus | Executive Exchange boundaries |
| Validation bypass “for demo” | No urgency exception in contract |

---

## Ratification record

Founder Decision (2026-07-19): **Phase 2 Approved in Full.**

Recorded as [`RES-005`](../../resolutions/RES-005-atlas-phase-2-executive-infrastructure.md).  
Runtime Architecture & Implementation Design continues under [`ATLAS-P3`](PHASE-3-RUNTIME-ARCHITECTURE.md).
