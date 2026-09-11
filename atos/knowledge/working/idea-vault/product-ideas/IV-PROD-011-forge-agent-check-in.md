# IV-PROD-011 — Forge Agent check-in (proactive out-of-session outreach)

| Field | Value |
|---|---|
| **ID** | IV-PROD-011 |
| **Title** | Forge Agent check-in (proactive out-of-session outreach) |
| **Category** | Product Ideas |
| **Status** | In Development |
| **Importance** | Important |
| **Owner** | Founder |
| **Last Updated** | 2026-09-11 |
| **Captured** | 2026-09-11 |
| **AI Steward** | Atlas |

---

## Statement

Coach Forge is purely reactive today — value exists only inside a live session. Forge Agent is a member-opt-in, member-declared-cue-only background layer that drafts in-app check-ins (why sent, one next move, optional practice link) into an approval queue. Nothing leaves the queue without explicit member approve or deny. It writes no Living Profile identity and does not start a live Forge session.

---

## Why it matters

TalkForge currently has no mechanism to re-engage a member between coaching sessions. Homework and declared upcoming conversations die at End Session. Continuity between reps is the retention/habit-loop gap this idea addresses — without inventing calendar events, sending email, or auto-approving outreach.

---

## Relationships

| Direction | Ideas |
|---|---|
| **Depends on** | IV-PROD-005 · IV-PROD-004 · IV-UX-008 · IV-LAW-005 · IV-REJ-003 |
| **Supports** | IV-RES-004 · IV-PROD-006 |
| **Related** | IV-PROD-010 · OWN-001 · MBL-001 · Decision 061 · BS-018 |

---

## Evidence

| Field | Value |
|---|---|
| **Why we believe this** | Founder Decision 061 carved Phases 0–2 out of the general feature NO-GO: opt-in off by default, in-app only, member-declared cues, approval-gated, no identity writes. |
| **Sources** | Founder insight · Doctrine document (MBL-001 §14.2 · OWN-001 · Craft Law #001 · DES-001) |
| **Confidence** | High |

---

## Notes

v1 (Phases 0–2) ships:

- Idea Vault + Decision 061 admission
- Additive tables: preferences, cues, actions, unused runs audit
- Authenticated APIs + `/app/inbox` approve/deny UI
- Lazy materialization of **due** cues into pending actions with **template** copy (no cron, no LLM)

Explicitly out of scope until a later Founder go-ahead:

- Phase 3: cron + live draft agent
- Phase 4: ContinuityHome, Settings, `completePracticeSession` homework auto-cues, Realtime opening context
- Calendar integration
- Email / SMS delivery
- Auto-approval
- Writes to `living_profiles` or `coach_memory`
- VoiceArena / guest `/forge` preview changes

Governs itself by MBL-001 §14.2: a notification must relate to a member-declared conversation, commitment, or preference; state why it was sent; offer control; stop after decline.

---

## Downstream

| Field | Value |
|---|---|
| Blind spot review | BS-018 |
| Roadmap link | Decision 061 carve-out — Phases 0–2 only |
| Priority | Important — Founder-authorized Phases 0–2 |
