# KA-001 — TalkForge Unified Knowledge Architecture

| Field | Value |
|---|---|
| **Document ID** | KA-001 |
| **Version** | 1.0.0 |
| **Status** | **Working — Awaiting Founder Approval** |
| **Authority** | Atlas proposes; Founder decides |
| **Owner** | Founder |
| **AI Steward** | Atlas |
| **Human Approver** | Founder |
| **Dependencies** | SPEC-001, SPEC-002, SPEC-003, STD-002, REG-KNOW, GOV-COMPAT, AMD-001, ELM-001, FLA-001, PCM-001, MR-001, PCI-001 |
| **Related Documents** | KA-PAUSE-001, ATLAS-HANDOFF-REGISTER |
| **Approval History** | 2026-07-24 — Issued under Founder order: Structure precedes scale |
| **Change Log** | 2026-07-24 — v1.0.0 unified architecture proposal; reorganization deferred until approval |

> **Standing order for this workstream:** Structure precedes scale.  
> **Pause:** No new frameworks (including any Human Behavior Framework) until KA-001 is approved and existing documents are reorganized into it.  
> **Relationship to ATOS:** Built **on** ATOS. Does **not** amend Specs. Implements SPEC-003 / STD-002 with domain clarity the corpus currently lacks.

---

## 1. Why this exists

TalkForge has accumulated true principles and useful product doctrine — and also **dual planes**, overlapping “foundations,” and two meanings of “Canonical.”

The problem is not a shortage of ideas.

The problem is **coherence**: where truth lives, who owns it, how it earns authority, and how every future agent inherits the same map.

KA-001 is that map.

---

## 2. Design principles (non-negotiable)

1. **One canonical source per domain** (SPEC-003).  
2. **Evidence precedes authority.**  
3. **Identity outranks product outranks ops.**  
4. **Frameworks reference; they do not rewrite.**  
5. **Fewer documents, clearer homes** — no duplicate full-text of Identity.  
6. **Lifelong learning** — questions and evidence have permanent homes.  
7. **AI inheritance is explicit** — load sets follow authority, not folder convenience.

---

## 3. Authority hierarchy

```
FOUNDER (exclusive: Identity amend, Institutional Approval, ATOS amend)
    │
    ▼
IDENTITY ─────────────────── highest product-company truth
    │   Mission · Constitution · Founder Brief · Forge Laws · Philosophy · Art. IX / AMD-001
    ▼
KNOWLEDGE LAW (ATOS) ─────── how the organization learns (SPEC-003 · STD-002)
    │
    ▼
PRODUCT CANONICAL ────────── how TalkForge coaches & grows users (FLA · PCM)
    │
    ▼
PRODUCT DOCTRINE ─────────── how we design & decide (ELM · PCI · CE · gates)
    │
    ▼
OPERATIONAL KNOWLEDGE ────── what is true today (projects · decisions · handoff · metrics)
    │
    ▼
WORKING / EVIDENCE ───────── learning in progress (audits · hypotheses · experiments)
    │
    ▼
ARCHIVE ──────────────────── superseded truth preserved
```

**Rule:** A lower tier may refine application. It may never contradict a higher tier. Conflicts escalate to Founder.

**ATOS Spec stack (unchanged):** SPEC-001 → SPEC-002 → SPEC-003 → SPEC-004 → SPEC-005 / SPEC-006.

---

## 4. Major knowledge domains

Each domain has **exactly one canonical source** (or one designated interim source until then).

