# Atlas Program — Phase 3 Runtime Architecture & Implementation Design

| Field | Value |
|---|---|
| **Document ID** | ATLAS-P3 |
| **Version** | 1.0.0-review |
| **Status** | Review |
| **Owner** | Founder |
| **AI Steward** | Atlas |
| **Human Approver** | Founder |
| **Review Cycle** | Until Founder ratification |
| **Dependencies** | ATLAS-P0, ATLAS-P1, ATLAS-P2, RES-003, RES-004, RES-005 |
| **Related Documents** | SPEC-005, STD-006, RUNTIME-IFACE, RUNTIME-CTX, RUNTIME-MEM, RUNTIME-LEGACY, GOV-COMPAT, GOV-MAINT-1.0.0 |
| **Approval History** | 2026-07-19 — Step 1 approved; Steps 2–10 designed for Founder review |
| **Change Log** | 2026-07-19 — Full Phase 3 runtime architecture design package |

---

## Purpose

Phase 3 designs the **Runtime Architecture & Implementation Design** that realizes ATLAS-P2 — design only, not production cutover.

**Must satisfy:** Phase 0 · Phase 1 · Phase 2 · ATOS · applicable Specs/Standards · Maintenance Mode.  
**Must not:** Production UI · Rewrite ATOS Specs/Standards · Redefine Phase 0/1/2 · Assume Hub/Context/Memory Keeper cutover without Founder gate · Change `atlas/engine/loader.ts` load set without Founder approval.

**Governing flow:**

```text
Request → Authority → Knowledge → Context → Reasoning → Recommendation → Validation → Founder → Audit
```

---

## Phase 3 step status

| Step | Focus | Status |
|---|---|---|
| 1 | Runtime principles & constraints | **Approved** |
| 2 | Runtime topology & execution model | Complete — awaiting review |
| 3 | Request lifecycle runtime | Complete — awaiting review |
| 4 | Knowledge & context injection runtime | Complete — awaiting review |
| 5 | Cognition, recommendation & validation runtime | Complete — awaiting review |
| 6 | Memory, audit & retention runtime | Complete — awaiting review |
| 7 | Executive exchange & Founder surface runtime | Complete — awaiting review |
| 8 | Dual-plane compatibility & cutover architecture | Complete — awaiting review |
| 9 | Implementation sequencing, gates & acceptance | Complete — awaiting review |
| 10 | Runtime architecture validation | Complete — awaiting Founder ratification |

---

## Step 1 — Runtime principles & constraints (Approved)

### Verified constraints (inherited)

1. Serve Phase 2 infrastructure — invent no new authority.  
2. Preserve governing flow; one logical ingress; authority before knowledge/context/reasoning.  
3. No raw-memory reasoning path.  
4. Validation hard gate before Founder-visible output.  
5. Audit must not silently Canonicalize.  
6. Must not become Sentinel, Founder, or domain executives.  
7. Atlas Program work **on** ATOS (Maintenance Mode).  
8. Hub / Context Injector / Memory Keeper production cutover remains Founder-gated.  
9. Ask Atlas loader freeze preserved until Founder-gated cutover.  
10. Conflict with P0/P1/P2 → change the runtime design — not the contracts.

### Phase 3 design boundary

| In scope | Out of scope (until Founder directs) |
|---|---|
| Runtime architecture that maps P2 units to executable design | Shipping production Atlas pipeline code as ATOS Runtime |
| Implementation sequencing & Founder gates | Product UI redesign |
| Dual-plane (legacy Ask Atlas ↔ target ATOS runtime) | Silent loader / knowledge-set cutover |
| Alignment to SPEC-005 / STD-006 / RUNTIME-* | Amending ATOS Specs/Standards |
| Acceptance criteria for later implementation | Claiming Runtime cutover complete |

### Runtime principles

