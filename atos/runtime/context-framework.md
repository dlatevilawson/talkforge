# Context Framework

| Field | Value |
|---|---|
| **Document ID** | RUNTIME-CTX |
| **Version** | 1.0.0-m5 |
| **Status** | Draft |
| **Owner** | Founder |
| **AI Steward** | Atlas |
| **Human Approver** | Founder |
| **Review Cycle** | Each milestone / on GOV-KNOW change |
| **Dependencies** | SPEC-005, STD-006, GOV-KNOW, GOV-AUTH, GOV-COMPAT |
| **Related Documents** | RUNTIME-IFACE, REG-KNOW, KNOW-CLASS-LEGACY |
| **Approval History** | 2026-07-18 — M5 Draft |
| **Change Log** | 2026-07-18 — Context injection policy for ATOS runtime |

---

## Purpose

Defines what Runtime may inject into an Execution Context and what it must exclude.

## Allowed context classes

Runtime may load only:

1. **Relevant knowledge** for the intent  
2. **Current operational state** required for the task  
3. **Applicable Standards** (when Authoritative, or labeled Draft if task is governance-authoring)  
4. **Required Specifications** (same authority rules)  
5. **Executive role constraints** from REG-EXEC  

No unnecessary context shall be injected (STD-006).

## Authority tiers

| Tier | Sources | Label in context |
|---|---|---|
| A — Constitutional | Authoritative Specs/Standards/Resolutions | `authority: authoritative` |
| B — Canonical | `atos/knowledge/canonical/*` publications | `authority: canonical` |
| C — Operational | REG-PROJ, ops snapshots, working ops docs | `authority: operational` |
| D — Legacy live | Frozen `atlas/` Ask Atlas corpus | `authority: legacy-atlas` |
| E — Working/Draft | Draft ATOS docs, working knowledge | `authority: draft` (non-binding) |
| F — Proposal | Sandbox outputs | `authority: proposal` |

## Injection rules

1. Prefer the highest applicable tier with the smallest sufficient set.
2. Never present Tier E/F as institutional law.
3. **Scaffold exclusion:** documents with Status `Scaffold` must never be injected as institutional or Canonical knowledge (anti-hollow rule).
4. Until Founder cutover, Tier D remains the live Ask Atlas institutional set; Tier A/B are not auto-substituted into Ask Atlas.
5. Context Injector must attach `document_id`, `status`, and `authority` labels for each source.
6. If required Canonical knowledge is missing, say so — do not invent it (AIEM / Atlas posture).

## Current Ask Atlas binding (interim)

| Mechanism | Binding |
|---|---|
| `atlas/engine/loader.ts` | Tier D only (ten markdown files) |
| ATOS Specs/Standards | Not loaded by Ask Atlas |
| ATOS Canonical library | Empty; not loaded |

Cutover from Tier D → A/B requires Founder approval (GOV-COMPAT).
