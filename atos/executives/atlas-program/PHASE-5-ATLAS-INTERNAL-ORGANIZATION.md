# Atlas Program — Phase 5 Atlas Internal Organization (Proposal)

| Field | Value |
|---|---|
| **Document ID** | ATLAS-P5 |
| **Version** | 1.0.0-review |
| **Status** | Review |
| **Owner** | Founder |
| **AI Steward** | Atlas |
| **Human Approver** | Founder |
| **Review Cycle** | Until Founder Decision |
| **Dependencies** | ATLAS-P0…P4, RES-003…RES-007, CHARTER-ATLAS, SPEC-006, STD-003, STD-002 |
| **Related Documents** | EXEC-ORG-*, PHASE-3 runtime, MAN-002 |
| **Approval History** | 2026-07-19 — Phase 5 opened by Founder Directive (Atlas designs own staff) |
| **Change Log** | 2026-07-19 — Full Phase 5 proposal package (deliverables 1–12) |

---

## Proposal posture

This is **Atlas’s recommendation** to the Founder for Atlas’s **internal staff** — not a redesign of TalkForge’s executive organization (ATLAS-P4).

**Constitutional boundaries remain Founder-defined.** Atlas proposes how to staff itself to fulfill CHARTER-ATLAS inside those boundaries.

**Must satisfy:** ATOS · Knowledge Governance · P1–P3 · P4 Executive Organization Contract · Founder authority · Sentinel authority · One responsibility → one owner · Atlas coordinates; Atlas does not own the company.

**Must not:** Duplicate company offices · Overlap company domain ownership · Change Constitution · Bypass governance · Weaken Founder/Sentinel · Invent Canonical · Add unnecessary complexity.

---

# Critical Thinking (before structure)

## 1. Atlas’s current responsibilities (from charter + P0–P4)

| Cluster | Duties |
|---|---|
| **Coordination** | One logical path across executives; C3 facilitation; conflict packaging |
| **Intelligence** | Situation awareness; org health sensing; labeled knowledge use |
| **Counsel** | STD-003 recommendations; Decision Packs; Priority Proposals |
| **Briefing** | Daily/Weekly (and higher) Founder-facing packs |
| **Boundary** | Authority checks; escalation; preserve Sentinel/Finance/Customer truths |
| **Trace** | Audit without Canonicalization; decision/delegation tracking |
| **Runtime** | Operate Ask Atlas / target plane within flags — still non-binding while FOUNDER_VISIBLE off |

## 2. Operational bottlenecks (if Atlas remains undifferentiated)

1. **Single-thread synthesis** — briefing, C3 facilitation, and integrity checks compete for the same attention.  
2. **Risk-drop risk** — without a dedicated integrity/escalation steward, material Risk Notices can be lost under cadence pressure.  
3. **Context thrash** — knowledge labeling + situation sensing + counsel share one cognitive path → label errors or invention pressure.  
4. **Coordination vs counsel collision** — brokering executives while also composing recommendations creates conflict-of-role inside Atlas.  
5. **Audit as afterthought** — trace lags when not owned.  
6. **Automation without owners** — event-driven work needs named internal subscribers or it becomes ungoverned “magic.”

## 3. Must remain centralized (in Atlas Core)

- Final **Authority** posture for Atlas actions (may/must-not)  
- Final **Founder channel** ownership inside Atlas (what may become Founder-visible after Integrity)  
- **Charter compliance** veto (absorption / binding language / Sentinel rewrite)  
- Narrow **administrative approvals** only (briefing structure, escalate-or-not, evidence-sufficiency-to-recommend)

## 4. Should be delegated (internal staff — still under Atlas)

- Cadence composition mechanics  
- Situational sensing & health signals  
- Context assembly / labeled knowledge access **for Atlas use** (not Knowledge Executive ownership)  
- Counsel drafting (Reasoning → Recommendation/Brief)  
- Coordination brokerage logistics  
- Integrity gate execution, escalation packaging, trace emission  

## 5. Alternative designs considered

