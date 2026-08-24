# ACI-001 — ATOS Continuous Intelligence

| Field | Value |
|---|---|
| **Document ID** | ACI-001 |
| **Title** | ATOS Continuous Intelligence |
| **Version** | 0.2.0 |
| **Status** | **Working Knowledge — not Canonical** |
| **Owner** | Founder |
| **AI Steward** | Atlas |
| **Updated** | 2026-08-24 |
| **Plane** | Built **on** ATOS (GOV-MAINT-1.0.0). Does not amend SPEC-001–006. |
| **Idea Vault** | [IV-AI-010](../knowledge/working/idea-vault/ai-ideas/IV-AI-010-atos-continuous-intelligence.md) |
| **Blind spot** | [BS-017](../knowledge/working/blind-spot-register/bs-017.md) |
| **Depends on** | SPEC-001…006 · STD-002 · STD-006 · RUNTIME-MEM · CHARTER-ATLAS · RES-011 · IV-AI-008 · IV-LAW-011 |

---

## How to use this document

This is the architecture contract for Continuous Intelligence. It is **not** a seventh ATOS specification. If it conflicts with SPEC-001–006, the SPECs win until the Founder amends ATOS through the frozen change process.

Nothing here is Canonical until a Founder Decision admits it.

Do not implement the operating loop until this contract is the shared picture. This document **is** the destination. Later slices implement it; they do not invent it.

---

## Founder approvals recorded here

Approved:

- Six-SPEC architecture (SPEC-001 through SPEC-006)
- No seventh ATOS system
- Memory Keeper classification model (Temporary · Operational · Promotion Candidate · Discarded)

Not approved:

- Permanent conversational amnesia
- Defining external intelligence as merely monitoring TalkForge’s own AIs

---

## 1. What Continuous Intelligence is

TalkForge’s next architectural milestone: unify Executive Memory, event ingestion, Working Knowledge, agent coordination, outcome learning, Internal Company Awareness, and External Technology Intelligence **around the six ATOS systems already established**.

TalkForge remains the product. Atlas remains Chief of Staff in service of that product (RES-011). Runtime executes; it does not govern.

---

## 2. Spine — SPEC-001–006 (frozen)

Do not add a seventh system. Do not rewrite these documents to fit this program.

| SPEC | Role in this program |
|---|---|
| SPEC-001 Core Architecture | Identity precedes execution; one source of authority |
| SPEC-002 Identity | Constitution, Laws, Philosophy — **unread as something this loop may write** |
| SPEC-003 Knowledge Governance | Working vs Canonical; STD-002 promotion |
| SPEC-004 Operations | Live company state **and** the environment the company operates in |
| SPEC-005 Runtime Infrastructure | Hub, Context Injector, Memory Keeper, Sandbox, Executive Routing |
| SPEC-006 Executive Systems | Atlas recommends, coordinates, and may later execute only under delegated authority |

Authority still flows Identity → Knowledge → Operations → Executives.

---

## 3. Destination loop (explicit)

Continuous Intelligence’s destination is a **governed autonomous company-learning loop**:

**company and external events → Context → Executive Memory → Atlas reasoning → plans/delegation → agent or human execution → outcomes → learning → Memory Keeper**

That loop is the destination of this document. It is not an implication left for later.

STD-006 remains the runtime lifecycle inside the Hub (receive, intent, executive selection, context injection, execution, validation, memory classification, response, logging). The destination loop is how those stages run **continuously** across company work and the outside world.

**Autonomous** means Atlas can ingest, remember (under classification), investigate, recommend, coordinate, and eventually execute **without waiting to be re-asked**.

**Governed** means Atlas cannot silently amend Identity, Constitution, Laws, frozen SPECs, or Canonical company truth. Canonical admission remains STD-002 + Founder.

---

## 4. Atlas is non-sovereign

Atlas **may**:

- learn
- remember (under Memory Keeper)
- investigate
- recommend
- coordinate
- eventually execute **within explicitly delegated authority**

Atlas **may not**:

- silently amend Identity, Constitution, Laws, frozen SPECs, or Canonical company truth
- write Living Profile / member identity
- treat discovery as admission
- command domain offices or become the organization
- auto-fix product (Engineering owns remediation unless a later Decision delegates a bounded action)

---

## 5. Memory Keeper (approved model)

Use the existing taxonomy only ([RUNTIME-MEM](../runtime/memory-classification.md)):

| Class | Meaning |
|---|---|
| Temporary | Needed only for the active workflow or sitting |
| Operational Memory | Affects live ops; not Canonical |
| Promotion Candidate | May become institutional knowledge; enqueue STD-002 |
| Discarded | No retention value |

Classification precedes storage. Promotion Candidate ≠ Canonical.

### Ask Atlas sittings (not amnesia)

**Raw Ask Atlas conversations never automatically become Canonical.**

At sitting close, Memory Keeper **may extract durable candidate knowledge** from them **with provenance** and classify it using the existing memory taxonomy.

The following **must be eligible** for Operational Memory or Promotion Candidate:

- Founder corrections
- decisions
- commitments
- risks
- mistakes
- lessons
- unresolved issues

Canonical admission remains governed by **STD-002**.

IV-AI-009 sitting-thread continuity (this sitting, in the browser) is a Temporary mechanic for follow-up. It is **not** the ceiling of Executive Memory.

