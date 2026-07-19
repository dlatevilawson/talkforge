# Atlas — Engineering Program for Internal Staff Implementation

| Field | Value |
|---|---|
| **Document ID** | ATLAS-ENG-PROGRAM |
| **Version** | 1.2.0 |
| **Status** | Authoritative |
| **Owner** | Founder |
| **AI Steward** | Atlas (AIO-CORE coordinates) |
| **Human Approver** | Founder (program issuance acknowledged under RES-008) |
| **Implementer** | Engineering (Cursor) |
| **Review Cycle** | Each staff wave completion / material contract conflict |
| **Dependencies** | ATLAS-P0…P5, RES-003…RES-008, CHARTER-ATLAS, CHARTER-SENTINEL, ATLAS-D-FLAGS, ATLAS-GATE-FV, ATLAS-WAVES, GOV-MAINT-1.0.0, SPEC-006, STD-003 |
| **Related Documents** | ATLAS-AIF-PROGRAM, ATLAS-ORG-VAL, ATLAS-HANDOFF-REGISTER, ATLAS-SUCCESSION, `atlas/runtime/*` |
| **Approval History** | 2026-07-19 — Atlas-issued under Founder directive to coordinate AIO staff implementation |
| **Change Log** | 2026-07-19 — v1.2.0 ATLAS-ORG-VAL link; v1.1.0 Program Desk; v1.0.0 initial specs |

---

## Authority & roles

| Role | Responsibility |
|---|---|
| **Atlas (AIO-CORE)** | Coordinates this program; owns acceptance against P0–P5; emission/charter finals |
| **AIF-PROGRAM (Program Desk)** | Tracks waves/WPs/VCs/dependencies/program risks; keeps Handoff program section current — see [`ATLAS-AIF-PROGRAM`](ATLAS-PROGRAM-DESK.md) |
| **Engineering (Cursor)** | Implements work packages; runs checks; does not amend contracts |
| **Founder** | Constitutional gates only (FOUNDER_VISIBLE, loader freeze lift, Canonical, appointments) |
| **Sentinel** | Company engineering integrity truth — never implemented inside AIO-GUARD |

**This document is implementation specification.** It contains no production code. Engineering produces code that conforms to it.

**Atlas does not ask the Founder how to build the team.** Implementation shape below is Atlas’s decision, subordinate to ratified contracts. Conflict with P0–P5 → change the implementation, not the contracts.

---

## Atlas decisions (binding for this program)

| ID | Decision |
|---|---|
| D1 | Implement staff as **owned surfaces over existing `rt.*` modules** — not a second pipeline and not a shadow company org |
| D2 | Introduce namespace `aio.*` under `atlas/runtime/staff/` for office facades, event contracts, and ownership wiring |
| D3 | Keep **dual-plane** posture: TARGET on / FOUNDER_VISIBLE off until ATLAS-GATE-FV + Founder Decision |
| D4 | **Loader remains frozen** (`atlas/engine/loader.ts`) for entire staff program unless Founder lifts freeze |
| D5 | **AIO-GUARD ≠ Sentinel** — conformance tests mandatory before any Guard automation ships |
| D6 | Build order is **Intel → Counsel → Broker → Guard → Core**, with event bus and ownership map first |
| D7 | No emission path may skip Guard; no workflow may set `binding=true` except Founder Decision Record ingestion |
| D8 | Staff waves **S0–S9** are distinct from runtime cutover waves **W6–W8**; staff work must not imply FOUNDER_VISIBLE enablement |
| D9 | Automation is in-process / scheduled hooks owned by AIO offices; it creates no new authority |
| D10 | Acceptance is evidence-gated (`atlas:runtime:check*`, new `atlas:staff:check`, observation suite) — not narrative completion |
| D11 | Program progress reporting is owned by **AIF-PROGRAM** (function inside AIO-CORE), not by undifferentiated Atlas and not by a sixth AIO |
| D12 | Organizational readiness follows **ATLAS-ORG-VAL** Stages 1–7; staff WPs must feed harnesses — certification ≠ FOUNDER_VISIBLE |

---