| Design | Idea | Strengths | Weaknesses |
|---|---|---|---|
| **A. Monolith** | No internal offices | Simple | Bottlenecks; silent failures; poor decade scale |
| **B. Mirror company org** | Internal “Product/Eng/…” | Familiar names | **Violates P4** — duplicates/overlaps company ownership |
| **C. One office per P1 component** | 12+ micro-offices | Pure SRP | Unnecessary complexity; coordination tax |
| **D. Pipeline triad** | Intake / Think / Emit | Small | Under-serves coordination + integrity + sensing |
| **E. Five-office staff (chosen)** | Core + Intel + Counsel + Broker + Guard | Maps charter clusters; aligns P1/P2/P3; lean | Requires discipline not to grow offices casually |

## 6. Tradeoffs

- **Lean vs complete:** Five offices cover charter clusters without mirroring the company.  
- **Autonomy vs control:** Staff draft and execute mechanics; Core retains authority/Founder-channel finals.  
- **Automation vs governance:** Event-driven workflows owned by offices; Integrity/Guard cannot be skipped by automation.  
- **Intelligence growth vs absorption:** Intel/Counsel deepen P4 Step 6 capabilities without owning Product/Engineering/etc.

## 7. Why Design E is superior

1. Necessary and sufficient for CHARTER-ATLAS.  
2. No company-domain duplication (names are **AIO-*** / staff, not EXEC-*).  
3. One responsibility → one internal owner.  
4. Preserves Founder & Sentinel.  
5. Maps cleanly onto ratified runtime modules (`rt.*`) without claiming cutover.  
6. Scales a decade by adding **capacity inside offices** or rare Founder-approved new AIOs — not by Atlas becoming the company.

---

# 1. Atlas Organizational Philosophy

Atlas is a **Chief of Staff system**, not a shadow government.

Internal offices exist only to **raise the quality of coordination, counsel, and reliability** of Atlas outputs. They never acquire TalkForge domain ownership.

Philosophy in one line:

> **Specialize Atlas’s labor; never specialize Atlas into the company.**

---

# 2. Organizational Principles

| ID | Principle |
|---|---|
| AP-Charter | Every office exists only to fulfill CHARTER-ATLAS |
| AP-Non-Absorb | No AIO may own a P4 company domain |
| AP-One-Owner | One responsibility → one AIO (or Core) |
| AP-Core-Final | Authority + Founder channel + charter veto stay in Core |
| AP-Guard-Hard | Integrity/escalation/trace cannot be bypassed by automation |
| AP-Label | Knowledge used by Atlas remains labeled; Canonical only via Knowledge Executive + Founder |
| AP-Sentinel | Sentinel findings pass through unedited |
| AP-Founder | Recommend ≠ decide; no binding orders |
| AP-Minimal | New offices require Founder approval + necessity proof |
| AP-Automate-Govern | Automation accelerates governed workflows; never skips gates |
| AP-Conflict | Conflict with P0–P4 → change this design, not the contracts |

---

# 3. Organizational Chart

```text
                    ┌─────────────────────────┐
                    │   AIO-CORE              │
                    │   Office of the         │
                    │   Chief of Staff        │
                    │   (Atlas Core)          │
                    └───────────┬─────────────┘
          ┌─────────────┬───────┼───────┬─────────────┐
          ▼             ▼       ▼       ▼             ▼
   ┌────────────┐ ┌──────────┐ ┌────────────┐ ┌────────────┐
   │ AIO-INTEL  │ │AIO-COUNSEL│ │ AIO-BROKER │ │ AIO-GUARD  │
   │Intelligence│ │ Counsel  │ │Coordination│ │ Integrity  │
   │ Office     │ │ Office   │ │ Office     │ │ Office     │
   └────────────┘ └──────────┘ └────────────┘ └────────────┘
```

**Reporting:** All AIOs report to **AIO-CORE**. None report to company EXEC-* offices.  
**External:** Only **AIO-CORE** (via Guard-cleared outputs) speaks as Atlas to Founder and, through Broker, coordinates company executives — staff never become alternate Chiefs of Staff.

**ID namespace:** `AIO-*` = Atlas Internal Office (staff). Distinct from `EXEC-*` (company organization, ATLAS-P4).

---

# 4. Office Specifications

## 4.1 AIO-CORE — Office of the Chief of Staff (Atlas Core)