| ID | Principle |
|---|---|
| R-Flow | Runtime stages follow the governing sequence; no reorder for convenience |
| R-Stage-Fidelity | Each P2 infrastructure unit remains a distinct runtime responsibility |
| R-Fail-Closed | Authority, knowledge, validation, or label failures deny PASS |
| R-Label-Transport | Authority labels survive every hop; never silent upgrade |
| R-Trace-Always | Material stage transitions emit audit events (`canonical=false`) |
| R-Founder-Final | No binding shortcut past Founder; recommendations stay non-binding |
| R-Promote-Only-by-Governance | Persistence and ops stores ≠ Canonical |
| R-Dual-Plane | Legacy Ask Atlas and target ATOS runtime coexist until Founder cutover |
| R-Cutover-Gated | Hub / Context Injector / Memory Keeper / loader changes require Founder approval |
| R-No-Spec-Rewrite | Runtime design consumes SPEC-005/STD-006; does not amend them |
| R-Minimal-Runtime | Smallest sufficient runtime surface; defer optional scoring/addenda |
| R-Conflict-Rule | Conflict with P0/P1/P2 → change runtime design |

### Relation to ATOS Runtime (alignment only)

| ATOS concept | Phase 3 stance |
|---|---|
| Hub | Target orchestrator candidate; must not grant Atlas extra authority |
| Context Injector | Must realize Knowledge Reader + Context Assembler rules (RUNTIME-CTX) |
| Memory Keeper | Must realize Memory Classifier rules (RUNTIME-MEM); never Canonical alone |
| Sandbox | Proposal-only inputs via Ingress; labeled `proposal` |
| STD-006 workflows | Request lifecycle must be expressible as governed workflow stages |
| RUNTIME-LEGACY | Dual-plane mapping remains explicit until cutover gates pass |

---

## Step 2 — Runtime topology & execution model

### Recommended topology (default)

**Modular monolith** for Atlas executive runtime — one deployable unit with **hard module boundaries** matching P2 infrastructure units. Cross-module calls only via P2 envelopes. Services may be split later without changing contracts.

| Decision | Choice | Rationale |
|---|---|---|
| Process model | Modular monolith (default) | Smallest surface; preserves stage isolation; avoids premature distributed authority leaks |
| Orchestration role | Hub-shaped **Pipeline Orchestrator** inside Atlas runtime | Aligns with SPEC-005 Hub; grants no executive authority |
| Persistence | Logical sinks only (ops / audit / promo / ephemeral) | Technology choice deferred; sinks must honor labels |
| Sync vs async | Request path synchronous through Validation; ops awareness & audit may be async | Awareness must not bypass Authority→Knowledge→Context |

### Runtime roles (executable mapping)

| P2 infrastructure unit | Runtime role | Module ID |
|---|---|---|
| Request Intake | Ingress Module | `rt.ingress` |
| Authority Checkpoint | Authority Module | `rt.authority` |
| Knowledge Access Adapter | Knowledge Module | `rt.knowledge` |
| Ops Awareness Adapter | Awareness Module | `rt.awareness` |
| Context Session Builder | Context Module | `rt.context` |
| Reasoning Processor | Cognition Module | `rt.cognition` |
| Recommendation / Briefing Builder | Composition Module | `rt.composition` |
| Validation Gate | Integrity Module | `rt.integrity` |
| Escalation Builder | Escalation Module | `rt.escalation` |
| Executive Exchange | Exchange Module | `rt.exchange` |
| Memory Disposition | Memory Module | `rt.memory` |
| Audit Log | Trace Module | `rt.trace` |
| Pipeline coordination | Orchestrator | `rt.hub` |

**Forbidden runtime roles:** Decision Authority Service · Canonical Publisher · Priority Sovereign · Sentinel Override Proxy · Domain Executive Simulator · Unlabeled Hot-Patch Injector.

### Orchestrator rules (`rt.hub`)

- May: sequence stages, hold transient workflow state, route envelopes, invoke modules in order.  
- Must not: invent authority, upgrade labels, skip Validation, bind Founder decisions, Canonicalize.  
- Aligns with RUNTIME-IFACE Hub operations conceptually (`receive` → … → `routeOutput`) without claiming cutover.

---

## Step 3 — Request lifecycle runtime

Maps STD-006 lifecycle to the Atlas governing flow (consumes STD-006; does not amend it).