| Domain ID | Domain | Purpose | Owner | Canonical source (target) | Interim live source |
|---|---|---|---|---|---|
| **D-ID** | Identity | Why we exist; character; non-negotiables | Founder | ATOS Canonical publications of Constitution / Brief / Laws / Philosophy / AMD | `atlas/constitution.md` + siblings + `atos/product/AMD-001…` |
| **D-KG** | Knowledge Law | How knowledge is earned & stored | Founder / Knowledge Exec | SPEC-003 + STD-002 + REG-KNOW | Same (Authoritative) |
| **D-LEARN** | Learning Architecture | How practice becomes transfer | Founder | FLA-001 | FLA-001 (Product Canonical) |
| **D-GROWTH** | User Growth Model | How observed behavior is represented | Founder | PCM-001 | PCM-001 (Product Canonical) |
| **D-EXP** | Experience Language | Shared departmental intake language | Founder | ELM-001 | ELM-001 |
| **D-DIGNITY** | Dignity Architecture | How improvement protects the human | Founder | AMD-001 (also Identity Art. IX) | AMD-001 |
| **D-CRAFT** | Craftsmanship | Love-of-use quality bar | Founder | PCI-001 | PCI-001 |
| **D-ENGINE** | Communication Engine | Voice/practice substrate | Founder / Eng | CE-001 + DIR-CE-001 | Same |
| **D-PROOF** | Product Proof | How we know it works in the world | Founder | PPS-001 (when ungated) | PPS-001 Gated |
| **D-GATES** | Execution Gates | What may run now | Founder | RES stack + BR-001 + MR-001 | Same |
| **D-OPS** | Operations | Live priorities, decisions, cadence | Founder / Atlas | Handoff + decisions + projects/metrics | `ATLAS-HANDOFF-REGISTER`, `atlas/decisions.md`, etc. |
| **D-EVID** | Evidence & Learning Log | Observations, experiments, audits | Atlas / Research | `atos/knowledge/evidence/` + promotion queue | Partial / scaffold |
| **D-Q** | Question Ledger | Unanswered questions under investigation | Atlas | `atos/knowledge/working/questions.md` (to create on reorg) | Not yet unified |
| **D-ATLAS** | Atlas Government | How Atlas is organized (frozen) | Founder | Atlas program Authoritative set | Frozen; maintenance only |
| **D-PRODCODE** | Product Application | Running software | Engineering | Repo `app/` `lib/` | Same |

### Domain relationships (how they touch)

```
D-ID ──constrains──► all domains
D-KG ──governs lifecycle of──► D-LEARN, D-GROWTH, D-EXP, D-DIGNITY, D-CRAFT, D-EVID, D-Q
D-LEARN + D-GROWTH ──define──► coaching truth
D-EXP ──translates──► D-LEARN into departmental briefs
D-DIGNITY + D-CRAFT ──gate──► shipping experiences
D-ENGINE ──implements──► D-LEARN practice surface
D-PROOF ──validates──► transfer (after CE gate)
D-GATES ──sequence──► what may execute
D-OPS ──reports──► live state without inventing doctrine
D-EVID / D-Q ──feed──► promotion pipeline → Canonical
D-PRODCODE ──must not contradict──► D-ID / D-LEARN / D-DIGNITY
```

---

## 5. How frameworks reference one another (anti-duplication)

| Principle | Practice |
|---|---|
| **Pointer, don’t copy** | Full Identity text lives once. Other docs link. |
| **Specialize, don’t restates** | FLA owns learning loop. ELM owns departmental language. PCM owns growth representation. AMD owns dignity constraints. PCI owns craft bar. |
| **MR-001 checkpoint** | New “foundation” proposals must map into an existing domain or justify a new domain via Founder approval — never a parallel OS. |
| **Resolution is the seal** | Binding acceptance lives in `RES-*`. Narrative strategy briefs become Historical when superseded. |
| **One name per concept** | “Canonical” means: (a) ATOS Canonical Library publication, or (b) Product Canonical — always label which. Prefer: **Identity Canonical · Product Canonical · Operational**. |

**Paused:** Any **Human Behavior Framework** (or similarly named new stack) shall not be implemented until it is either:

- shown to be an extension of **D-EXP / D-GROWTH / D-LEARN** with no new parallel foundation, **or**  
- approved as a new domain under KA-001 after reorganization.

---

## 6. How evidence enters the system

| Entry type | Lands in | Then |
|---|---|---|
| User research / beta feedback | D-EVID (evidence store) | Investigation |
| Product experiments / CE milestones | `atos/product/evidence/` + D-EVID index | Review |
| Audits (HDS, PCI-CR, ELM-MAP, BR) | Working counsel under owning domain | Corrective backlog or promotion |
| Production incidents / bugs | Operational + evidence | Root cause → learning |
| Founder observations | Working / Decision Pack | May escalate to Institutional Approval |

**Minimum evidence packet (STD-002):** source · evidence · confidence · reviewer · date · version.

---

## 7. How hypotheses become accepted knowledge

Reuse SPEC-003 / STD-002 lifecycle — stated for human clarity:

```
Question / Observation
    → Hypothesis (Working)
    → Investigation + Evidence
    → Evidence Review
    → Atlas Recommendation
    → Executive / Founder Review
    → Institutional Approval (RES or equivalent)
    → Canonical Publication (domain’s one source)
    → Consumption by agents & product
    → Supersede / Archive (never silent delete)
```

