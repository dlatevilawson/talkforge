# Runtime Operations Manual (ROM)

| Field | Value |
|---|---|
| **Document ID** | MAN-013 |
| **Version** | 1.0.0-m5 |
| **Status** | Draft |
| **Owner** | Founder |
| **AI Steward** | Sentinel |
| **Human Approver** | Founder |
| **Review Cycle** | Each milestone |
| **Dependencies** | SPEC-005, STD-006, GOV-RUNTIME, RUNTIME-IFACE |
| **Related Documents** | atos/runtime/*, MAN-012 (planned), GOV-KNOW |
| **Approval History** | 2026-07-18 — M5 Draft (RES-001 core manual) |
| **Change Log** | 2026-07-18 — Initial Runtime Operations Manual |

---

## Purpose

Defines how Runtime Operations are performed day to day within ATOS governance.

## 1. Workflow Routing

- All governed AI/executive requests should eventually enter the Hub lifecycle (STD-006).
- Interim product paths (Forge coach, Ask Atlas) are precursors — document deviations; do not pretend Hub exists in code until implemented.
- Route by intent to executives listed in REG-EXEC; do not invent roles.

## 2. Context Injection

- Follow RUNTIME-CTX authority tiers.
- Inject the minimum sufficient sources.
- Label every source with `document_id`, `status`, `authority`.
- Never inject Scaffold as Canonical.
- Never inject unapproved Draft Specs/Standards as institutional law.

## 3. Memory Classification

- Classify before store (RUNTIME-MEM).
- Promotion Candidates use REF-R1110 + REG-PROMO-Q.
- Memory Keeper must not publish Canonical knowledge.

## 4. Sandbox Usage

- Use Sandbox for research, architecture analysis, experiments, scenario work.
- Outputs are proposals only.
- Sandbox cannot modify Canonical knowledge or ops SoT directly.

## 5. Executive Coordination

- Hub sequences/parallelizes work but does not override executive authority.
- Conflicts escalate through governance / Founder — not silent Hub overrides.

## 6. Logging

- Emit required logging fields (RUNTIME-WF / RUNTIME-RECORDS).
- Do not commit high-volume logs to git.

## 7. Runtime Monitoring

- Watch for context over-injection, authority mislabeling, failed validations, promotion backlog.
- Sentinel validates engineering-impacting runtime changes.
- Atlas monitors executive coordination quality.

## Interim operating mode (until Hub implementation)

| Surface | Mode |
|---|---|
| Ask Atlas | Legacy loader Tier D; prompt forbids invention |
| Founder OS | Ops snapshot + notes/briefs |
| Forge coach | Product path; not ATOS Hub |

Operators must not claim ATOS Runtime is fully implemented in code. Interfaces in `atos/runtime/` are the governing contracts for upcoming implementation (Founder-gated).
