# Idea Vault — TalkForge Living Repository

| Field | Value |
|---|---|
| **Document ID** | IV-ROOT |
| **Version** | 1.2.0 |
| **Status** | **Frozen — Official working knowledge system (EXEC-001 Step 1 Complete)** |
| **Owner** | Founder |
| **AI Steward** | Atlas |
| **Created** | 2026-08-01 |
| **Updated** | 2026-08-01 |
| **Authority** | [EXEC-001](../../../product/EXEC-001-talkforge-execution-plan.md) · KA-001 · Decision 048 |
| **Plane** | **Working knowledge** — does **not** override Constitution, Decision Ledger, or Laws |

---

## Idea Vault Law #001

> **An idea is not knowledge until it can be understood, connected, and acted upon.**

Entry: [IV-LAW-010](laws/IV-LAW-010-idea-is-not-knowledge.md)

---

## Frozen operating rules (binding)

1. **No new metadata fields** without a Founder Decision.
2. **Every new idea enters the Idea Vault** before discussion continues elsewhere.
3. The vault **captures, organizes, connects, and preserves** knowledge — it does **not** make decisions.
4. The Idea Vault is a **working knowledge system**. It does **not** override the Constitution, Decision Ledger, or Laws.

---

## Two kinds of knowledge (explicit)

TalkForge distinguishes **Canonical Knowledge** from **Working Knowledge**. This distinction will matter for Constitution (Step 2) and every later gate.

### Canonical Knowledge

Things that **define the company**. Changing them requires formal approval.

Examples:

- Mission
- Constitution
- Laws
- Definitions
- Core Philosophy

Homes (authoritative when adopted): Constitution, Forge Laws, Decision Ledger, promoted Canonical / Identity doctrine — **not** the Idea Vault as override.

### Working Knowledge

Everything still being **explored**. Expected to evolve.

Examples:

- Product ideas
- UX concepts
- Research
- Experiments
- Future features
- Blind spots

**The Idea Vault is the official Working Knowledge system** for capturing and connecting these ideas.

An idea in the vault may later be *promoted* into Canonical Knowledge through formal Founder / institutional approval — the vault entry itself does not become Canonical by existing.

---

## Purpose

Capture every idea so nothing is forgotten — then make each idea **understandable, connected, and actionable**.

Once an idea is here with full metadata, later steps (Constitution, Decision Ledger, Research Library, Blind Spot Register, Roadmap) can reference it by ID.

**Stop rule:** Do not keep improving the vault beyond the frozen schema. The vault exists to support building the product — not become the product itself.

---

## Required metadata (every idea) — schema frozen

| Field | Purpose |
|---|---|
| **Status** | Lifecycle — where the idea is in the decision process |
| **Importance** | How foundational it is to TalkForge (not roadmap priority) |
| **Relationships** | Depends on · Supports · Related |
| **Evidence** | Why we believe this — sources + confidence |
| **Owner** | Who stewards the idea |
| **Last Updated** | When the entry last changed |

---

## Lifecycle status

| Status | Meaning |
|---|---|
| `Inbox` | Captured; not yet reviewed |
| `Reviewing` | Under active consideration |
| `Researching` | Seeking evidence or clarification |
| `Fact Checking` | Claims under verification |
| `Approved` | Accepted as company direction / doctrine |
| `In Development` | Being built |
| `Implemented` | Shipped / in product |
| `Future` | Valuable; intentionally postponed |
| `Rejected` | Explicitly declined (keep the record) |
| `Archived` | No longer active; preserved for history |

---

## Importance

| Level | Meaning |
|---|---|
| `Critical` | Defines TalkForge — remove it and the company/product identity breaks |
| `Important` | Core capability or principle — strong weight in decisions |
| `Useful` | Meaningful improvement — not definitional |
| `Optional` | Nice addition — low visual/decision weight |

Importance ≠ Priority (Priority is EXEC Step 11).

---

## Evidence sources (allowed labels)

Founder insight · User interview · Research paper · Scientific evidence · Product intuition · Competitor analysis · Internal experiment · Doctrine document

**Confidence:** High · Medium · Low

Aligns with System 1: evidence before assumption.

---

## Categories

| Folder | Category | Use for |
|---|---|---|
| [`philosophy/`](philosophy/) | Philosophy | Beliefs about people, practice, coaching, identity |
| [`laws/`](laws/) | Laws | Immutable operating constraints |
| [`product-ideas/`](product-ideas/) | Product Ideas | Systems, architectures, product shapes |
| [`features/`](features/) | Features | Concrete capabilities to build |
| [`ux-ideas/`](ux-ideas/) | UX Ideas | Experience, surface, interaction concepts |
| [`ai-ideas/`](ai-ideas/) | AI Ideas | Model behavior, judgment, pedagogy patterns |
| [`research-ideas/`](research-ideas/) | Research Ideas | Claims / questions needing evidence |
| [`future-ideas/`](future-ideas/) | Future Ideas | Valuable but intentionally postponed |
| [`rejected-ideas/`](rejected-ideas/) | Rejected Ideas | Explicitly declined — with why |

Master index: [`INDEX.md`](INDEX.md)  
Entry template: [`TEMPLATE.md`](TEMPLATE.md)

---

## How to add an idea

1. Copy [`TEMPLATE.md`](TEMPLATE.md).
2. Assign the next free ID in that category (`IV-{CAT}-{NNN}`).
3. Fill **Status, Importance, Relationships, Evidence, Owner, Last Updated**.
4. Place the file in the matching folder.
5. Add a row to [`INDEX.md`](INDEX.md).
6. Do **not** delete rejected ideas — set Status `Rejected` and keep in `rejected-ideas/`.

An idea without relationships and evidence is storage — not yet knowledge (Law #001).

---

## Relationship to Canonical homes

| Existing | Authority |
|---|---|
| `atlas/constitution.md` | Canonical (Constitution — Step 2 will formalize / expand) |
| `atlas/forge-laws.md` | Canonical Laws — vault entries **point to** laws; laws remain authoritative |
| `atlas/decisions.md` | Decision Ledger (Step 3) — decisions are not vault opinions |
| `atos/product/research/`, HBF | Working research seeds (Step 4 library) |
| SYS1 / SYS2 / POM (doctrine) | Product doctrine authority when merged; vault seeds reference, do not override |

**Anti-hollow rule:** Vault entries are Working captures. They do not override Frozen doctrine or Canonical publications.

---

## Step 1 approval (complete)

- [x] Lifecycle Status on every idea
- [x] Relationships (Depends on / Supports / Related) on every idea
- [x] Evidence + Confidence on every idea
- [x] Importance score on every idea
- [x] Idea Vault Law #001 accepted
- [x] Schema frozen — no new metadata without Founder Decision
- [x] Step 1 **Approved** and **Frozen** (2026-08-01)

Step 2 (Constitution) begins only when the Founder explicitly authorizes it.

---

## Change log

| Version | Date | Change |
|---|---|---|
| 1.0.0 | 2026-08-01 | Initial Idea Vault + seed corpus |
| 1.1.0 | 2026-08-01 | Founder Revise: lifecycle, relationships, evidence, importance; Law #001 |
| 1.2.0 | 2026-08-01 | Founder Approve — Step 1 frozen; Canonical vs Working distinction made explicit |
