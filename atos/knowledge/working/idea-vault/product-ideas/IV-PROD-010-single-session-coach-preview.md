# IV-PROD-010 — Single-session Coach preview

| Field | Value |
|---|---|
| **ID** | IV-PROD-010 |
| **Title** | Single-session Coach preview |
| **Category** | Product Ideas |
| **Status** | Approved |
| **Importance** | Critical |
| **Owner** | Founder |
| **Last Updated** | 2026-09-07 |
| **Captured** | 2026-09-07 |
| **AI Steward** | Atlas |

---

## Statement

`/coach` is a single-step seven-topic card grid. A visitor chooses one topic and enters exactly one anonymous, private Forge preview session before signup or signin. Authentication occurs only after that session; claim preserves the preview topic and transcript. Authenticated Free members receive three complete sessions per calendar month, and the anonymous preview does not consume that allowance.

---

## Why it matters

The shortest honest route to TalkForge value is practice itself. A single declared topic avoids a discovery wizard, profile intake, model-dependent semantic gate, and pre-value authentication while preserving one clear choice and one complete coaching experience.

---

## Relationships

| Direction | Ideas |
|---|---|
| **Depends on** | IV-PROD-005 · IV-PROD-008 · IV-PROD-009 · IV-UX-006 |
| **Supports** | IV-RES-004 · IV-AI-007 |
| **Related** | IV-PROD-004 · IV-UX-009 · IV-REJ-003 · Decision 060 |

---

## Evidence

| Field | Value |
|---|---|
| **Why we believe this** | The Founder approved direct practice as the final Coach approach and rejected the unmerged multi-step wizard architecture. |
| **Sources** | Founder insight · Product intuition · Doctrine document (Craft Law #001 · DES-001 · OWN-001) |
| **Confidence** | High |

---

## Notes

- Exact Coach catalog: Interview; Salary negotiation; Difficult feedback; Setting a boundary; Pitch / Presentation; Handling conflict; Something else.
- Option B: reuse the shared `TopicCard` component, styling, and iconography; keep the Coach topic catalog independent from the Living Profile catalog.
- One anonymous preview is best-effort browser-bound through a signed HttpOnly cookie plus server rate and economic controls. It is not a provable one-per-person identity limit.
- The preview is a Forge session, not Assistant Coach discovery. It writes no Living Profile identity.
- No wizard, profile form, `member_practice_profile` field, semantic value gate, or pre-Forge auth.
- Founder-approved post-session contract:
  - Headline: **“You just completed your first rep.”**
  - Body: **“Save your progress and get 3 free sessions every month — no credit card required.”**
  - Primary CTA: **“Create account”**
  - Secondary CTA: **“Sign in”**
  - Tertiary: **“Maybe later”**
- Disable the composer/input while the auth prompt is visible. After **“Maybe later,”** keep further input disabled and show **“Ready to practice again? Create an account for 3 free sessions every month.”** with **“Get started”** linking to auth.

---

## Downstream

| Field | Value |
|---|---|
| Blind spot review | BS-015 |
| Roadmap link | MASTER-ROADMAP-001 · AC-JOURNEY-001 · PHASE4B-AC-IMPLEMENTATION-SEQUENCE |
| Priority | Critical — Founder-authorized Decision 060 track |