| STD-006 stage | Atlas runtime stages | Module(s) |
|---|---|---|
| 1. Receive Request | Ingress | `rt.ingress` |
| 2. Intent Analysis | Ingress classify → Authority | `rt.ingress` → `rt.authority` |
| 3. Executive Selection | Authority limits + Exchange targets (if needed) | `rt.authority`, `rt.exchange` |
| 4. Context Injection | Knowledge → Context (+ Awareness as ops sources) | `rt.knowledge`, `rt.awareness`, `rt.context` |
| 5. Execution | Reasoning → Recommendation/Briefing/Escalation | `rt.cognition`, `rt.composition`, `rt.escalation` |
| 6. Validation | Integrity Watch V1–V8 | `rt.integrity` |
| 7. Memory Classification | Post-path disposition | `rt.memory` |
| 8. Response | Founder/executive delivery only after PASS (or validated escalation) | `rt.exchange` |
| 9. Logging | Trace throughout | `rt.trace` |

### Happy path

```text
Ingress → Authority(pass) → Knowledge → Context(lock) → Cognition → Composition
  → Integrity(PASS) → Exchange(Founder) → Memory → Trace
```

### Fail-closed paths

| Condition | Runtime action |
|---|---|
| Authority reject | STOP or ESCALATE; no Knowledge |
| Authority escalate | Escalation Builder → Integrity → Founder |
| Unlabeled / Scaffold-as-institutional | Knowledge fail → RETURN/STOP |
| Context insufficient | Cognition may emit Insufficient-Knowledge; Composition → Integrity |
| Integrity RETURN | Re-enter upstream stage; no Founder PASS |
| Integrity STOP | No clean Founder brief; Trace + optional Founder-visible failure |
| Integrity ESCALATE | Escalation artifact path |

### Workflow state (transient)

`request_id`, current stage, envelope refs, AuthorityVerdict, ContextBundle lock flag, ValidationVerdict, timestamps.  
State is **non-Canonical**. Survives only for the request lifecycle (plus audit crumbs).

---

## Step 4 — Knowledge & context injection runtime

### Knowledge Module (`rt.knowledge`)

| Concern | Runtime design |
|---|---|
| Inputs | RequestEnvelope + AuthorityVerdict=pass |
| Resolve | Ordered sources per intent; prefer Authoritative → Canonical → Operational → Legacy → Draft → Proposal |
| Load | Emit KnowledgeItem[] with mandatory `authority_label` + `plane` |
| Filter | Scaffold excluded as institutional; Draft/Proposal never presented as Canonical |
| Gaps | Explicit missing-knowledge records — no invention |
| Legacy plane | `plane: legacy-atlas` until cutover; never silent upgrade |

Aligns with RUNTIME-IFACE Context Injector `resolveSources` / `load` / `validate` **as design targets**.

### Context Module (`rt.context`)

| Concern | Runtime design |
|---|---|
| Assemble | Smallest sufficient ContextBundle for this request |
| Lock | Bundle immutable for Cognition pass |
| Re-entry | New facts require new Authority→Knowledge→Context cycle |
| Hot-patch | Forbidden with unlabeled or raw-memory data |

### Awareness Module (`rt.awareness`)

- Supplies **operational**-labeled items only.  
- Feeds Knowledge Module as sources — never Cognition directly.  
- Must not inject Identity/Canonical by itself.

### Loader freeze

`atlas/engine/loader.ts` fixed Tier-D set remains until Founder-gated cutover (RUNTIME-LEGACY / GOV-COMPAT). Phase 3 designs the target path; it does not change the loader.

---

## Step 5 — Cognition, recommendation & validation runtime

### Cognition Module (`rt.cognition`)

- Input: locked ContextBundle only.  
- Process: STD-003 pipeline (ATLAS-P1).  
- Output: ReasoningProduct.  
- Sandbox (if used): isolated; outputs labeled `proposal`; enter only via Ingress as Proposal sources — never as Canonical.

### Composition Module (`rt.composition`)

- Builds RecommendationArtifact / Brief embeddings.  
- Enforces STD-003 fields, `binding=false`, Sentinel-intact risks.  
- Must route to Integrity — never direct Founder publish.

### Escalation Module (`rt.escalation`)

- Builds Escalation packages from Authority, Cognition, or Integrity.  
- Still passes Integrity before Founder delivery.

### Integrity Module (`rt.integrity`)

