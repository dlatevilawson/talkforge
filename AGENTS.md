<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# TalkForge agent gates (company OS)

| Document | Role |
|---|---|
| [EXEC-001](atos/product/EXEC-001-talkforge-execution-plan.md) | Company OS — **Founder APPROVED** (Decision 051); Phase 3 continues |
| [CONST-001](atos/product/CONST-001-talkforge-constitution.md) | Constitution — Frozen Canonical |
| [Constitution (live)](atlas/constitution.md) | Identity-plane Constitution copy |
| [Idea Vault](atos/knowledge/working/idea-vault/README.md) | Working Knowledge — Frozen schema |
| [MASTER-ROADMAP-001](atos/product/MASTER-ROADMAP-001.md) | Implementation phases |
| [PHASE3-EXECUTION](atos/product/PHASE3-EXECUTION.md) | Build package index |
| [DEC-LEDGER-001](atos/product/DEC-LEDGER-001-decision-ledger.md) | Decision Ledger rules |
| [CRAFT-LAW-001](atos/product/CRAFT-LAW-001.md) | Craft Law #001 — human / trustworthy / courageous |
| [DES-001](atos/product/DES-001-cognitive-load.md) | Design Principle #001 — reduce cognitive load |
| [AUDIT-001](atos/product/AUDIT-001-architecture-readiness.md) | Architecture Readiness Audit (baseline NO-GO) |
| [AUDIT-001.1](atos/product/AUDIT-001.1-architecture-reaudit.md) | Re-audit — **NO-GO** unconstrained · **CONDITIONAL GO** SYS1/SYS2 |
| [AUDIT-001.2](atos/product/AUDIT-001.2-conditional-go-reaudit.md) | Conditional GO re-audit — **GO** prod migration/hardening · **NO-GO** features |
| [REMEDIATE-002](atos/product/REMEDIATE-002-conditional-go.md) | Conditional GO implementation report |
| [EXEC-VERIFY-001](atos/product/EXEC-VERIFY-001-final-architecture-certification.md) | Final architecture certification — **NO-GO** feature development |
| [HARDEN-001](atos/product/HARDEN-001-final-architecture-hardening.md) | Phases 1–3 certification — **Frozen Historical** |
| [HARDEN-002](atos/product/HARDEN-002-identity-integrity.md) | Phase 4 identity integrity — **Frozen Historical** |
| [HARDEN-003](atos/product/HARDEN-003-data-lifecycle-integrity.md) | Phase 5 data lifecycle integrity — **Frozen Historical** |
| [HARDEN-004](atos/product/HARDEN-004-schema-deployment-integrity.md) | Phase 6 schema deployment integrity — **Milestone 6.1 approval gate** |
| [REMEDIATE-001](atos/product/REMEDIATE-001-architecture-remediation.md) | Remediation report |
| [OWN-001](atos/product/OWN-001-identity-ownership-matrix.md) | Identity / evidence ownership matrix |
| [FREEZE-001](atos/product/FREEZE-001-identity-pr-hold.md) | Identity PR hold |
| [SYS1-001](atos/product/SYS1-001-system-1-foundation.md) | System 1 foundation |
| [SYS2-001](atos/product/SYS2-001-system-2-experience.md) | System 2 experience |
| [POM-001](atos/product/POM-001-personal-operating-model.md) | Personal Operating Model |
| [LP-LAW-001](atos/product/LP-LAW-001-living-profile.md) | Living Profile Law |
| [Forge Laws](atlas/forge-laws.md) | Operating laws #001–#017 |

## Knowledge planes (binding)

| Plane | Meaning | Change |
|---|---|---|
| **Canonical Knowledge** | Defines the company (Mission, Constitution, Laws, Definitions, Core Philosophy) | Formal Founder **admission** required |
| **Working Knowledge** | Still being explored (ideas, UX, research, experiments, future, blind spots) | Expected to evolve |

**Constitutional Law #001:** Nothing that defines TalkForge is Canonical until it has been deliberately admitted by Founder decision.

**Constitutional Admission Rule:** Working Knowledge alone never constitutes admission. See CONST-001 / Article XIV.

## Binding

- **Overall status:** Company OS ✅ APPROVED (Decision 051). Continuum authorized (Decision 050).
- **Idea Vault Law #001:** Understood, connected, acted upon.
- **Iterate:** Improve existing systems before introducing new ones.
- Phase 3 code follows BUILD-SYS1 → SYS2 → CE → UX dependencies.
- **Dual ship test:** Craft Law #001 + Design Principle #001 (both must pass).
- **Remediation (Decision 053 + AUDIT-001.2):** LP UI and System 2 contracts are implemented. Only production migration verification / controlled hardening may proceed. **NO-GO** for feature expansion and held identity PR merges. Respect FREEZE-001 / OWN-001 / Forge Laws #014–#017.
- **Certification (EXEC-VERIFY-001):** **NO-GO** for feature development. Do not lift FREEZE-001 or add product capability until required security, SSOT, readiness-route, data-lifecycle, and registry fixes are re-certified.
- **Checkpoint immutability:** HARDEN-001, HARDEN-002, and HARDEN-003 are frozen historical certifications. Every later hardening phase requires a separate checkpoint document; do not append implementation evidence to a frozen checkpoint.
- **Database deployment SSOT:** Only the ordered paths in `supabase/migrations/manifest.json` are deployable. `supabase/schema.sql` is a non-deployable reference snapshot.
- **Dependency chain:** Living Profile → Readiness → Adaptive Homepage → Coaching. No mission menus as home. Experiences never write identity.
- Every major feature: Idea Vault → Blind Spot → Roadmap → Build.
- Do **not** treat Idea Vault entries, agent drafts, or shipped features as Canonical without Founder admission.
- Every new idea enters the Idea Vault **before** discussion continues elsewhere.
- Do **not** add Idea Vault metadata fields without a Founder Decision.
- Do **not** ship new product features that are not documented, categorized, blind-spot reviewed, and roadmap-linked — except continuation of already-ratified tracks (e.g. CE-001 under RES-013).
