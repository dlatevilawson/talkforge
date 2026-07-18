# Runtime Records (Reference Series R1001–R1006)

| Field | Value |
|---|---|
| **Document ID** | RUNTIME-RECORDS |
| **Version** | 1.0.0-m5 |
| **Status** | Draft |
| **Owner** | Founder |
| **AI Steward** | Sentinel |
| **Human Approver** | Founder |
| **Review Cycle** | On storage-plane change |
| **Dependencies** | ADR-0001, SPEC-005, STD-006 |
| **Related Documents** | REG-RUNTIME, Execution Logger interface |
| **Approval History** | 2026-07-18 — M5 Draft |
| **Change Log** | 2026-07-18 — Record types defined; git sink forbidden |

---

## Record types

| ID | Name | Contents |
|---|---|---|
| R1001 | Workflow Logs | Stage transitions, request_id, timestamps |
| R1002 | Context Logs | Sources injected, authority labels, exclusions |
| R1003 | Execution History | Executives, decisions, outputs summary |
| R1004 | Sandbox Sessions | Session purpose, proposals, isolation markers |
| R1005 | Memory Classification Logs | Class assigned, disposition, promotion IDs |
| R1006 | Runtime Metrics | Latency, failures, dedupe counts |

## Storage plane

Per ADR-0001: **do not** store high-volume runtime records as git files under `atos/`.

| Plane | Use |
|---|---|
| Git | This specification of record types; registries listing sinks |
| Non-git (future) | Actual R1001–R1006 payloads (DB/object store/log drain) |

Until a sink is implemented, registries mark record stores as `planned`.
