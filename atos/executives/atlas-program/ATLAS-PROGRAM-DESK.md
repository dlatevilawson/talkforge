# Atlas — Program Management Capability (Architectural Recommendation)

| Field | Value |
|---|---|
| **Document ID** | ATLAS-AIF-PROGRAM |
| **Version** | 1.0.0 |
| **Status** | Authoritative |
| **Owner** | Founder |
| **AI Steward** | Atlas (AIO-CORE) |
| **Human Approver** | Founder |
| **Review Cycle** | On Atlas Program / Engineering Program change |
| **Dependencies** | ATLAS-P0, ATLAS-P4, ATLAS-P5, ATLAS-ENG-PROGRAM, CHARTER-ATLAS, CHARTER-ENGINEERING, CHARTER-OPERATIONS, EXEC-ORG-CADENCE |
| **Related Documents** | ATLAS-HANDOFF-REGISTER, ATLAS-SUCCESSION, ATLAS-WAVES |
| **Approval History** | 2026-07-19 — Atlas architectural recommendation prior to WP-S0 |
| **Change Log** | 2026-07-19 — Recommend AIF-PROGRAM (Program Desk) inside AIO-CORE; not a sixth AIO |

---

## Question

Before WP-S0: does Atlas require a Program Management capability? If so, where does it live so Atlas stays focused on **executive coordination** while progress, dependencies, risks, milestones, and reporting stay consistent?

---

## Verdict

| Decision | Answer |
|---|---|
| **Is Program Management required?** | **Yes** |
| **Assign tracking to undifferentiated Atlas / Core alone?** | **No** |
| **Create a sixth AIO office?** | **No** (not warranted under ATLAS-P5 growth rules) |
| **Absorb company Operations or Engineering PM?** | **No** (violates ATLAS-P4) |
| **Recommended design** | **AIF-PROGRAM — Program Desk**: an **internal function** inside **AIO-CORE**, not a separate office and not a company executive |

One line:

> **Engineering delivers work packages; the Program Desk tracks Atlas Program reality; AIO-CORE still coordinates and decides emission — Atlas does not become a PMO that runs the company.**

---

## 1. Why the capability is required

ATLAS-ENG-PROGRAM introduces durable, multi-wave work (S0–S9, WP-S*, VC*, dependencies, rollback, acceptance). Without a named management function:

| Failure | Why it breaks CoS behavior |
|---|---|
| Progress lives in chat / tribal memory | Fails succession test (ATLAS-SUCCESSION) |
| Core personally tracks every WP | Recreates Core bottleneck (P5 §4.1 failure mode) |
| Counsel “remembers” status in briefs | Status authorship mixes with advocacy |
| Broker improvises Engineering follow-ups | Blurs company brokerage with internal schedule ownership |
| No consistent risk/milestone register | Founder packs become uneven; dropped program risks |

Program Management here means **Atlas Program consistency** — not product roadmap ownership, not company delivery command, not ops calendar ownership.

### In scope (Atlas Program Desk)

- Implementation progress against ATLAS-ENG-PROGRAM / ATLAS-WAVES (staff + runtime waves as listed)  
- Dependency and blocker register for Atlas Program WPs  
- Program-level risks & issues (schedule, scope drift, contract-compliance drift)  
- Milestone / checkpoint status (VC0–VC9, S-wave exits, W-wave gates as applicable)  
- Consistent status inputs for Counsel briefs and Handoff Register currency  
- Exception signaling when Engineering Status is stale or incomplete  

### Out of scope (forbidden absorption)

| Domain | Rightful owner (P4) | Desk must not |
|---|---|---|
| Build/ship execution | **EXEC-ENGINEERING** | Command engineers or rewrite delivery plans |
| Engineering integrity truth | **EXEC-SENTINEL** | Investigate or soften Risk Notices |
| Company cadence logistics | **EXEC-OPERATIONS** | Own Daily/Weekly calendar execution |
| Product roadmap | **EXEC-PRODUCT** | Sequence product bets |
| Founder binding priorities | **Founder** | Silently reorder |
| AIO charter finals / emission | **AIO-CORE** (office) | Bypass Core or Guard |

---

## 2. Alternatives evaluated

