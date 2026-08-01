<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# TalkForge agent gates (company OS)

| Document | Role |
|---|---|
| [EXEC-001](atos/product/EXEC-001-talkforge-execution-plan.md) | Company Execution Plan — Foundation → Strategy → Build |
| [CONST-001](atos/product/CONST-001-talkforge-constitution.md) | TalkForge Constitution v1.0 — Canonical Candidate (Step 2) |
| [Constitution (live)](atlas/constitution.md) | Identity-plane Constitution copy |
| [Idea Vault](atos/knowledge/working/idea-vault/README.md) | Official Working Knowledge system (Step 1 — **Frozen**) |

## Knowledge planes (binding)

| Plane | Meaning | Change |
|---|---|---|
| **Canonical Knowledge** | Defines the company (Mission, Constitution, Laws, Definitions, Core Philosophy) | Formal approval required |
| **Working Knowledge** | Still being explored (ideas, UX, research, experiments, future, blind spots) | Expected to evolve |

The Idea Vault is **Working Knowledge**. It does **not** override the Constitution, Decision Ledger, or Laws.

## Current gate (binding)

**EXEC-001 Step 1 (Idea Vault) is Complete and Frozen.**  
**EXEC-001 Step 2 (Constitution) is drafted and awaiting Founder review.**

- Do **not** start Step 3 (Decision Ledger) or any later EXEC step until the Founder approves Step 2.
- Treat CONST-001 / `atlas/constitution.md` as Canonical Candidate — do not invent amendments.
- Every new idea enters the Idea Vault **before** discussion continues elsewhere.
- Do **not** add Idea Vault metadata fields without a Founder Decision.
- Do **not** ship new product features that are not documented, categorized, blind-spot reviewed, and roadmap-linked (EXEC Operating Rules) — except continuation of already-ratified tracks the Founder has not paused (e.g. CE-001 milestones under RES-013).