Mandatory V1–V8 (ATLAS-P1 Step 5): Structure · Authority · Knowledge · Evidence/Trace · Reasoning fidelity · Collaboration · Escalation compliance · Output posture.

| Verdict | Runtime effect |
|---|---|
| PASS | Eligible for Founder/executive delivery |
| RETURN | Upstream re-entry |
| ESCALATE | Escalation artifact path |
| STOP | Block clean Founder brief |

**No urgency bypass.** Demo/speed paths that skip Integrity are forbidden by contract.

---

## Step 6 — Memory, audit & retention runtime

### Memory Module (`rt.memory`) — Memory Keeper alignment

| Class | Runtime sink (logical) | Notes |
|---|---|---|
| Temporary | Ephemeral / TTL | Working, session, scratch |
| Operational | Ops plane | Not Canonical |
| Promotion Candidate | REG-PROMO-Q via STD-002 | Founder institutional approval for Canonical |
| Discarded | Explicit discard + optional audit crumb | |

**Recall rule:** Retained items re-enter cognition only as KnowledgeItem through Knowledge → Context.

Aligns with RUNTIME-IFACE Memory Keeper (`capture` → `classify` → `store` / `enqueuePromotion` / `discard`) without claiming cutover.

### Trace Module (`rt.trace`)

- Emits AuditEvent on material stage transitions and ValidationVerdicts.  
- `canonical=false` always.  
- Supports Founder challenge and failure learning.  
- Aligns with Execution Logger / R100x spirit (non-git sinks) — technology deferred.

### Persistence technology

Not locked in Phase 3. Any chosen store must preserve labels, refuse silent Canonicalization, and separate audit/ops from institutional Canonical library.

---

## Step 7 — Executive exchange & Founder surface runtime

### Exchange Module (`rt.exchange`)

| Channel | Direction | Runtime rule |
|---|---|---|
| Founder delivery | Atlas → Founder | Validated briefs / packs / escalations only |
| Founder intake | Founder → Ingress | Requests/corrections as RequestEnvelope |
| Sentinel exchange | Bidirectional | Findings not rewritten; risks preserved |
| Domain executive exchange | Bidirectional | Status/options/coordination; no domain absorption |
| Knowledge promotion | Atlas → Governance | Promotion candidates only (STD-002) |

**Boundary:** Exchange cannot invoke Decision Authority, Canonical publish, or domain execution ownership.

### Founder surface (runtime contract)

| Surface | Role |
|---|---|
| Decision Pack / Recommendation | Non-binding; post-Validation |
| Daily / Weekly briefs | Cadence intelligence; post-Validation |
| Escalation package | Hard-boundary; post-Validation |
| Failure notice | STOP/ESCALATE visibility |
| Dashboard intelligence feed | Labeled ops/awareness contract — not a decision engine |

Legacy Ask Atlas / Founder OS remain **precursor surfaces** under GOV-COMPAT until cutover gates pass.

---

## Step 8 — Dual-plane compatibility & cutover architecture

### Dual planes

| Plane | What it is | Runtime status |
|---|---|---|
| **Legacy plane** | `atlas/engine` + `/api/atlas` + Founder OS precursors | Live; loader frozen |
| **Target plane** | ATLAS-P3 modules under ATOS Runtime alignment | Design; implement behind Founder gates |

Both may coexist. Target must not silently replace Legacy.

### Mapping (RUNTIME-LEGACY preserved)

| ATOS / P3 target | Legacy precursor | Gap until cutover |
|---|---|---|
| `rt.hub` | `app/api/atlas/route.ts` + page loaders | No full stage machine |
| `rt.knowledge` + `rt.context` | `loader.ts` + `prompt.ts` | Fixed file set; incomplete ATOS authority filters |
| `rt.memory` | Partial Supabase notes/briefs | No full classify → promo queue |
| `rt.cognition` | Ask Atlas reasoning path | Not full STD-003 + Validation gate |
| `rt.trace` | App/server logs | No R100x governed records |

### Cutover gates (Founder — mandatory)