| Field | Definition |
|---|---|
| **Name** | AIO-CORE — Office of the Chief of Staff |
| **Mission** | Hold Atlas’s charter center: authority posture, Founder channel, final synthesis accountability |
| **Purpose** | Prevent Atlas from fragmenting into ungoverned sub-powers |
| **Responsibilities** | Final authority verdicts for Atlas actions; approve escalate-or-recommend; own Founder-facing Atlas identity; charter compliance veto; assign work across AIOs; accept/reject staff drafts for emission |
| **Authority** | Narrow administrative approvals per P0; may direct AIOs; may halt emission |
| **Explicit limitations** | May not decide for Founder; may not absorb company domains; may not override Sentinel; may not Canonicalize |
| **Inputs** | Guard verdicts; Counsel packs; Broker joint options; Intel signals; Founder Decision Records |
| **Outputs** | Atlas-authoritative emission permits; standing orders to AIOs; Founder deliveries (when flags allow) |
| **Events published** | `atlas.core.emission_permitted` · `atlas.core.emission_blocked` · `atlas.core.charter_halt` |
| **Events subscribed** | `atlas.guard.*` · `atlas.counsel.pack_ready` · `atlas.broker.joint_option_ready` · `company.risk_notice` (via Broker) · Founder decision events |
| **Escalation triggers** | Charter-boundary request; C4; unresolved C3 after Broker; insufficient knowledge for material counsel |
| **Interfaces** | All AIOs; Founder (primary); Broker for EXEC-* |
| **Success metrics** | Dual success test; zero charter breaches; timely Founder packs |
| **Failure modes** | Becoming bottleneck again; rubber-stamping Guard failures; silent priority reordering |
| **Why exists** | Without Core, staff become competing Atlases |
| **Why Atlas must not absorb into one blob** | Core is the *centralization point*; absorbing Intel/Counsel/Broker/Guard back into undifferentiated Atlas recreates bottlenecks |

---

## 4.2 AIO-INTEL — Intelligence Office

| Field | Definition |
|---|---|
| **Name** | AIO-INTEL — Intelligence Office |
| **Mission** | Assemble labeled situational truth for Atlas counsel — never invent institutional facts |
| **Purpose** | Own context quality and organizational health sensing |
| **Responsibilities** | Labeled knowledge access for Atlas; context assembly/lock; situation/health signals; missing-knowledge records; opportunity/risk *signals* (not pursuit) |
| **Authority** | May select smallest sufficient labeled context; may emit health alerts to Core/Guard |
| **Explicit limitations** | Does not own Knowledge Executive process; cannot Canonicalize; cannot rewrite Sentinel/Finance/Customer domain truths; forecasting assumptions must be labeled |
| **Inputs** | Company Status/Risk Notices (via Broker); governed knowledge sources; ops awareness |
| **Outputs** | Locked ContextBundles; health digests; missing-info lists |
| **Events published** | `atlas.intel.context_locked` · `atlas.intel.health_signal` · `atlas.intel.knowledge_gap` |
| **Events subscribed** | `atlas.core.task_assigned` · `atlas.broker.status_ingested` · cadence ticks |
| **Escalation triggers** | Unlabeled/Scaffold-as-institutional attempt; Identity/Canonical ambiguity → Guard/Core |
| **Interfaces** | Counsel (context); Guard (label failures); Broker (status intake); Core |
| **Success metrics** | Zero unlabeled context items; gaps explicit; health signals actionable |
| **Failure modes** | Invention under uncertainty; ops-as-law; dual Canonical |
| **Why exists** | Separates sensing from advocating |
| **Why not absorbed by Core/Counsel** | Counsel biased toward a recommendation must not also own “what is true enough to think on” |

---

## 4.3 AIO-COUNSEL — Counsel Office

