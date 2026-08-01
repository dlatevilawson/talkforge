<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# TalkForge agent gates (company OS)

| Document | Role |
|---|---|
| [EXEC-001](atos/product/EXEC-001-talkforge-execution-plan.md) | Company Execution Plan — Foundation → Strategy → Build |
| [Idea Vault](atos/knowledge/working/idea-vault/README.md) | Official Working Knowledge system (EXEC Step 1 — **Frozen**) |
| [Idea Vault Index](atos/knowledge/working/idea-vault/INDEX.md) | Master index |

## Knowledge planes (binding)

| Plane | Meaning | Change |
|---|---|---|
| **Canonical Knowledge** | Defines the company (Mission, Constitution, Laws, Definitions, Core Philosophy) | Formal approval required |
| **Working Knowledge** | Still being explored (ideas, UX, research, experiments, future, blind spots) | Expected to evolve |

The Idea Vault is **Working Knowledge**. It does **not** override Constitution, Decision Ledger, or Laws.

## Current gate (binding)

**EXEC-001 Step 1 (Idea Vault) is Complete and Frozen.**

- Do **not** start Step 2 (Constitution) until the Founder explicitly authorizes beginning Step 2.
- Every new idea enters the Idea Vault **before** discussion continues elsewhere.
- Every Idea Vault entry requires: **Status · Importance · Relationships · Evidence** (Idea Vault Law #001).
- Do **not** add Idea Vault metadata fields without a Founder Decision.
- The vault captures, organizes, connects, and preserves — it does **not** make decisions.
- Do **not** ship new product features that are not documented, categorized, blind-spot reviewed, and roadmap-linked (EXEC Operating Rules) — except continuation of already-ratified tracks the Founder has not paused (e.g. CE-001 milestones under RES-013).

When doctrine freeze docs (SYS1 / SYS2 / POM) are merged to the active branch, read them before implementing System 1 / System 2 surfaces.