1. Context path implements RUNTIME-CTX authority filters.  
2. Canonical / Authoritative sources exist for domains being cut over.  
3. Memory Module can enqueue REG-PROMO-Q without auto-Canonicalizing.  
4. Explicit Founder approval to change `loadAtlasContext()` / loader file set.  
5. Compatibility test: no silent authority upgrade of Draft Specs.  
6. Integrity Module V1–V8 active on Founder-visible path.  
7. Dual-plane rollback plan documented before switch.

**Cutover modes:** shadow (target runs, Legacy serves) → canary (Founder-only target) → primary (Founder-approved) → Legacy deprecate (Founder-approved).

---

## Step 9 — Implementation sequencing, gates & acceptance

### Sequence (design order for later implementation work)

| Wave | Deliverable | Founder gate? |
|---|---|---|
| W0 | Module skeletons + envelope types + Trace stubs (no loader change) | No (non-cutover) |
| W1 | Ingress → Authority → fail-closed Trace | No |
| W2 | Knowledge → Context with label transport (parallel to Legacy; no loader change) | No |
| W3 | Cognition → Composition → Integrity (Founder-visible only behind flag) | Yes (enable flag) |
| W4 | Memory disposition + promo enqueue (non-Canonical) | Yes if touching production retention |
| W5 | Exchange channels (Sentinel/domain) | Yes for production exposure |
| W6 | Shadow dual-plane against Ask Atlas | Yes |
| W7 | Canary / primary cutover per Step 8 gates | Yes |
| W8 | Loader freeze lift (explicit) | Yes |

### Acceptance criteria (implementation must prove)

1. Every Founder-visible output has ValidationVerdict=PASS (or validated Escalation).  
2. No path from raw memory → Cognition.  
3. No unlabeled KnowledgeItem reaches Context.  
4. No AuditEvent with `canonical=true`.  
5. Governing flow always reconstructable from Trace.  
6. Dual success test still holds: “I decided better because of Atlas” + “Atlas never decided for me.”  
7. Loader unchanged unless Founder approved cutover gate 4.  
8. ATOS Specs/Standards unchanged.

### Explicit non-goals for first implementation waves

- Product UI redesign  
- Full multi-service mesh  
- Context-selection scoring addendum (optional later)  
- Claiming ATOS Runtime cutover complete without Founder gates  

---

## Step 10 — Runtime architecture validation

### Checklist

| Check | Result |
|---|---|
| Preserves governing flow | **Met** |
| Phase 0 authority preserved | **Met** |
| Phase 1 SRPs preserved as runtime roles | **Met** |
| Phase 2 envelopes/planes honored | **Met** |
| Fail closed | **Met** |
| No raw-memory reasoning path | **Met** |
| Validation before Founder | **Met** |
| Audit ≠ Canonical | **Met** |
| Executive non-absorption | **Met** |
| Dual-plane + loader freeze respected | **Met** |
| Hub/Context/Memory cutover Founder-gated | **Met** |
| STD-006 lifecycle mappable | **Met** |
| SPEC-005 alignment without Spec rewrite | **Met** |
| ATOS Maintenance Mode respected | **Met** |
| No production UI / cutover claimed | **Met** |

### Architectural risks

| Risk | Mitigation |
|---|---|
| Orchestrator becomes implicit authority | `rt.hub` may-not list + Authority Module mandatory |
| Shadow mode leaks unlabeled Legacy into target Context | Label + plane required; Integrity Knowledge stage |
| Early service split creates authority bypass channels | Default modular monolith; contracts before network |
| “Just this once” Validation skip | Forbidden; no urgency exception |
| Ops/audit store treated as Canonical | R-Promote-Only-by-Governance + Memory classes |

### Remaining unknowns (post-ratification implementation)

1. Exact persistence technology for audit/ops.  
2. Concrete feature-flag / shadow harness details.  
3. Optional context-selection scoring addendum.  
4. Exact calendar of Founder cutover approvals (Founder-scheduled).  

---

## Founder ratification request

Phase 3 Steps 1–10 are complete for review.

Please rule:

1. **Approve Phase 3 in full** as the Runtime Architecture & Implementation Design Contract, or  
2. **Approve with corrections**, or  
3. **Reject pending corrections**

On approval, Phase 3 should be ratified (RES + ATLAS-P3 Authoritative) to guide every future Atlas runtime implementation — without changing ATOS, Phase 0, Phase 1, or Phase 2.