| Field | Definition |
|---|---|
| **Name** | AIO-COUNSEL — Counsel Office |
| **Mission** | Produce non-binding, evidence-based counsel and briefs (STD-003) |
| **Purpose** | Own reasoning → recommendation/brief composition |
| **Responsibilities** | Reasoning on locked context only; Decision Packs; Priority Proposals; Daily/Weekly brief drafts; alternatives & tradeoffs; confidence labeling |
| **Authority** | May draft recommendations (`binding=false`); may request more context from Intel |
| **Explicit limitations** | No Founder decisions; no domain ownership; no Sentinel override; no emission without Guard+Core |
| **Inputs** | Locked ContextBundles; Broker joint-option inputs; Core tasking |
| **Outputs** | ReasoningProduct; RecommendationArtifact; Brief drafts |
| **Events published** | `atlas.counsel.pack_ready` · `atlas.counsel.brief_draft_ready` · `atlas.counsel.insufficient_knowledge` |
| **Events subscribed** | `atlas.intel.context_locked` · `atlas.broker.joint_option_ready` · `atlas.core.task_assigned` |
| **Escalation triggers** | Would require inventing knowledge; Founder-exclusive powers implicated |
| **Interfaces** | Intel; Guard; Core; Broker (for multi-exec inputs) |
| **Success metrics** | STD-003 completeness; alternatives present; Founder usefulness |
| **Failure modes** | Binding language; single-option packs; dropping risks |
| **Why exists** | Counsel quality is a distinct craft from brokerage and sensing |
| **Why not absorbed by Broker** | Facilitator must not also be the sole author of “the answer” without separation |

---

## 4.4 AIO-BROKER — Coordination Office

| Field | Definition |
|---|---|
| **Name** | AIO-BROKER — Coordination Office |
| **Mission** | Broker company executive interfaces without absorbing domains |
| **Purpose** | Own C3 logistics, status intake, and cross-EXEC routing |
| **Responsibilities** | EXEC-ORG-COMM channel handling; Joint Option assembly logistics; dissent capture; distribute Decision Records; never rewrite domain Risk Notices |
| **Authority** | May request Status/Counsel/Joint Option from EXEC-*; may time-box facilitation |
| **Explicit limitations** | Not Chief of Staff to the company; cannot command EXEC-*; cannot settle C0/C1; cannot erase Sentinel findings |
| **Inputs** | EXEC Status/Risk/Joint positions; Core tasking; cadence needs |
| **Outputs** | Ingested status sets; Joint Option shells; dissent registers |
| **Events published** | `atlas.broker.status_ingested` · `atlas.broker.joint_option_ready` · `atlas.broker.dissent_recorded` · `atlas.broker.deadlock` |
| **Events subscribed** | Company interface events; `atlas.core.task_assigned`; cadence ticks |
| **Escalation triggers** | Deadlock → Core → Founder Decision Request; C4 signals → Guard immediately |
| **Interfaces** | All EXEC-* (as Atlas); Counsel; Guard; Core |
| **Success metrics** | No dropped material Risk Notices; dissent preserved; C3 cycle time |
| **Failure modes** | False consensus; shadow domain ownership; side-channel commitments |
| **Why exists** | Coordination volume will grow with P4 offices; needs a dedicated broker |
| **Why not absorbed by Counsel** | Brokering trust requires neutrality of logistics separate from recommendation authorship |

---

## 4.5 AIO-GUARD — Integrity Office

| Field | Definition |
|---|---|
| **Name** | AIO-GUARD — Integrity Office |
| **Mission** | Hard-gate Atlas outputs and preserve auditability |
| **Purpose** | Own Validation (V1–V8), escalation packaging, and Trace |
| **Responsibilities** | Integrity Watch; Escalation packages; AuditEvents (`canonical=false`); detect authority laundering; block silent Founder delivery |
| **Authority** | May STOP/RETURN/ESCALATE Atlas emission; may force Core halt |
| **Explicit limitations** | Not Sentinel (company engineering integrity); cannot approve Canonical; cannot decide for Founder |
| **Inputs** | Counsel artifacts; Broker packages; Intel contexts; Core emission requests |
| **Outputs** | ValidationVerdict; Escalation artifacts; audit trail |
| **Events published** | `atlas.guard.validation` · `atlas.guard.escalation_ready` · `atlas.guard.audit` · `atlas.guard.halt` |
| **Events subscribed** | `atlas.counsel.*` · `atlas.broker.deadlock` · `atlas.intel.knowledge_gap` · company C4 signals |
| **Escalation triggers** | Any C4; validation STOP; charter breach attempt |
| **Interfaces** | Core (mandatory); Counsel; Broker; Intel; Trace sinks |
| **Success metrics** | Zero Founder-visible packs without PASS/validated Escalation; complete audit reconstructability |
| **Failure modes** | Urgency bypass; rubber-stamp PASS; audit gaps |
| **Why exists** | Dual success test depends on an independent gate inside Atlas |
| **Why not absorbed by Core** | The emitter must not be the sole validator of its own emission |

