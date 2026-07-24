# Runtime Workflow Documentation

| Field | Value |
|---|---|
| **Document ID** | RUNTIME-WF |
| **Version** | 1.0.0-m5 |
| **Status** | Draft |
| **Owner** | Founder |
| **AI Steward** | Sentinel |
| **Human Approver** | Founder |
| **Review Cycle** | On STD-006 amendment |
| **Dependencies** | STD-006, SPEC-005, RUNTIME-IFACE |
| **Related Documents** | MAN-013, context-framework.md, memory-classification.md |
| **Approval History** | 2026-07-18 — M5 Draft |
| **Change Log** | 2026-07-18 — STD-006 workflow documentation |

---

## Standard lifecycle (STD-006)

1. Receive Request  
2. Intent Analysis  
3. Executive Selection  
4. Context Injection  
5. Execution  
6. Validation  
7. Memory Classification  
8. Response  
9. Logging  

SPEC-005’s shorter list is compatible; Validation is mandatory under RWS.

## Stage contracts

| Stage | Owner component | Success criteria |
|---|---|---|
| Receive Request | Hub | `request_id` assigned; duplicate suppressed if applicable |
| Intent Analysis | Hub | Intent + constraints recorded |
| Executive Selection | Hub + Executive Routing | Executives from REG-EXEC; within delegated authority |
| Context Injection | Context Injector | Context passes authority filter; minimal set |
| Execution | Selected executives (+ Sandbox if needed) | Outputs produced; proposals labeled |
| Validation | Hub / Sentinel (engineering) | Outputs checked against intent + governance |
| Memory Classification | Memory Keeper | Class assigned before storage |
| Response | Hub | Caller receives governed response |
| Logging | Execution Logger | Record fields complete (see records.md) |

## Example — Ask Atlas (interim)

| Stage | Current precursor behavior |
|---|---|
| Receive | `POST /api/atlas` |
| Intent | User question |
| Executive | Atlas |
| Context | `loadAtlasContext()` — legacy Tier D only |
| Execution | `reasoning.ts` + model |
| Validation | Prompt constraints (“don’t invent…”) |
| Memory | Not ATOS Memory Keeper (gap) |
| Response | API response |
| Logging | Application logs (not R100x yet) |

Target: same stages with Context Injector + Memory Keeper per this milestone’s interfaces (implementation Founder-gated).

## Logging minimum fields

Request · Context sources · Executives · Decisions · Outputs · Memory classification · Completion status
