# IV-UX-010 — First Session Experience Rating

| Field | Value |
|---|---|
| **ID** | IV-UX-010 |
| **Title** | First Session Experience Rating |
| **Category** | UX Ideas |
| **Status** | In Development |
| **Importance** | Important |
| **Owner** | Founder |
| **Last Updated** | 2026-08-06 |
| **Captured** | 2026-08-06 |
| **AI Steward** | Atlas |

---

## Statement

After a member’s very first completed practice session — once the wrap has finished and the session is saved — show a frictionless, once-only check-in. Mission question: **“Did Forge feel like a world-class communication coach?”** — exceptional bar, not merely “real.” Stars → one conditional follow-up → optional “What would have made this session even better?” → thank-you that reinforces building the world’s best communication coach. Always skippable. Internal-only behavioral signals (duration, completed, next session, return 24h/7d, explored another feature) sit beside the response.

---

## Why it matters

First impressions determine whether members return. A premium, effortless check-in understands their experience without turning the ending into homework — and feeds product judgment for CFP-001 / CFX-001 improvement.

---

## Relationships

| Direction | Ideas |
|---|---|
| **Depends on** | IV-PROD-005 · IV-AI-007 · IV-PHIL-009 · IV-PHIL-010 |
| **Supports** | IV-AI-006 · IV-RES-004 · IV-PROD-007 |
| **Related** | IV-FEAT-007 · IV-UX-001 · DES-001 |

---

## Evidence

| Field | Value |
|---|---|
| **Why we believe this** | Founder specified a once-only, sub-10-second emotional check-in after first completed session — not a recurring survey — with conditional follow-ups by star band. |
| **Sources** | Founder insight · Product intuition |
| **Confidence** | High |

---

## Notes

- Trigger only on first-ever completed session; store a once flag (server unique user_id + local cache).
- Member UI never says “experience rating” — ask the coach-mission question.
- Skip is always available; optional comment is never required.
- Behavioral signals are internal-only (never shown in the sheet), including curiosity: explored Profile/Machines, Activity, or Progress after first session.
- Blind spot: BS-015 — must not feel like a survey or interrupt before wrap/save.

---

## Downstream (filled in later EXEC steps)

| Field | Value |
|---|---|
| Blind spot review | BS-015 |
| Roadmap link | MASTER-ROADMAP-001 · E1 / D6 |
| Priority | Important — first-impression signal |
