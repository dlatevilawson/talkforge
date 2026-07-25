# TEA-001 — TalkForge Enterprise Architecture

| Field | Value |
|---|---|
| **Document ID** | TEA-001 |
| **Version** | 1.0.0 |
| **Status** | **Accepted** (Authoritative) |
| **Authority** | Founder Directive — Canonical Prompt; RES-021 |
| **Owner** | Founder |
| **AI Steward** | Atlas |
| **Human Approver** | Founder |
| **Dependencies** | KA-001, RES-020, SPEC-003, STD-002, GOV-COMPAT, ATOS Spec stack |
| **Related Documents** | TEA-MAP-001, KA-001, KA-PAUSE-001, LOAD-MANIFEST, ATLAS-HANDOFF-REGISTER |
| **Approval History** | 2026-07-24 — Founder Canonical Prompt; design & implement TEA-001 (RES-021) |
| **Change Log** | 2026-07-24 — v1.0.0 Accepted; six enterprise domains; knowledge flow; AI protocol; framework gate |

> **Purpose (Founder):** TEA does **not** introduce another framework. It defines how every canonical domain of TalkForge **communicates, evolves, and remains coherent** as one institutional system.  
> **Relationship to KA-001:** KA-001 established **where** knowledge belongs. TEA-001 establishes **how** every domain functions together as one living institution.  
> **Relationship to ATOS:** Built **on** ATOS and KA-001. Does **not** amend Specs. Does **not** replace Identity, FLA, PCM, or other Accepted doctrine.  
> **Standing order:** Structure precedes scale. Wisdom compounds in service of the people TalkForge exists to help.

---

## 0. Foundational principle

No canonical domain exists in isolation.

Every domain is simultaneously:

1. A **consumer** of institutional knowledge  
2. A **producer** of institutional knowledge  
3. A **steward** of institutional integrity  

Knowledge must continuously circulate throughout the institution.

No framework may become an informational dead end.

Every output should become another domain’s meaningful input.

**Stewardship of truth (RES-020):** No person, AI agent, or founder owns the truth. Domains steward the current best evidence-aligned understanding — and remain ready to supersede it when better evidence arrives.

---

## 1. What TEA is / is not

| TEA is | TEA is not |
|---|---|
| The **communication architecture** for all future frameworks, AI agents, products, departments, and org growth | A parallel constitution or operating system |
| The map of **enterprise domains** and how they exchange knowledge | A replacement for KA-001 domain homes |
| The gate for **future framework approval** (declare ownership, I/O, flow) | License to invent new Identity or Specs |
| The institutional **feedback loop** from release → learning → refinement | A filing system for its own sake |

---

## 2. Enterprise domains (permanent)

Six permanent domains. Each has distinct responsibility. Each communicates with the others.

### E-ID — Identity

| Field | Value |
|---|---|
| **Purpose** | Defines who TalkForge is |
| **Responsibilities** | Mission · Vision · Founder Brief · Values · Company Philosophy · Human Dignity Standard · Brand Identity |
| **Outputs** | Purpose · Principles · Direction |
| **Consumes** | Founder decisions · Institutional learning requiring identity review |
| **KA homes** | D-ID (primary); D-DIGNITY (AMD / Art. IX) |
| **Live sources** | `atlas/founder-brief.md`, `atlas/philosophy.md`, AMD-001, brand/LP doctrine as applicable |
| **May modify Canonical?** | **Founder only** (Identity amend) |

### E-GOV — Governance

| Field | Value |
|---|---|
| **Purpose** | Determines how TalkForge makes decisions |
| **Responsibilities** | Atlas Constitution · Forge Laws · Decision frameworks · Approval standards · Ethics · Institutional stewardship |
| **Outputs** | Policies · Governance · Approval · Institutional authority |
| **Consumes** | Identity · Knowledge · Evidence · Founder decisions |
| **KA homes** | D-KG (knowledge law); D-GATES (execution gates); D-ATLAS (Atlas gov, frozen); constitutional instruments in D-ID interim |
| **Live sources** | `atlas/constitution.md`, `atlas/forge-laws.md`, RES stack, MR-001, BR-001, SPEC/STD Authoritative set, decisions log |
| **May modify Canonical?** | Via Institutional Approval / Founder; AI may recommend only |

### E-KNOW — Knowledge