---

## 6. Internal Company Awareness vs External Technology Intelligence

These are **two capabilities**. Do not collapse them.

### Internal Company Awareness

Observes **TalkForge**:

- systems
- agents
- operations
- product health
- providers (e.g. OpenAI configured, GitHub, deploy)

This is the IV-AI-008 steward posture: first to know, not the fixer. Existing code (`awareness-steward`, `ops`) is a starting feed, not the whole program.

### External Technology Intelligence

Observes **material change outside TalkForge**:

- AI
- models
- APIs
- research
- security
- regulation
- infrastructure
- competitors
- relevant technology

External observations enter **Working / Operational knowledge first**. They **never become Canonical merely because Atlas discovered them**. Promotion still requires STD-002 and Founder admission.

In-company AI/provider health is a feed of Internal Company Awareness. It is **not** the definition of Technology Intelligence.

---

## 7. Capabilities mapped to the six SPECs (no new stores)

**Executive Memory** — SPEC-005 Memory Keeper + SPEC-003. Destination: durable classified memory of executive counsel and company learning. **G1:** Ask Atlas sitting close runs Memory Keeper; eligible kinds persist as Operational Memory or Promotion Candidate with provenance; a later independent sitting retrieves *relevant* records only and provides them to Atlas reasoning. Canonical remains false until STD-002. Remaining gap: later slices do not yet feed this store from company/external events.

**Event ingestion** — SPEC-004 + SPEC-005 Hub receive. Destination: one ingest path for company events **and** external technology events. Gap today: FounderOS panel + in-process staff bus.

**Working Knowledge** — SPEC-003 Idea Vault. Destination: vault entries can enter the loop as labeled Working Knowledge, never as Canonical.

**Agent coordination** — SPEC-006 + SPEC-005 Executive Routing. Destination: census of which agent acted, under which charter, with what memory class; then delegation. Gap today: AIO staff bus exists; Cursor/cloud agents are unmanaged.

**Outcome learning** — SPEC-005 classification + STD-002. Destination: outcomes re-enter Memory Keeper and can become Operational Memory or Promotion Candidates.

**Internal Company Awareness** — SPEC-004 ops. Destination: Atlas knows TalkForge head to toe without interrogation.

**External Technology Intelligence** — SPEC-004 environment + SPEC-005 ingest + SPEC-003 if promoted. Destination: Atlas understands material external change without turning discovery into Constitution.

---

## 8. Implementation roadmap (explicit)

Implement in this order. Each slice needs its own Founder execute. None of these invent the destination; they build it.

1. **Executive Memory** — **G1 persist + relevance-filtered recall proven (Working Knowledge, not Canonical).** Memory Keeper on sitting close; later independent sittings retrieve relevant classified records with provenance into Atlas reasoning. Raw thread stays Temporary. Retrieved Operational Memory is not Canonical. STD-002 remains the only Canonical path. Loader freeze stays. Founder-visible runtime stays off. Do not treat this as Canonical admission.
2. **Unified event ingestion** — company events and (later) external events into Hub `receive`. Start by adapting existing awareness signals + staff bus. No new AIO office.
3. **Agent census / coordination** — which agent ran, under which charter, what it produced, how Memory Keeper classified it.
4. **Outcome learning** — execution results classified; Operational Memory updates the next pass; Promotion Candidates enter STD-002 (REF-R1110).
5. **Autonomous Atlas operating loop** — the destination loop running continuously (still non-sovereign; Founder-visible delivery remains off until a separate Decision).
6. **External Technology Intelligence** — scoped external observation; Working/Operational first; never Canonical by discovery.
7. **Governed agency** — Atlas may execute only inside **explicitly delegated** authority. Not implied by learning. Not a silent grant.

Do **not** start at step 7. Do **not** skip Executive Memory.

G0 named the destination. G1 is persist plus relevance-filtered recall. Slices 2–7 remain unstarted.

---

## 9. What this slice does not do

- Amend SPEC-001–006, STD-001–006, or GOV-MAINT
- Lift Ask Atlas loader freeze
- Turn on `ATLAS_RUNTIME_FOUNDER_VISIBLE`
- Expand ATLAS-P6 AIO offices
- Change Living Profile, Coach, or Forge so they “feed Atlas”
- Add Idea Vault metadata fields
- Write a Decision into `atlas/decisions.md` (admission is Founder-only)

---

## 10. Decision pack (not admitted)

Fields ready for DEC-LEDGER when the Founder admits. **Status: not recorded in `atlas/decisions.md`.**

Title: Admit ACI-001 ATOS Continuous Intelligence as the company-OS learning architecture (Working → Canonical only if admitted)

Reason: Atlas must learn and remember under governance; TalkForge stays the product; SPECs stay frozen.

Alternatives considered: Seventh ATOS system; permanent sitting amnesia; Technology Intelligence = in-house AIs only; leave the autonomous loop implied.

Blind spots: BS-017 · BS-006

Risks: Fabricated Canonical; Atlas sovereignty; SPEC drift; premature agency.

Final Decision: *(blank — Founder)*

Future Review Date: *(blank — Founder)*

Volumes: ACI-001 · IV-AI-010 · BS-017 · SPEC-001…006 · STD-002 · RUNTIME-MEM

Status: Working Knowledge only