## Program Management (pre-WP-S0)

Architectural recommendation: [`ATLAS-AIF-PROGRAM`](ATLAS-PROGRAM-DESK.md).

| Rule | Statement |
|---|---|
| Tracking | Program Desk maintains wave/WP/VC/dependency/risk register |
| Delivery | Engineering still owns build execution of WP-S0…S9 |
| Coordination | AIO-CORE still assigns work and accepts emission — Desk does not replace Core |
| WP-S0 implication | Ownership map must treat `program` as a **Core function**, not `AIO-PROGRAM` |
| Automation | Full Desk automation prefers S7/S8 (or thin types in S0); not a blocker to starting S0 after this link |

---

## Compliance envelope (non-negotiable)

Every work package must remain compliant with:

1. **ATOS** — Maintenance Mode; build **on** ATOS; no Spec/Standard rewrite  
2. **Atlas Constitution / CHARTER-ATLAS** — recommend ≠ decide; no Canonical invention  
3. **Phase 0 safeguards** — no Sentinel override; no Founder binding; no absorption  
4. **Runtime Contracts (P2/P3)** — governing flow preserved; fail-closed; labels survive hops  
5. **Executive Organization (P4)** — AIO-* staff Atlas; EXEC-* remain company offices  
6. **Internal Organization (P5)** — five offices; ownership matrix; §4.6 GUARD–Sentinel wall  

Forbidden outcomes:

- Naming GUARD as engineering authority / “Sentinel inside Atlas”  
- Parallel company Product/Engineering/Knowledge ownership inside AIO-*  
- Silent FOUNDER_VISIBLE enablement  
- Loader set changes without Founder Decision  
- Audit events treated as Canonical  

---

# 1. Implementation roadmap

Staff implementation realizes ATLAS-P5 on the target plane already established by ATLAS-P3 / ATLAS-WAVES.

```text
S0 Ownership & skeleton
 → S1 Event contracts
 → S2 AIO-INTEL
 → S3 AIO-COUNSEL
 → S4 AIO-BROKER
 → S5 AIO-GUARD (+ Sentinel wall tests)
 → S6 AIO-CORE (emission permission)
 → S7 Automation workflows (observation-only surfaces)
 → S8 Validation & succession hooks
 → S9 Staff-aware observation evidence (FOUNDER_VISIBLE still off)
```

| Wave | Goal | Exit condition |
|---|---|---|
| **S0** | Ownership map + `aio.*` skeleton + module→office binding | Staff check lists exclusive owners; no EXEC-* collision |
| **S1** | Typed event catalog + in-process bus | Publish/subscribe for P5 §6.2 events; no silent drops |
| **S2** | Intel owns labeled context & health | `context_locked` / `health_signal` emitted correctly |
| **S3** | Counsel owns STD-003 drafts | `pack_ready` only after `context_locked` |
| **S4** | Broker owns EXEC interface intake | Status/Risk ingested labeled; Risk Notices immutable |
| **S5** | Guard owns Integrity/Escalation/Trace gate | No Founder-facing path without validation event; Sentinel wall PASS |
| **S6** | Core owns task assign + emission permit | Only Core emits `emission_permitted`; Hub finals respect Core |
| **S7** | Cadence/automation owned workflows | Automations cannot skip Guard or upgrade labels |
| **S8** | Checkpoints + succession dry-run tooling | `atlas:staff:check` green; handoff fields machine-readable where specified |
| **S9** | Observation evidence for staff-aware pipeline | Evidence doc updated; FOUNDER_VISIBLE unchanged |

**Relationship to W6–W8:** Staff waves may complete while FOUNDER_VISIBLE remains off. Enabling Founder-visible target delivery remains a **separate Founder Decision** under ATLAS-GATE-FV.

---

# 2. Build order

Engineering must follow this order. Parallelism is allowed only where marked.