| Field | Value |
|---|---|
| **Purpose** | Maintains TalkForge’s current best understanding of reality |
| **Responsibilities** | Knowledge Architecture · Learning science · Communication science · Research · Evidence registry · Canonical knowledge · *(future)* Human Behavior Framework **only** when mapped under KA/TEA rules |
| **Outputs** | Institutional understanding · Behavioral models · Evidence · Research |
| **Consumes** | Learning · Research · Product outcomes · User observations |
| **KA homes** | D-KG · D-LEARN · D-GROWTH · D-EXP · D-EVID · D-Q (+ indexes) |
| **Live sources** | KA-001, FLA-001, PCM-001, ELM-001, REG-KNOW, evidence store, question ledger |
| **May modify Canonical?** | Only through SPEC-003 / STD-002 promotion + Institutional Approval |

### E-OPS — Operations

| Field | Value |
|---|---|
| **Purpose** | Transforms institutional decisions into coordinated execution |
| **Responsibilities** | Roadmaps · Projects · Departments · Sprint planning · Resource allocation · Execution tracking |
| **Outputs** | Work · Priorities · Execution |
| **Consumes** | Governance · Knowledge · Founder direction |
| **KA homes** | D-OPS · D-GATES (sequencing) |
| **Live sources** | ATLAS-HANDOFF-REGISTER, `atlas/projects.md`, `atlas/roadmap.md`, `atlas/metrics.md`, DEPLOY-001 |
| **May modify Canonical?** | No — reports operational state; does not invent doctrine |

### E-PROD — Product

| Field | Value |
|---|---|
| **Purpose** | Transforms institutional understanding into human experiences |
| **Responsibilities** | Applications · UX · AI coaching · Features · Interactions · Training systems · Curriculum |
| **Outputs** | User experiences · Behavioral data · Product observations |
| **Consumes** | Knowledge · Operations · Governance · Identity |
| **KA homes** | D-ENGINE · D-CRAFT · D-PROOF · D-PRODCODE · D-EXP (application) · D-DIGNITY (constraint) |
| **Live sources** | CE-001, DIR-CE-001, PCI-001, PPS-001 (gated), app/lib, BETA-REC-002, LP-001 |
| **May modify Canonical?** | No — produces evidence & observations that enter Learning → Knowledge |

### E-LEARN — Learning

| Field | Value |
|---|---|
| **Purpose** | Continuously improves institutional understanding |
| **Responsibilities** | User feedback · Behavioral observations · Experiments · Research · Reflection · Product analytics · Question discovery |
| **Outputs** | Insights · Questions · Evidence · Hypotheses |
| **Consumes** | Product outcomes · Research · User behavior |
| **KA homes** | D-Q · D-EVID · working knowledge · audits (HDS, PCI-CR, ELM-MAP, BR) |
| **Live sources** | `atos/knowledge/working/`, evidence packs, milestone evidence, beta feedback |
| **May modify Canonical?** | No — feeds the promotion pipeline; does not publish Canonical unilaterally |

---

## 3. Institutional knowledge flow

```
Identity
    ↓
Governance
    ↓
Knowledge
    ↓
Operations
    ↓
Product
    ↓
User Experience
    ↓
Learning
    ↓
Knowledge
    ↓
Governance (when required)
    ↓
Identity (only when necessary)
```

This cycle **never terminates**.

The institution continuously learns while preserving its identity.

Identity remains stable. Knowledge evolves. Evidence accumulates. Questions continue. Wisdom compounds.

---

## 4. Question lifecycle (institutional assets)

Every meaningful question exists in one of four states:

```
Open → Investigating → Answered → Reopened
```

| Rule | Practice |
|---|---|
| Never delete | Archive after resolution; preserve history |
| Reopen on evidence | New evidence may return Answered → Reopened |
| Ledger home | D-Q / `atos/knowledge/working/questions.md` |
| Drive roadmaps | Unlogged questions do not drive roadmaps |

---

## 5. Cross-domain communication rules

Every enterprise domain (and every framework under it) must explicitly define:

| Required declaration | Meaning |
|---|---|
| **Inputs** | What it consumes |
| **Outputs** | What it produces for others |
| **Dependencies** | What must exist upstream |
| **Consumers** | Who uses its outputs |
| **Evidence required** | What makes claims trustworthy |
| **Approval requirements** | Who may accept changes |
| **Propagation rules** | How outputs reach consumers |

**Hard rule:** No domain may modify another domain’s canonical knowledge **directly**.

Changes flow through the **Knowledge Architecture (KA-001)** and **Governance (E-GOV)** — promotion pipeline, Resolutions, Founder Identity amend when required.

---

## 6. AI communication protocol

