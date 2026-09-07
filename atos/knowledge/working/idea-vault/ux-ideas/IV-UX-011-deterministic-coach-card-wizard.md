# IV-UX-011 — Deterministic Coach card wizard

| Field | Value |
|---|---|
| **ID** | IV-UX-011 |
| **Title** | Deterministic Coach card wizard |
| **Category** | UX Ideas |
| **Status** | In Development |
| **Importance** | Critical |
| **Owner** | Founder |
| **Last Updated** | 2026-09-07 |
| **Captured** | 2026-09-07 |
| **AI Steward** | Atlas |

---

## Statement

The first-user Coach path is a deterministic three-phase card wizard. Phase 1, “Pick your moments,” selects 1–3 topic cards. Phase 2, “Narrow the context,” collects audiences, one communication pattern, and urgency before **Diagnose**. Phase 3 verifies a deterministic Living Profile card and initial Forge target. Guests authenticate after **Looks right**; authenticated members activate immediately. No LLM participates.

---

## Why it matters

The prior conversational discovery path made conversion depend on LLM behavior and a semantic-value judgment before the member could reach practice. Fixed catalogs and deterministic verification lower cognitive load, make the transition reproducible, and preserve member authority over what the Living Profile knows.

---

## Relationships

| Direction | Ideas |
|---|---|
| **Depends on** | IV-PROD-004 · IV-LAW-004 · IV-LAW-007 · IV-PHIL-009 |
| **Supports** | IV-PROD-009 · IV-PROD-005 · IV-RES-004 |
| **Related** | IV-UX-009 · IV-AI-007 · OWN-001 · LP-LAW-001 · Decision 060 |

---

## Evidence

| Field | Value |
|---|---|
| **Why we believe this** | Formal Founder direction A selected a deterministic card wizard and auth-before-Forge over conversational discovery and a semantic value gate. |
| **Sources** | Founder insight · Decision 060 · AC-JOURNEY-001 |
| **Confidence** | High |

---

## Notes

**Phase 1 — Pick your moments (1–3):**

| Stable ID | Exact label |
|---|---|
| `job_interview` | Job interview |
| `salary_raise_negotiation` | Salary / raise negotiation |
| `giving_difficult_feedback` | Giving difficult feedback |
| `setting_a_boundary` | Setting a boundary |
| `pitch_or_presentation` | Pitch or presentation |
| `handling_conflict` | Handling conflict |
| `asking_for_something_i_need` | Asking for something I need |
| `receiving_critical_feedback` | Receiving critical feedback |
| `ending_a_relationship` | Ending a relationship |
| `something_else` | Something else |

Only `something_else` may reveal bounded custom text.

**Phase 2 — Narrow the context:**

- Q1 audience, multi-select: `manager_boss` (Manager/boss), `peer_colleague` (Peer/colleague), `client_customer` (Client/customer), `recruiter_hr` (Recruiter/HR), `business_partner` (Business partner), `family_friend` (Family/friend), `stranger_new_contact` (Stranger/new contact).
- Q2 pattern, single-select: `freeze` (freeze), `ramble` (ramble), `emotional_defensive` (emotional/defensive), `harsh_aggressive` (harsh/aggressive), `cave_under_pushback` (cave under pushback), `avoid_entirely` (avoid entirely).
- Q3 urgency, single-select: `today` (Today), `this_week` (This week), `next_2_weeks` (Next 2 weeks), `no_specific_deadline` (No specific deadline).
- CTA: **Diagnose**.

**Phase 3 — Living Profile verification:** deterministically show focus areas, the selected-pattern template, and initial Forge target from first topic + first audience. **Adjust** returns to Phase 2 prefilled. **Looks right** gates guests on auth and activates immediately for members.

Selections are declarations stored in the Living Profile’s authorized `member_practice_profile` JSONB field, not System 1 inference or a parallel profile. No desired-outcome question, discovery LLM, semantic value threshold, turn cap, universal custom-input requirement, or duplicate post-auth confirmation belongs in this path. Assessment remains available but is not the default FTUE.

---

## Downstream (filled in later EXEC steps)

| Field | Value |
|---|---|
| Blind spot review | [BS-018](../../blind-spot-register/bs-018.md) |
| Roadmap link | [AC-JOURNEY-001](../../../product/AC-JOURNEY-001-first-user-architecture.md) · [PHASE4B-AC](../../../product/PHASE4B-AC-IMPLEMENTATION-SEQUENCE.md) |
| Priority | Founder-approved direction A — Decision 060 |