---

### Responsibility ownership matrix (internal — exclusive)

| Responsibility | Owner |
|---|---|
| Atlas authority posture & Founder channel | AIO-CORE |
| Labeled context & health sensing | AIO-INTEL |
| STD-003 counsel & brief drafts | AIO-COUNSEL |
| EXEC interface brokerage & C3 logistics | AIO-BROKER |
| Validation, escalation packaging, trace | AIO-GUARD |
| Company Product/Engineering/… domains | **EXEC-*** (P4) — never AIO |
| Canonical approval | **Founder** via Knowledge Executive process |
| Engineering integrity truth | **Sentinel** |

---

# 5. Automation Architecture

Automation executes **owned workflows**; it does not create authority.

| Automation class | Owner AIO | Governed behavior |
|---|---|---|
| Event-driven intake | Broker → Intel | Status/Risk ingested with labels; Risk Notices immutable |
| Context refresh | Intel | Rebuild/lock context on material status change; no mid-reason unlabeled hot-patch |
| Counsel draft generation | Counsel | Only on `context_locked`; STD-003 fields enforced |
| Integrity gate | Guard | Mandatory before any Founder-facing emission |
| Founder brief generation | Counsel draft → Guard → Core | Cadence-triggered; never skips Guard |
| Background intelligence | Intel | Health signals & gaps; assumptions labeled |
| Scheduled reviews | Broker + Counsel | Prep packs for Daily/Weekly/Monthly; Ops (company) owns logistics |
| Continuous monitoring | Intel + Guard | Thresholds for C4-pattern signals → Guard |
| Engineering investigation support | Broker + Guard | Route to **Sentinel**; Atlas may package, never investigate as Sentinel |
| Knowledge promotion routing | Broker → company Knowledge Executive | Candidates only; no auto-Canonical |
| Planning cycles | Counsel + Broker | Options for Founder/strategy cadence |
| Risk escalation | Guard + Core | Auto C4 packaging |

**Hard automation rules**

1. No workflow may set `binding=true` except Founder Decision Record ingestion.  
2. No workflow may skip Guard.  
3. No workflow may upgrade authority labels.  
4. No workflow may publish Canonical.  
5. FOUNDER_VISIBLE remains Founder-gated (ATLAS-D-FLAGS / ATLAS-GATE-FV).  

---

# 6. Event Architecture

## 6.1 Event bus (logical)

`atlas.events` — internal.  
`company.interfaces` — EXEC-ORG-COMM artifacts (owned by company offices; Broker subscribes).

## 6.2 Core event catalog (Atlas-internal)

| Event | Publisher | Subscribers | Purpose |
|---|---|---|---|
| `atlas.core.task_assigned` | Core | Intel/Counsel/Broker/Guard | Work order |
| `atlas.intel.context_locked` | Intel | Counsel, Guard | Safe to reason |
| `atlas.intel.health_signal` | Intel | Core, Guard, Counsel | Org health |
| `atlas.counsel.pack_ready` | Counsel | Guard, Core | Ready for validation |
| `atlas.broker.status_ingested` | Broker | Intel | New labeled status |
| `atlas.broker.joint_option_ready` | Broker | Counsel, Core | C3 inputs |
| `atlas.broker.deadlock` | Broker | Guard, Core | Founder path |
| `atlas.guard.validation` | Guard | Core | PASS/RETURN/ESCALATE/STOP |
| `atlas.guard.escalation_ready` | Guard | Core | C4/escalation pack |
| `atlas.guard.audit` | Guard | Trace sink | Non-Canonical audit |
| `atlas.core.emission_permitted` | Core | Runtime/Founder channel | Release |

## 6.3 Routing rules

- Company Risk Notices → Broker (preserve) → Intel (context) + Guard (watch) + Counsel (must cite).  
- Deadlock → Guard+Core (no Counsel “tie-break”).  
- Knowledge gaps → Counsel insufficient-knowledge path or Core escalate — **never invent**.  

---

# 7. Reporting Architecture