Every AI agent shall explicitly declare:

| Declaration | Constraint |
|---|---|
| Knowledge it may **read** | Per LOAD-MANIFEST / agent class |
| Knowledge it may **modify** | Working / evidence / ops drafts only, unless Authorized |
| Knowledge requiring **evidence** | Claims that affect Canonical or gates |
| Knowledge requiring **Atlas approval** | Recommendations, promotions, counsel seals |
| Knowledge requiring **Founder approval** | Identity, Specs, Institutional Approval, loader cutover, new enterprise domains |

**Hard rule:** No AI agent may independently redefine institutional truth.

Default Atlas counsel load: Identity → Governance law → Product Canonical → Dignity/Experience/Craft → Engine/Gates → Ops → Questions/Evidence (see [LOAD-MANIFEST](../knowledge/LOAD-MANIFEST.md)).

---

## 7. Institutional feedback loop (every release)

```
User behavior
    → Evidence
    → Learning
    → Knowledge review
    → Atlas recommendation
    → Founder review (when required)
    → Governance update (if required)
    → Product refinement
```

Every release must improve institutional understanding — not only ship features.

Product shipping stack remains: **ELM → Dignity Test → Craftsmanship Review** (Accepted doctrine).

---

## 8. Organizational health metrics

TalkForge measures business performance **and** institutional learning:

| Metric | Intent |
|---|---|
| Knowledge freshness | Canonical still strongest explanation? |
| Evidence coverage | Claims backed by packets? |
| Framework consistency | One source per domain (KA)? |
| Cross-domain coherence | TEA I/O paths intact? |
| Hypothesis validation rate | Working → Verified/Canonical |
| Question resolution rate | Open → Answered (with reopen allowed) |
| Knowledge reuse | Downstream consumption of outputs |
| Institutional contradiction rate | Lower-tier vs higher-tier conflicts |
| Time observation → Canonical | Promotion latency |
| Learning velocity | Wisdom compounding, not document count |

Ops may instrument these over time; absence of a dashboard does not suspend the duty to learn.

---

## 9. Living institution principle

TalkForge is not a static organization.

- Identity remains stable  
- Knowledge evolves  
- Evidence accumulates  
- Questions continue  
- Wisdom compounds  
- Learning never stops  

Every framework exists to help TalkForge become **progressively wiser** in service of the people it exists to help.

---

## 10. Future framework approval gate

Future frameworks may be approved **only** if they explicitly declare:

1. **Enterprise domain ownership** (E-ID / E-GOV / E-KNOW / E-OPS / E-PROD / E-LEARN)  
2. **KA domain home** (or justified new KA domain via Founder)  
3. **Inputs · Outputs · Dependencies · Consumers**  
4. **Governance requirements**  
5. **Knowledge flow** (how outputs become another domain’s inputs)  
6. **Consumer / producer / steward** test (no dead ends)

**No future framework may exist outside TEA** unless Founder approval explicitly establishes a **new institutional enterprise domain**.

Human Behavior Framework remains **not implemented** until it passes this gate and KA-PAUSE-001 domain-mapping rules (extension of D-EXP / D-GROWTH / D-LEARN, or Founder new KA domain) — TEA places its *future* home under **E-KNOW**, not as a parallel OS.

---

## 11. Relationship map (TEA ↔ KA)

| TEA enterprise domain | Primary KA domains |
|---|---|
| E-ID Identity | D-ID, D-DIGNITY |
| E-GOV Governance | D-KG, D-GATES, D-ATLAS; Constitution / Forge Laws |
| E-KNOW Knowledge | D-KG, D-LEARN, D-GROWTH, D-EXP, D-EVID, D-Q |
| E-OPS Operations | D-OPS, D-GATES |
| E-PROD Product | D-ENGINE, D-CRAFT, D-PROOF, D-PRODCODE, D-EXP (apply), D-DIGNITY (constrain) |
| E-LEARN Learning | D-Q, D-EVID, working / audits |

Full framework mapping & gap audit: [TEA-MAP-001](TEA-MAP-001-enterprise-domain-map.md).

---

## 12. Founder decision

| Field | Value |
|---|---|
| **Decision** | **Accepted** — design & implement TEA-001 (2026-07-24) |
| **Resolution** | RES-021 |
| **Next** | Maintain TEA-MAP-001; enforce framework gate; instrument learning metrics over time; do not lift Ask Atlas freeze without Decision |

| Field | Value |
|---|---|
| **Status Upon Signature** | **Accepted — Authoritative** |