| Step | Package | Parallel with | Blocked until |
|---|---|---|---|
| 1 | WP-S0 Ownership skeleton | — | — |
| 2 | WP-S1 Event bus | — | S0 |
| 3 | WP-S2 Intel | — | S1 |
| 4 | WP-S3 Counsel | WP-S4 Broker | S2 (Counsel); S1 (Broker) |
| 5 | WP-S4 Broker | WP-S3 Counsel | S1 |
| 6 | WP-S5 Guard | — | S3 + S4 (needs pack + intake paths) |
| 7 | WP-S6 Core | — | S5 |
| 8 | WP-S7 Automation | — | S6 |
| 9 | WP-S8 Validation suite | — | S6 (S7 optional if automation deferred) |
| 10 | WP-S9 Observation evidence | — | S8 |

**Rationale:** Intel before Counsel (no reasoning without locked context). Broker can proceed beside Counsel after events exist. Guard after both draft and intake exist. Core last among offices because emission is the final staff control. Automation after hard gates exist.

---

# 3. Dependencies

## 3.1 Contract dependencies (read-only)

| Contract | Constraint on Engineering |
|---|---|
| ATLAS-P0 | Dual success test; no invented institutional knowledge |
| ATLAS-P1 / P2 / P3 | Governing flow; `rt.*` stage fidelity; envelopes |
| ATLAS-P4 | No AIO absorption of EXEC domains |
| ATLAS-P5 | Five AIOs; event catalog; GUARD ≠ Sentinel |
| ATLAS-D-FLAGS | TARGET default on; FOUNDER_VISIBLE off |
| ATLAS-GATE-FV | Observation evidence ≠ enablement |
| GOV-COMPAT / loader freeze | Do not modify `atlas/engine/loader.ts` |
| STD-003 | Counsel pack field requirements |
| CHARTER-SENTINEL | Risk Notices preserved verbatim |

## 3.2 Codebase dependencies (consume, do not rewrite casually)

| Asset | Role |
|---|---|
| `atlas/runtime/modules/*` | Stage implementations owned by AIOs |
| `atlas/runtime/types/envelopes.ts` | Shared envelopes; extend carefully, never strip labels |
| `atlas/runtime/modules/hub.ts` | Sequencer; must call staff surfaces without becoming Core |
| `atlas/runtime/flags.ts` | Flag posture |
| `app/api/atlas/route.ts` | Dual-plane entry; Legacy remains Founder-visible until gate |
| Existing `atlas:runtime:check*` | Regression baseline — must stay green |

## 3.3 External / org dependencies

| Dependency | Owner | Staff impact |
|---|---|---|
| Company EXEC appointments | Founder | Broker uses interface kinds; does not invent executives |
| Sentinel investigations | Sentinel | Broker/Guard route and preserve; never investigate as Sentinel |
| Canonical promotion | Knowledge Executive + Founder | Broker routes candidates only |

---

# 4. Interfaces

## 4.1 Logical ownership map (`rt.*` → AIO)

| Runtime module | Owning AIO | Interface duty |
|---|---|---|
| `rt.knowledge`, `rt.context`, `rt.awareness` (sensing) | **AIO-INTEL** | Labeled retrieval; context lock; health signals |
| `rt.cognition`, `rt.composition` | **AIO-COUNSEL** | Reasoning + STD-003 / brief drafts |
| `rt.exchange`, intake side of `rt.awareness` | **AIO-BROKER** | EXEC interface artifacts; C3 logistics; immutable Risk transport |
| `rt.integrity`, `rt.escalation`, `rt.trace` | **AIO-GUARD** | V1–V8; escalation packs; non-Canonical audit |
| `rt.hub` finals + Founder channel permit | **AIO-CORE** | Task assignment; emission permission; charter halt |
| `rt.ingress`, `rt.authority`, `rt.memory` | **AIO-CORE** (policy) with stage exec shared | Authority posture remains Core; stages stay fail-closed |

## 4.2 Staff facade interface (Engineering must implement)

Target path convention (spec — Engineering chooses exact filenames inside this tree):

