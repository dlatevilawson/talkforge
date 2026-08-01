# Idea Vault — TalkForge Living Repository

| Field | Value |
|---|---|
| **Document ID** | IV-ROOT |
| **Version** | 1.1.0 |
| **Status** | **Working — Awaiting Founder review after Revision (EXEC-001 Step 1)** |
| **Owner** | Founder |
| **AI Steward** | Atlas |
| **Created** | 2026-08-01 |
| **Updated** | 2026-08-01 |
| **Authority** | [EXEC-001](../../../product/EXEC-001-talkforge-execution-plan.md) · KA-001 (Working knowledge) · Decision 048 |
| **Plane** | Working — **not** Canonical · **not** loadable as institutional truth until promoted |

---

## Idea Vault Law #001

> **An idea is not knowledge until it can be understood, connected, and acted upon.**

The vault is not a place to collect ideas. It is a system that helps TalkForge make better decisions.

Entry: [IV-LAW-010](laws/IV-LAW-010-idea-is-not-knowledge.md)

---

## Purpose

Capture every idea so nothing is forgotten — then make each idea **understandable, connected, and actionable**.

Once an idea is here with full metadata, later steps (Constitution, Decision Ledger, Research Library, Blind Spot Register, Roadmap) can reference it by ID.

**Stop rule:** Do not keep improving the vault beyond the approved schema. The vault exists to support building the product — not become the product itself.

---

## Required metadata (every idea)

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

## Relationship to existing ATOS assets

| Existing | Relationship |
|---|---|
| `atlas/constitution.md` | Constitution (Step 2 will formalize / expand) |
| `atlas/forge-laws.md` | Laws — vault entries **point to** laws; laws remain authoritative |
| `atlas/decisions.md` | Decision Ledger (Step 3) |
| `atos/product/research/`, HBF | Research seeds (Step 4 library) |
| SYS1 / SYS2 / POM (doctrine) | Seeded here as Product Ideas / Laws; doctrine docs remain authority when merged |

**Anti-hollow rule:** Vault entries are Working captures. They do not override Frozen doctrine or Canonical publications.

---

## Founder review checklist (Step 1 — after Revision)

- [ ] Lifecycle Status on every idea
- [ ] Relationships (Depends on / Supports / Related) on every idea
- [ ] Evidence + Confidence on every idea
- [ ] Importance score on every idea
- [ ] Idea Vault Law #001 accepted
- [ ] Schema frozen — no further vault expansion before Step 2
- [ ] Approve Step 1 so Constitution work (Step 2) may begin

---

## Change log

| Version | Date | Change |
|---|---|---|
| 1.0.0 | 2026-08-01 | Initial Idea Vault + seed corpus |
| 1.1.0 | 2026-08-01 | Founder Revise: lifecycle, relationships, evidence, importance; Law #001 |