**Confidence ladder:** Observation → Hypothesis → Investigated → Verified → Canonical → Superseded → Archived.

**Anti-hollow rule:** Scaffold/Draft cannot be loaded as institutional truth.

---

## 8. How new questions are captured and investigated

| Step | Action |
|---|---|
| 1 | Log question in **D-Q Question Ledger** with owner, domain, urgency |
| 2 | Classify: Identity / Product / Ops / Research |
| 3 | Attach hypothesized answers + required evidence |
| 4 | Investigate (experiments, audits, user sessions) |
| 5 | Close with Accepted / Rejected / Deferred + link to RES or Working counsel |
| 6 | If Accepted → promotion path for the owning domain |

Questions are first-class knowledge assets. Unlogged questions do not drive roadmaps.

---

## 9. How future AI agents inherit this knowledge

| Agent class | Must load | Must not invent |
|---|---|---|
| **Atlas counsel** | Identity (D-ID) · KA-001 · active Product Canonical · Handoff · open gates | New doctrine without Founder |
| **Coaching agents** | FLA · PCM · AMD · session config inheriting dignity | Identity diagnoses |
| **Engineering agents** | TEP · CE · gates · relevant evidence | Spec amendments |
| **Ask Atlas (legacy plane)** | Frozen loader set until Founder-gated cutover | Silent expansion of load set |

**Inheritance rule:** Every agent brief starts with: *Authority tier → Domain → Canonical source → Confidence → Decision status.*

**Cutover goal (post-approval):** One governed load manifest derived from KA-001 domains — ending dual-plane confusion without breaking GOV-COMPAT until Founder opens the gate.

---

## 10. Proposed reorganization (execute only after Founder approval)

Do **not** move files until KA-001 is Approved.

### Phase A — Freeze creation
- No new frameworks.  
- Pause Human Behavior Framework implementation.  
- Working counsel only inside existing domains.

### Phase B — Domain homes (logical, then physical)

| Home | Contents |
|---|---|
| `atos/knowledge/canonical/identity/` | Promoted Constitution, Brief, Laws, Philosophy, AMD (or certified pointers) |
| `atos/knowledge/canonical/product/` | FLA, PCM (+ certified pointers) |
| `atos/knowledge/canonical/experience/` | ELM, PCI (or pointers) |
| `atos/product/` | Execution docs: CE, DIR, evidence, LP, audits (Working→promote) |
| `atos/knowledge/working/` | Hypotheses, question ledger, open investigations |
| `atos/knowledge/evidence/` | Indexed evidence packs |
| `atos/knowledge/archive/` | Superseded strategy & obsolete counsel |
| `atlas/` | Until cutover: live Identity + Ops; then shrink to runtime/ops only |

### Phase C — Registry truth
- Update REG-KNOW + document-registry to list every domain’s one source.  
- Clear “Canonical library empty” vs Product Canonical contradiction by labeling.  
- Empty promotion queue → seed Identity promotion packets.

### Phase D — Agent load manifest
- Publish `atos/knowledge/LOAD-MANIFEST.md` from domains.  
- Founder Decision required before changing Ask Atlas freeze.

### Phase E — Resume framework work
- Only then may a Human Behavior Framework (or similar) be proposed — as an extension of D-EXP/D-GROWTH/D-LEARN, or as a new domain with Founder approval.

---

## 11. Success condition

KA-001 succeeds when:

1. Any teammate or agent can answer “Where does this truth live?” in one hop.  
2. No two documents claim to be the foundation for the same domain.  
3. New ideas enter as questions/hypotheses — not as parallel constitutions.  
4. The organization can learn for a decade without drowning in frameworks.

---

## 12. Founder decision requested

| Option | Meaning |
|---|---|
| **Approve KA-001** | Architecture becomes Authoritative; Atlas executes Phase A–D reorganization; then frameworks may resume under KA rules |
| **Approve with amendments** | Founder edits domains/hierarchy; then reorg |
| **Reject / revise** | Atlas revises KA-001; pause continues |

| Field | Value |
|---|---|
| **Status Upon Signature** | Working — awaiting Founder Approval before any reorganization |
| **Recommend ≠ Decide** | Atlas does not reorganize or invent frameworks under this proposal until Founder acts |