| Option | Idea | Strengths | Weaknesses | Result |
|---|---|---|---|---|
| **A. No PM capability** | Rely on Engineering + ad hoc Atlas memory | Minimal docs | Inconsistent reporting; succession failure; Core thrash | **Reject** |
| **B. Undifferentiated Atlas / Core does all tracking** | “Atlas tracks programs” | Simple org chart | Explicitly recreates Core bottleneck; violates “internal function rather than assigning to Atlas” intent | **Reject** |
| **C. New AIO-PROGRAM (sixth office)** | Dedicated staff office | Clear name | Fails P5 growth bar (capacity-first; not a new charter cluster); coordination tax; looks like shadow Ops | **Reject for now** |
| **D. Park under AIO-BROKER** | Broker already moves status | Natural intake path | Broker’s mission is **company EXEC interfaces**; owning Atlas-internal schedule creates dual identity and false “Atlas runs Engineering” | **Reject as owner** (Broker remains **intake path**) |
| **E. Park under AIO-INTEL** | Status as “truth” | Good sensing skills | Mixes situational truth with plan/baseline management; invents a second source of “schedule truth” | **Reject as owner** (Intel may **label** desk facts) |
| **F. Park under AIO-COUNSEL** | Briefs need status | Convenient for writers | Counsel must not own the register it advocates from | **Reject as owner** |
| **G. Park under AIO-GUARD** | Risks & compliance | Strong on governance risks | Guard is Integrity/emission gate, not schedule PMO; overload + Sentinel confusion risk | **Reject as owner** (Guard still validates program-risk *claims* in packs) |
| **H. Defer to EXEC-OPERATIONS / EXEC-ENGINEERING only** | Company already has delivery & cadence owners | Respects P4 | Leaves Atlas Program register orphaned; CoS cannot brief program state consistently; Ops≠Atlas Program law | **Reject as sole solution** |
| **I. AIF-PROGRAM inside AIO-CORE (chosen)** | Internal function / desk under Core | Matches P5 “capacity inside offices”; keeps Core on coordination finals; no sixth AIO; no P4 absorption | Requires discipline so Desk does not become shadow Engineering | **Select** |

---

## 3. Recommended architecture — AIF-PROGRAM (Program Desk)

### 3.1 Classification

| Term | Meaning |
|---|---|
| **AIO-*** | Atlas Internal **Office** (P5) — five only unless Founder amends |
| **AIF-*** | Atlas Internal **Function** — capacity inside an office; not a new office; not an EXEC-* |

**AIF-PROGRAM** is a function of **AIO-CORE**.

```text
AIO-CORE
├── Charter / authority / Founder channel (office mission — unchanged)
├── Task assign + emission permit (office mission — unchanged)
└── AIF-PROGRAM (Program Desk)     ← NEW FUNCTION
      ├── Program register
      ├── Dependency & milestone tracking
      ├── Program risk/issue log
      └── Status feed for briefs / handoff
```

### 3.2 Mission

Keep Atlas Program implementation **legible, current, and reportable** so AIO-CORE can coordinate executives and staff without becoming the spreadsheet.

### 3.3 Responsibilities (exclusive within Atlas)

| Responsibility | Owner |
|---|---|
| Atlas Program register (waves, WPs, VC status) | **AIF-PROGRAM** |
| Dependency / blocker list for Atlas Program | **AIF-PROGRAM** |
| Program risk & issue log (non-Sentinel) | **AIF-PROGRAM** |
| Milestone dates / exit-condition status | **AIF-PROGRAM** |
| Handoff Register program-section currency | **AIF-PROGRAM** (under Core accountability) |
| Draft program status block for Counsel | **AIF-PROGRAM** → Counsel composes |
| Company Engineering delivery plan | **EXEC-ENGINEERING** |
| Company ops cadence execution | **EXEC-OPERATIONS** |
| Emission / charter halt | **AIO-CORE** (not delegated away) |
| Integrity of Founder-facing claims | **AIO-GUARD** |

### 3.4 Authority

**May:**

- Maintain Draft/operational program registers (not Canonical law)  
- Request Status from Engineering via **AIO-BROKER** (ORG-COMM interfaces)  
- Mark waves/WPs blocked, at-risk, complete **against written exit criteria**  
- Flag stale inputs (> agreed freshness) to Core/Broker  
- Feed labeled program facts to Intel/Counsel  

**Must not:**

- Bind Founder priorities or invent milestones as constitutional  
- Command Engineering or change WP acceptance criteria silently (criteria live in ATLAS-ENG-PROGRAM)  
- Skip Guard on Founder-facing program claims  
- Absorb Sentinel, Ops, or Engineering ownership  
- Speak as Atlas to Founder without Core emission path  

### 3.5 Interfaces

| From | To | Artifact |
|---|---|---|
| EXEC-ENGINEERING | Broker → Program Desk | Status (progress, blockers, ETA vs WP exit) |
| EXEC-OPERATIONS | Broker → Program Desk | Cadence logistics only when Atlas Program items are on the institutional calendar |
| Program Desk | Intel | Labeled program facts for context |
| Program Desk | Counsel | Status block for Daily/Weekly / Decision Packs |
| Program Desk | Guard | Program-risk claims subject to validation; never substitute for Sentinel notices |
| Program Desk | Core | Exception brief: slipped VC, dependency break, governance drift |
| Program Desk | ATLAS-HANDOFF-REGISTER | Keep program rows current |

### 3.6 Events (logical additions — amend ENG-PROGRAM event catalog when Engineering implements)