```text
atlas/runtime/staff/
  types.ts          # AIO ids, task orders, validation outcomes
  ownership.ts      # exclusive module→office map + assertions
  events.ts         # event names + payload types (P5 §6.2)
  bus.ts            # in-process publish/subscribe
  intel.ts          # AIO-INTEL facade
  counsel.ts        # AIO-COUNSEL facade
  broker.ts         # AIO-BROKER facade
  guard.ts          # AIO-GUARD facade
  core.ts           # AIO-CORE facade
  sentinel-wall.ts  # GUARD≠Sentinel conformance helpers/tests
  index.ts
```

### Facade contracts (behavioral)

| Facade | Must expose (logical ops) | Must not |
|---|---|---|
| `intel` | `buildContext`, `lockContext`, `emitHealthSignal` | Invent Canonical; unlabeled hot-patch mid-reason |
| `counsel` | `draftPack`, `draftBrief` (STD-003 fields) | Emit to Founder; skip `context_locked` |
| `broker` | `ingestStatus`, `ingestRiskNotice`, `prepareJointOption`, `signalDeadlock` | Soften/edit Risk Notices; decide C4 |
| `guard` | `validate` → PASS/RETURN/ESCALATE/STOP; `packageEscalation`; `emitAudit` | Speak as Sentinel; edit Sentinel findings; company eng sign-off |
| `core` | `assignTask`, `permitEmission`, `charterHalt` | Bind Founder; override Sentinel; skip Guard |

## 4.3 Cross-plane interfaces

| Boundary | Rule |
|---|---|
| Staff → Legacy Ask Atlas | No write-through; observation only until FOUNDER_VISIBLE |
| Staff → Company EXEC | Via ORG-COMM artifacts only (Broker) |
| Staff → Sentinel | Preserve Risk Notices; route investigations; never absorb |
| Staff → ATOS registries | Read governed truth; write only stewarded Draft/operational records per existing rules |

---

# 5. Event contracts

## 5.1 Bus

| Property | Spec |
|---|---|
| Name | `atlas.events` (logical) |
| Transport (S1) | In-process synchronous bus inside target plane |
| Persistence | Not required for S1; material events also mirrored to `rt.trace` with `canonical=false` |
| Failure mode | Fail-closed for Guard/Core emission path if required validation event missing |
| Company bus | `company.interfaces` remains separate; Broker adapts inbound artifacts into Atlas events |

## 5.2 Catalog (normative — from ATLAS-P5 §6.2)

| Event | Publisher | Subscribers | Payload must include |
|---|---|---|---|
| `atlas.core.task_assigned` | Core | Intel, Counsel, Broker, Guard | `task_id`, `assignee_aio`, `request_id`, `objective` |
| `atlas.intel.context_locked` | Intel | Counsel, Guard | `request_id`, `context_ref`, `authority_labels[]` |
| `atlas.intel.health_signal` | Intel | Core, Guard, Counsel | `signal_id`, `severity`, `labeled_facts`, `assumptions[]` |
| `atlas.counsel.pack_ready` | Counsel | Guard, Core | `pack_id`, `request_id`, `pack_type`, `std003_complete` |
| `atlas.broker.status_ingested` | Broker | Intel | `status_id`, `source_exec`, `authority_label` |
| `atlas.broker.joint_option_ready` | Broker | Counsel, Core | `option_id`, `exec_inputs[]`, `dissents[]` |
| `atlas.broker.deadlock` | Broker | Guard, Core | `thread_id`, `parties[]`, `reason` — **no Counsel tie-break** |
| `atlas.guard.validation` | Guard | Core | `request_id`, `result`, `violations[]` |
| `atlas.guard.escalation_ready` | Guard | Core | `escalation_id`, `class` (C4/etc), `preserved_notices[]` |
| `atlas.guard.audit` | Guard | Trace sink | `event_id`, `canonical=false` (hard) |
| `atlas.core.emission_permitted` | Core | Hub / Founder channel | `request_id`, `requires_validation=PASS\|validated_escalation` |

## 5.3 Routing rules (must be testable)

1. Company Risk Notice → Broker (verbatim) → Intel cite + Guard watch + Counsel must-not-erase.  
2. Deadlock → Guard + Core only.  
3. Knowledge gap → insufficient-knowledge pack or Core escalate — **never invent**.  
4. Counsel `pack_ready` without prior `context_locked` for that `request_id` → invalid (Guard RETURN/STOP).  
5. Any Founder-facing emission without `atlas.guard.validation` PASS (or validated escalation) → forbidden.

