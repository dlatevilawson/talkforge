# Atlas Program — Phase 3 Runtime Architecture & Implementation Design

| Field | Value |
|---|---|
| **Document ID** | ATLAS-P3 |
| **Version** | 0.1.0-draft |
| **Status** | Draft |
| **Owner** | Founder |
| **AI Steward** | Atlas |
| **Human Approver** | Founder |
| **Review Cycle** | Each Phase 3 step |
| **Dependencies** | ATLAS-P0, ATLAS-P1, ATLAS-P2, RES-003, RES-004, RES-005 |
| **Related Documents** | SPEC-005, STD-006, RUNTIME-IFACE, RUNTIME-CTX, RUNTIME-MEM, RUNTIME-LEGACY, GOV-COMPAT, GOV-MAINT-1.0.0 |
| **Approval History** | 2026-07-19 — Phase 3 opened after Phase 2 ratification |
| **Change Log** | 2026-07-19 — Phase 3 package opened; Step 1 runtime principles recorded |

---

## Purpose

Phase 3 designs the **Runtime Architecture & Implementation Design** that realizes ATLAS-P2 — still design, not production cutover.

**Must satisfy:** Phase 0 · Phase 1 · Phase 2 · ATOS · applicable Specs/Standards · Maintenance Mode.  
**Must not:** Production UI · Rewrite ATOS Specs/Standards · Redefine Phase 0/1/2 · Assume Hub/Context/Memory Keeper cutover without Founder gate · Change `atlas/engine/loader.ts` load set without Founder approval.

**Governing flow:**

```text
Request → Authority → Knowledge → Context → Reasoning → Recommendation → Validation → Founder → Audit
```

---

## Phase 3 step sequence

| Step | Focus | Status |
|---|---|---|
| 1 | Runtime principles & constraints | **Complete — awaiting Founder review** |
| 2 | Runtime topology & execution model | Pending |
| 3 | Request lifecycle runtime | Pending |
| 4 | Knowledge & context injection runtime | Pending |
| 5 | Cognition, recommendation & validation runtime | Pending |
| 6 | Memory, audit & retention runtime | Pending |
| 7 | Executive exchange & Founder surface runtime | Pending |
| 8 | Dual-plane compatibility & cutover architecture | Pending |
| 9 | Implementation sequencing, gates & acceptance | Pending |
| 10 | Runtime architecture validation | Pending |

---

## Step 1 — Runtime principles & constraints

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

### Logical vs physical

Phase 3 may name **runtime roles** and **sequencing**, and may recommend topology options (e.g. modular monolith vs services). It does **not** lock persistence technology or deployment topology until Step 2 (and later Founder acceptance). Physical choices must still satisfy R-Flow through R-Conflict-Rule.

### Relation to ATOS Runtime (alignment only)

| ATOS concept | Phase 3 stance |
|---|---|
| Hub | Target orchestrator candidate; must not grant Atlas extra authority |
| Context Injector | Must realize Knowledge Reader + Context Assembler rules (RUNTIME-CTX) |
| Memory Keeper | Must realize Memory Classifier rules (RUNTIME-MEM); never Canonical alone |
| Sandbox | Proposal-only inputs via Ingress; labeled `proposal` |
| STD-006 workflows | Request lifecycle must be expressible as governed workflow stages |
| RUNTIME-LEGACY | Dual-plane mapping remains explicit until cutover gates pass |

### Step 1 exit criteria

- [x] Constraints inherited from P0/P1/P2 restated for runtime  
- [x] Design vs cutover boundary explicit  
- [x] Runtime principles named and conflict rule fixed  
- [x] ATOS Runtime alignment stated without claiming cutover  
- [ ] Founder review / approval of Step 1  

---

## Founder review — Step 1

Step 1 complete. Awaiting Founder review.

Please rule:

1. **Approve Step 1** and proceed to Step 2 (Runtime topology & execution model), or  
2. **Approve with corrections**, or  
3. **Reject pending corrections**