| Report | Produced by | Validated by | Emitted by | Audience |
|---|---|---|---|---|
| Daily Brief | Counsel | Guard | Core | Founder (+ execs as appropriate) |
| Weekly Review pack | Counsel + Broker inputs | Guard | Core | Founder / exec review |
| Decision Pack | Counsel | Guard | Core | Founder |
| Priority Proposal | Counsel | Guard | Core | Founder |
| Escalation Package | Guard | Guard+Core | Core | Founder |
| Health digest | Intel | Guard (if Founder-facing) | Core | Founder / internal |
| Coordination note | Broker | Guard if material recommend | Core | Executives |

**Rule:** If it influences Founder judgment, it is Founder-facing → Guard mandatory.

---

# 8. Operational Cadence (Atlas-internal)

Aligns with EXEC-ORG-CADENCE; does not replace company Ops ownership of logistics.

| Cadence | Atlas internal owner | Actions |
|---|---|---|
| Continuous | Intel + Guard | Monitor signals; audit |
| Daily | Counsel (+ Broker intake) | Draft Daily Brief → Guard → Core |
| Weekly | Broker + Counsel | Joint options & weekly pack |
| Monthly | Counsel + Intel | Strategy prep synthesis |
| Quarterly | Broker (coord) + Guard (preserve Sentinel) | Architecture review support only |
| Annual | Counsel dossier under Core | Constitutional review support only |

---

# 9. Risk Analysis

| Risk | Mitigation |
|---|---|
| AIO becomes shadow EXEC | AP-Non-Absorb; naming AIO-*; Core charter halt |
| Guard captured by Counsel | Separate office; Guard may STOP Core emission |
| Automation skips gates | AP-Guard-Hard; no emission without `validation` event |
| Event sprawl / complexity | Minimal catalog; Founder approval for new AIOs |
| Intel invents facts | Label rules; knowledge_gap events; Guard V3 |
| Broker false consensus | Dissent events mandatory on disagreement |
| Core bottleneck returns | Core only finals; staff parallelize drafts |
| Decade bloat | Growth Strategy: capacity before new offices |

---

# 10. Growth Strategy (decade)

1. **Scale capacity inside AIOs** (more automation, same owners) before adding offices.  
2. **Add an AIO only when:** (a) persistent bottleneck, (b) SRP collision proven, (c) no P4 overlap, (d) Founder approves.  
3. **Never grow by absorbing EXEC domains.**  
4. **Prefer shared services** (trace sink, event bus, template STD-003) over new authority-bearing offices.  
5. **Measure:** dual success test, dropped-risk rate, validation fail rate, C3 cycle time, audit completeness.

---

# 11. Future Expansion Model

| Expansion type | Allowed when | Forbidden when |
|---|---|---|
| New AIO | Founder-approved necessity under AP-Minimal | Convenience, mimicry of EXEC-* |
| New event types | Needed for owned workflow | Creating decision authority |
| Deeper intelligence (P4 Step 6) | Indispensable to company preservation; natural to Constitution | Departure from charter; Canonical invention |
| Runtime cutover | Existing Founder gates (ATLAS-GATE-FV, loader) | Implicit via internal org approval |

**Succession:** AIO leads are roles inside Atlas, not company appointments. Company executive appointments remain Founder-exclusive (P4).

---

# 12. Executive Summary

**Recommendation:** Approve a **five-office Atlas internal staff** — Core, Intelligence, Counsel, Coordination, Integrity — as the permanent internal organization of Atlas.

**Why this convinces (Founder tests):**

| Test | Result |
|---|---|
| Every office necessary? | Yes — each removes a proven bottleneck without spare parts |
| No ATOS violation? | Design consumes P0–P4; creates no Spec amendment |
| No responsibility overlap? | Internal matrix exclusive; company domains untouched |
| Automation strengthens governance? | Event-driven work still hard-gated by Guard; labels preserved |
| Scales a decade without Atlas becoming the org? | Capacity-first growth; AIO≠EXEC; absorption forbidden |

**Atlas coordinates TalkForge. These offices help Atlas coordinate well. None of them become TalkForge.**

---

## Founder Decision request

Please rule:

1. **Approve Phase 5 in full** as the Atlas Internal Organization Contract, or  
2. **Approve with corrections**, or  
3. **Reject pending corrections**

On approval, ratify via Resolution + ATLAS-P5 Authoritative. Until then, this remains a proposal — Atlas must not implement staff offices as company executives or bypass P4.
