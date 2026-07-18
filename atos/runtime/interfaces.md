# Runtime Component Interfaces

| Field | Value |
|---|---|
| **Document ID** | RUNTIME-IFACE |
| **Version** | 1.0.0-m5 |
| **Status** | Draft |
| **Owner** | Founder |
| **AI Steward** | Sentinel |
| **Human Approver** | Founder |
| **Review Cycle** | On SPEC-005 amendment |
| **Dependencies** | SPEC-005, STD-006, GOV-RUNTIME |
| **Related Documents** | context-framework.md, memory-classification.md, workflows.md |
| **Approval History** | 2026-07-18 — M5 Draft |
| **Change Log** | 2026-07-18 — Interface contracts for Hub/Context/Memory/Sandbox |

---

## 1. Hub

**Responsibility:** Orchestrate work; no executive authority.

| Operation | Input | Output | Notes |
|---|---|---|---|
| `receive(request)` | Request envelope | `request_id` | Deduplicate where possible |
| `analyzeIntent(request_id)` | Request | Intent + constraints | Does not decide policy |
| `selectExecutives(intent)` | Intent | Executive ID list | From REG-EXEC active/planned rules |
| `runWorkflow(request_id)` | Request + executives | Workflow handle | See workflows.md |
| `routeOutput(result)` | Execution result | Response to caller | |
| `getState(request_id)` | ID | Runtime state snapshot | Transient |

**May not:** Override Identity, modify Knowledge Governance, create Canonical knowledge, approve Specs/Standards.

---

## 2. Context Injector

**Responsibility:** Supply only governed, task-relevant context.

| Operation | Input | Output | Notes |
|---|---|---|---|
| `resolveSources(intent, executives)` | Intent | Ordered source list | Minimal set |
| `load(sources)` | Source list | Execution Context | Respects authority filters |
| `validate(context)` | Context | Pass/fail + reasons | Rejects Scaffold / unapproved Draft as Canonical |

**Authority filter (mandatory):**

| Source status | Inject as institutional/Canonical? |
|---|---|
| Authoritative Spec/Standard/Resolution | Yes |
| ATOS Canonical library publication | Yes |
| Draft / Scaffold | **No** (may inject as labeled non-canonical only if task explicitly allows) |
| Legacy `atlas/` plane | Yes **only** as legacy-live until cutover; must be labeled `plane: legacy-atlas` |
| Sandbox artifacts | No (proposals) |

See [context-framework.md](context-framework.md).

---

## 3. Memory Keeper

**Responsibility:** Classify outcomes; enqueue promotion candidates; never publish Canonical alone.

| Operation | Input | Output | Notes |
|---|---|---|---|
| `capture(result)` | Execution result | Memory event | |
| `classify(event)` | Memory event | Class (see memory-classification.md) | Classification precedes storage |
| `store(event, class)` | Classified event | Storage ref | Class-appropriate sink |
| `enqueuePromotion(candidate)` | Promotion candidate | Queue item ID | Writes REG-PROMO-Q via governed process |
| `discard(event)` | Event | Acknowledgement | Explicit discard class |

**May not:** Set knowledge to Canonical; skip STD-002 stages; alter Identity.

---

## 4. Sandbox

**Responsibility:** Isolated reasoning/experimentation.

| Operation | Input | Output | Notes |
|---|---|---|---|
| `open(session)` | Purpose + constraints | `sandbox_id` | Isolated |
| `execute(sandbox_id, task)` | Task | Proposal artifacts | Labeled `proposal: true` |
| `close(sandbox_id)` | ID | Session summary | |

**Hard rules:** Cannot modify institutional knowledge; cannot alter operations directly; outputs are proposals until governance approves.

---

## 5. Supporting components

| Component | Responsibility |
|---|---|
| Executive Routing | Map intent → executives (REG-EXEC) |
| Workflow Engine | Advance STD-006 stages |
| Runtime State Manager | Transient workflow state |
| Execution Logger | Emit R1001–R1006 records to non-git sinks (ADR-0001) |
