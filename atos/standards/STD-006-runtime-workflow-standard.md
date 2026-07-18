# Runtime Workflow Standard (RWS)

| Field | Value |
|---|---|
| **Document ID** | STD-006 |
| **Version** | 1.0.0 |
| **Status** | Draft |
| **Owner** | Founder |
| **AI Steward** | Atlas |
| **Human Approver** | Founder |
| **Review Cycle** | On constitutional amendment |
| **Dependencies** | SPEC-005 |
| **Related Documents** | MAN-013 |
| **Approval History** | 2026-07-18 — Persisted under RES-001 / M1 as Draft |
| **Change Log** | 2026-07-18 — M1 repository organization: file created |

> Authority note: Content is the Founder-dictated ATOS architecture text. RES-001 authorizes persistence for Version 1.0 implementation. Per this specification’s Approval section, **Authoritative** status requires explicit Founder ratification of the document itself.

---

ATOS Standard 006 — Runtime Workflow Standard (RWS)

Version: 1.0 (Draft)

Purpose

Defines how requests move through the Runtime Infrastructure.

⸻

Workflow Lifecycle

1. Receive Request
2. Intent Analysis
3. Executive Selection
4. Context Injection
5. Execution
6. Validation
7. Memory Classification
8. Response
9. Logging

⸻

Context Rules

Runtime loads only:

* Relevant knowledge
* Current operational state
* Applicable standards
* Required specifications

No unnecessary context shall be injected.

⸻

Memory Rules

Execution results become:

* Temporary Memory
* Operational Memory
* Promotion Candidate
* Discarded Information

Classification precedes storage.

⸻

Sandbox Rules

Sandbox environments:

* Cannot modify institutional knowledge.
* Cannot alter operations directly.
* Produce proposals only.
* Must remain isolated.

⸻

Logging Requirements

Every execution records:

* Request
* Context
* Executives involved
* Decisions
* Outputs
* Memory classification
* Completion status

⸻

Success Criteria

Runtime workflows are:

* Efficient
* Traceable
* Governed
* Scalable
* Modular

⸻