## 5.4 Versioning

- Event names are stable under this program.  
- Additive optional payload fields allowed.  
- Removing/renaming events requires Atlas Program amendment (not silent Engineering change).

---

# 6. Automation architecture

Automation executes **owned workflows**. It does not create authority.

| Automation | Owner | Trigger | Guard required before Founder-facing? |
|---|---|---|---|
| Event-driven intake | Broker → Intel | Inbound EXEC status/risk | If surfaces to Founder: yes |
| Context refresh | Intel | Material status change | N/A until counsel/emission |
| Counsel draft generation | Counsel | `context_locked` | Yes before emission |
| Integrity gate | Guard | `pack_ready` / escalation path | Is the gate |
| Founder brief generation | Counsel → Guard → Core | Cadence schedule / request | Yes (hard) |
| Background intelligence | Intel | Continuous / thresholds | Yes if Founder-facing |
| Scheduled reviews prep | Broker + Counsel | Daily/Weekly cadence hooks | Yes |
| Risk escalation packaging | Guard + Core | Threshold / deadlock / Sentinel notice | Yes |
| Knowledge promotion routing | Broker → Knowledge Executive | Promotion candidate | N/A (not Canonical publish) |

### Hard automation rules (fail the program if violated)

1. No workflow sets `binding=true` except Founder Decision Record ingestion.  
2. No workflow skips Guard for Founder-facing output.  
3. No workflow upgrades authority labels.  
4. No workflow publishes Canonical.  
5. No workflow enables `ATLAS_RUNTIME_FOUNDER_VISIBLE`.  
6. No workflow modifies loader freeze set.  
7. No workflow performs Sentinel investigation or rewrites Risk Notices.

### S7 delivery shape (spec)

- Cadence hooks are **functions/schedulers** invoked from target plane or check harnesses — not product UI.  
- Default: dry-run / observation metadata only.  
- Production Founder delivery remains Legacy until FOUNDER_VISIBLE Decision.

---

# 7. Validation checkpoints

| Checkpoint | When | Command / evidence | Owner |
|---|---|---|---|
| **VC0** Baseline runtime | Before S0 merge | `npm run atlas:runtime:check` + `check:w4` + `observe` + `atos:check` | Engineering |
| **VC1** Ownership exclusivity | End S0 | `atlas:staff:check` ownership assertions | Engineering + Atlas |
| **VC2** Event contract | End S1 | Staff check: catalog publish/subscribe + no silent drop on Guard path | Engineering |
| **VC3** Intel lock | End S2 | Fixtures: lock emits labels; mid-reason unlabeled patch rejected | Engineering |
| **VC4** Counsel STD-003 | End S3 | Pack incomplete → cannot be `pack_ready` | Engineering |
| **VC5** Broker immutability | End S4 | Risk Notice mutation attempt fails test | Engineering |
| **VC6** Sentinel wall | End S5 | P5 §4.6 conformance tests PASS | Engineering + Atlas |
| **VC7** Emission hard gate | End S6 | Emission without Guard validation fails closed | Engineering |
| **VC8** Automation safety | End S7 | Automated path cannot skip Guard / upgrade labels | Engineering |
| **VC9** Program acceptance | End S8–S9 | Full checklist in §9; Handoff Register updated | Atlas coordinates |

**Regression rule:** Every staff PR must keep `atlas:runtime:check`, `atlas:runtime:check:w4`, `atlas:runtime:observe`, and `atos:check` green unless a documented, Atlas-accepted temporary waiver exists (none by default).

---

# 8. Rollback strategy