| Event | Publisher | Subscribers | Purpose |
|---|---|---|---|
| `atlas.program.register_updated` | Program Desk | Intel, Counsel, Core | Register changed |
| `atlas.program.milestone_reached` | Program Desk | Core, Counsel | VC/S-wave exit met |
| `atlas.program.blocked` | Program Desk | Core, Broker, Guard | Dependency/risk needs attention |
| `atlas.program.stale_status` | Program Desk | Broker, Core | Engineering/ops status past freshness |

These events create **no authority**. They do not enable FOUNDER_VISIBLE or amend contracts.

### 3.7 Operating rhythm (Atlas-internal)

| Cadence | Program Desk action |
|---|---|
| Continuous | Update register on WP merge / check result |
| Daily | Freshness check; blocked items surface for brief |
| Weekly | Milestone/dependency digest for Weekly Review pack |
| On VC/S-wave exit | Record evidence pointers; notify Core |
| Before absence | Ensure Handoff Register program section current |

Company Daily/Weekly logistics remain **Operations**-owned (EXEC-ORG-CADENCE).

### 3.8 Minimum register fields (architectural)

Program Desk must be able to answer, from governed records alone:

1. Which WP/wave is in progress?  
2. What is blocked and by whom?  
3. Which validation checkpoints are green/red?  
4. What program risks threaten acceptance or compliance?  
5. What should the Founder know this cadence (non-binding)?  

Suggested record types (spec only): `ProgramWave`, `WorkPackageStatus`, `DependencyEdge`, `ProgramRisk`, `MilestoneRecord` — all `canonical=false` / operational unless separately promoted by Knowledge governance.

---

## 4. Fit to ATOS & Executive Organization Contract

| Constraint | How this design complies |
|---|---|
| ATOS Maintenance Mode | No Spec/Standard rewrite; operational registers only |
| Atlas coordinates; does not constitute org (P4) | Desk tracks Atlas Program; does not become Operations/Engineering |
| One responsibility → one owner | Program register ownership is exclusive to AIF-PROGRAM |
| P5 five offices | No sixth AIO; function = capacity inside Core |
| P5 growth strategy | Scale inside office before new AIO; revisit AIO only if Desk proves persistent SRP collision |
| GUARD ≠ Sentinel | Program risks ≠ engineering integrity investigations |
| Succession | Register + Handoff currency makes CoS replaceable from docs |
| ENG-PROGRAM D1–D10 | Desk reports against ENG-PROGRAM; does not replace WP ownership by Engineering |

---

## 5. Relationship to WP-S0 (no code in this document)

**Implication for Engineering Program sequencing:**

| Item | Direction |
|---|---|
| WP-S0 scope | Remains ownership skeleton for **AIO facades** (`aio.*`) |
| Program Desk | **Architectural function** — may be represented later as a thin `aio.core.program` (or equivalent) **module under Core**, not a peer office folder that implies AIO-PROGRAM |
| Before/with S0 | Engineering should reserve Core namespace for Program Desk status types/events in the ownership map (**design acknowledgment**), without implementing full PM automation in S0 |
| Full Desk automation | Prefer a later WP under S7/S8 (register + stale detection), after Guard/Core hard gates exist — or a small additive WP-S0b **spec-only types** if Engineering needs the map early |

**Atlas coordination order (recommended):**

1. Accept this recommendation (AIF-PROGRAM inside Core).  
2. Amend ATLAS-ENG-PROGRAM lightly to reference Program Desk ownership of progress reporting.  
3. Then start WP-S0 with ownership map including `program` as **Core function**, not sixth AIO.

---

## 6. Growth / revisit rule

Promote Program Desk to a **dedicated AIO** only if all are true:

1. Persistent bottleneck inside Core despite Desk capacity, **and**  
2. Proven SRP collision (program tracking vs charter/emission finals), **and**  
3. No P4 overlap with Operations/Engineering, **and**  
4. **Founder approves** a Phase 5 amendment  

Until then: **function, not office.**

---

## 7. Acceptance of this recommendation

This architecture is accepted when:

- [x] Need affirmed  
- [x] Placement = AIF-PROGRAM inside AIO-CORE  
- [x] Sixth AIO rejected for now  
- [x] Company Ops/Engineering boundaries explicit  
- [x] ENG-PROGRAM cross-link updated (companion edit)  
- [x] Handoff Register lists Program Desk as accountable for program-section currency  

---

## Executive summary

Atlas **does** need Program Management — as **AIF-PROGRAM (Program Desk) under AIO-CORE**, not as “Atlas the PMO,” not as Broker/Intel/Counsel/Guard ownership, and not as a sixth office. Engineering still delivers; Operations still runs company cadence; Sentinel still owns engineering integrity; Core still coordinates and permits emission; the Desk keeps implementation progress legible and succession-safe.
