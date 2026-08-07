# IV-PROD-008 — Billing & Membership (Free / Pro)

| Field | Value |
|---|---|
| **ID** | IV-PROD-008 |
| **Title** | Billing & Membership Platform (Free / Pro) |
| **Category** | Product Ideas |
| **Status** | In Development |
| **Importance** | Critical |
| **Owner** | Founder |
| **Last Updated** | 2026-08-07 |
| **Captured** | 2026-08-07 |
| **AI Steward** | Atlas |

---

## Statement

TalkForge sells preparation, confidence, and communication mastery — not AI. Production billing supports exactly two plans (Free and Pro) via Stripe Checkout + Customer Portal. Free is generous enough to experience a full coaching cycle; Pro removes practice limits. The payment experience must never feel like a paywall — it is the natural next step after members discover deliberate practice. Backend subscription state in Supabase is the source of truth; client state is never trusted.

---

## Why it matters

Without trustworthy membership, TalkForge cannot sustainably deliver Coach Forge at voice scale. Without trust-first billing, monetization contradicts Craft Law #001 and DES-001.

---

## Relationships

| Direction | Ideas |
|---|---|
| **Depends on** | IV-PROD-004 · IV-PROD-005 · IV-PHIL-009 · IV-LAW-012 · TIP-001 |
| **Supports** | IV-PROD-007 · IV-RES-004 · IV-AI-007 |
| **Related** | IV-REJ-001 · IV-REJ-005 · OWN-001 · FREEZE-001 |

---

## Evidence

| Field | Value |
|---|---|
| **Why we believe this** | Founder issued Production v1 Billing & Subscription Platform spec: Free/Pro only, configurable free limits, never interrupt live sessions, Membership page (not Pricing), Stripe Checkout/Portal/webhooks, calm failed-payment handling. |
| **Sources** | Founder insight · Product intuition · Doctrine document (Craft Law #001 · DES-001 · AMD-001) |
| **Confidence** | High |

---

## Notes

- Do not build Team/Enterprise in v1.
- Experiences never write identity (OWN-001). Billing may sync `profiles.role` user↔premium only.
- Avoid dark patterns: no countdown timers, fake urgency, guilt messaging.
- Blind spot: BS-016.

---

## Downstream

| Field | Value |
|---|---|
| Blind spot review | BS-016 |
| Roadmap link | MASTER-ROADMAP-001 · Phase F Membership |
| Priority | Critical — Founder-authorized Production v1 |