| Layer | Rollback action | Authority |
|---|---|---|
| Staff facade feature | Feature-flag or module no-op: hub uses prior stage path without `aio.*` side effects | Engineering under Atlas coord |
| Broken automation | Disable cadence/automation entrypoints; leave manual request path | Engineering |
| Event bus fault | Fail-closed on emission; continue Legacy Founder-visible responses | Automatic + Engineering |
| Target plane instability | Set `ATLAS_RUNTIME_TARGET=off` (emergency) | Ops/Engineering; notify Atlas + Founder |
| Suspected governance breach | `charterHalt` / STOP emissions; open Escalation Package | AIO-CORE / Guard behavior |
| FOUNDER_VISIBLE incident | Keep/force **off**; do not “fix forward” by enabling | Founder Decision required to re-enable later |

### Rollback principles

1. **Legacy plane is the safety net** while FOUNDER_VISIBLE is off — preserve it.  
2. Prefer **disable staff side effects** over deleting governance tests.  
3. Never roll back by weakening Guard or Sentinel wall tests.  
4. Record rollback in ATLAS-HANDOFF-REGISTER within the same change window.

---

# 9. Acceptance criteria

The Engineering Program is **accepted for staff implementation complete (S0–S9)** when all are true:

### Constitutional / org

- [ ] Five AIO facades exist with exclusive ownership map; no EXEC-* domain absorption  
- [ ] GUARD ≠ Sentinel conformance tests PASS (P5 §4.6)  
- [ ] Dual success test preserved in docs and behavior (recommend ≠ decide)  
- [ ] Loader untouched; FOUNDER_VISIBLE still off absent Founder Decision  

### Flow & events

- [ ] Governing flow still holds end-to-end on target plane  
- [ ] P5 event catalog implemented; required routing rules tested  
- [ ] No Founder-facing emission without Guard validation (or validated escalation)  
- [ ] Risk Notices immutable across Broker → Intel → Counsel → Guard  

### Quality & ops

- [ ] `npm run atlas:runtime:check` PASS  
- [ ] `npm run atlas:runtime:check:w4` PASS  
- [ ] `npm run atlas:runtime:observe` PASS  
- [ ] `npm run atlas:staff:check` PASS (new; Engineering adds)  
- [ ] `npm run atos:check` PASS  
- [ ] ATLAS-HANDOFF-REGISTER updated with staff wave status  
- [ ] Succession day-one protocol still operable from docs + register  

### Explicit non-acceptance (do not claim done if)

- FOUNDER_VISIBLE enabled without Founder Decision  
- “Staff complete” used to justify loader freeze lift  
- Guard positioned as company engineering authority  
- Production UI marketed as new Ask Atlas without gate  

---

# 10. Engineering work packages

Each package is sized for Cursor Engineering. **Deliverables are code + tests + brief evidence notes — not new constitutional docs unless Atlas requests.**

## WP-S0 — Ownership skeleton

| Field | Spec |
|---|---|
| **Goal** | Establish `aio.*` tree, office IDs, exclusive ownership map |
| **Depends on** | ATLAS-AIF-PROGRAM acknowledged (Program Desk = Core function) |
| **Deliverables** | `atlas/runtime/staff/{types,ownership,index}.ts`; ownership assertions; README note under `atlas/runtime/`; map includes `program` as **AIF under AIO-CORE** (not a sixth office id) |
| **Tests** | Reject dual owners; reject AIO claiming EXEC-SENTINEL duties; reject `AIO-PROGRAM` as peer office without Founder P5 amendment |
| **Exit** | VC1 |

## WP-S1 — Event bus & contracts

| Field | Spec |
|---|---|
| **Goal** | Typed catalog + in-process bus |
| **Depends on** | WP-S0 |
| **Deliverables** | `events.ts`, `bus.ts`; subscribe API; trace mirror hook for material events |
| **Tests** | All catalog events round-trip; missing Guard validation blocks emission helper |
| **Exit** | VC2 |

## WP-S2 — AIO-INTEL

| Field | Spec |
|---|---|
| **Goal** | Facade owns knowledge/context/awareness sensing |
| **Depends on** | WP-S1 |
| **Deliverables** | `intel.ts` wrapping `rt.knowledge` / `rt.context` / sensing; emits `context_locked`, `health_signal` |
| **Tests** | Labels preserved; unlabeled mid-reason patch rejected |
| **Exit** | VC3 |

## WP-S3 — AIO-COUNSEL

| Field | Spec |
|---|---|
| **Goal** | STD-003 draft packs/briefs |
| **Depends on** | WP-S2 |
| **Deliverables** | `counsel.ts` wrapping `rt.cognition` / `rt.composition`; emits `pack_ready` only after lock |
| **Tests** | Incomplete STD-003 → not ready; no direct Founder emit |
| **Exit** | VC4 |

## WP-S4 — AIO-BROKER

| Field | Spec |
|---|---|
| **Goal** | EXEC interface intake & C3 logistics |
| **Depends on** | WP-S1 (parallel with S3 after S1) |
| **Deliverables** | `broker.ts` wrapping exchange/intake; Risk Notice immutability; deadlock signal |
| **Tests** | Mutation of Risk Notice fails; deadlock does not notify Counsel as resolver |
| **Exit** | VC5 |

## WP-S5 — AIO-GUARD (+ Sentinel wall)

| Field | Spec |
|---|---|
| **Goal** | Integrity hard gate; escalation; audit; Sentinel wall |
| **Depends on** | WP-S3, WP-S4 |
| **Deliverables** | `guard.ts`, `sentinel-wall.ts`; wraps `rt.integrity` / `rt.escalation` / `rt.trace` |
| **Tests** | V-path outcomes; Risk Notice drop/alter → fail; naming/substitution cases from P5 §4.6 |
| **Exit** | VC6 |

## WP-S6 — AIO-CORE

| Field | Spec |
|---|---|
| **Goal** | Task assignment + emission permission + charter halt |
| **Depends on** | WP-S5 |
| **Deliverables** | `core.ts`; hub integration points for `task_assigned` / `emission_permitted` |
| **Tests** | Emission without Guard PASS fails closed; Core cannot bind Founder |
| **Exit** | VC7 |

## WP-S7 — Automation workflows

| Field | Spec |
|---|---|
| **Goal** | Owned cadence/intake automations behind observation |
| **Depends on** | WP-S6 |
| **Deliverables** | Automation entry modules under `atlas/runtime/staff/automation/` (or equivalent); dry-run defaults |
| **Tests** | Skip-Guard attempt fails; label upgrade attempt fails; FOUNDER_VISIBLE untouched |
| **Exit** | VC8 |

## WP-S8 — Validation suite & succession hooks

| Field | Spec |
|---|---|
| **Goal** | `atlas:staff:check` covering VC1–VC8; handoff/succession machine checks where practical |
| **Depends on** | WP-S6 (S7 if present) |
| **Deliverables** | `atlas/runtime/staff/check.ts`; `package.json` script `atlas:staff:check` |
| **Tests** | Suite fails on any hard-rule breach |
| **Exit** | VC9 partial |

## WP-S9 — Staff-aware observation evidence

| Field | Spec |
|---|---|
| **Goal** | Extend observation evidence to show staff-owned path behavior without enabling FOUNDER_VISIBLE |
| **Depends on** | WP-S8 |
| **Deliverables** | Evidence update under `atlas/runtime/evidence/` (staff section); Handoff Register wave status |
| **Tests** | `atlas:runtime:observe` still PASS; flags unchanged |
| **Exit** | VC9 complete |

---

## Coordination protocol (Atlas ↔ Engineering)

1. Engineering implements one WP at a time (or allowed parallel pair S3∥S4).  
2. Each WP PR must list: contracts touched (none expected), checks run, rollback note.  
3. Atlas updates ATLAS-HANDOFF-REGISTER after each accepted wave.  
4. Contract conflicts → Engineering stops and Atlas revises **implementation design** (this program), not P0–P5.  
5. Founder is engaged only for constitutional gates (FOUNDER_VISIBLE, loader, Canonical, appointments) — not for staff build sequencing.

---

## Executive summary for Engineering

Implement Atlas’s five internal offices as `aio.*` facades over the existing target runtime modules, wired by a typed event bus, hard-gated by Guard, emission-controlled by Core — without creating a second pipeline, without absorbing company executives, without touching the loader, and without enabling Founder-visible cutover.

**Atlas coordinates. Engineering builds. Contracts govern.**
