# IV-UX-011 — Onboarding dose, assessment resume, and plain-language baseline

| Field | Value |
|---|---|
| **ID** | IV-UX-011 |
| **Title** | Onboarding dose, assessment resume, and plain-language baseline |
| **Category** | UX Ideas |
| **Status** | In Development |
| **Importance** | Critical |
| **Owner** | Founder |
| **Last Updated** | 2026-11-17 |
| **Captured** | 2026-11-16 |
| **AI Steward** | Atlas |

## Statement

Make the training journey adaptive without adding a form wall: collect an optional one-tap daily practice duration after signup, ask for a concrete bottleneck story in Forge's existing assessment slot, persist partial answers and resume at the next unanswered slot, show a dated baseline only after the Living Profile write, and re-ask bottleneck plus daily duration at each two-week check-in. Existing members may tune context voluntarily without changing generated days or history.

## Why it matters

The current onboarding captures plan/focus context but not practice dose. An unfinished assessment can lose its structured progress between tabs. Members also do not get a trustworthy plain-language statement of what the assessment did and did not establish, and old profile answers need a deliberate re-ask point.

## Relationships

| Direction | Ideas |
|---|---|
| **Depends on** | IV-UX-009 · IV-PROD-004 · IV-PROD-005 · IV-UX-010 |
| **Supports** | IV-PHIL-004 · IV-PHIL-009 · DES-001 · LP-LAW-001 |
| **Related** | Decision 060 · Decision 063 · IV-PROD-011 |

## Evidence

| Field | Value |
|---|---|
| **Why we believe this** | Founder-approved onboarding map and A–D decisions (2026-11-17); fresh user walk identified friction when the member must invent a practice topic and answer; previous profile content became stale without a re-ask point. |
| **Sources** | Founder direction · Live product walkthrough · Existing assessment and journey contracts |
| **Confidence** | High |

## Notes

- Daily duration is optional 5/10/15 minutes; database null remains “not set.” Existing plans are not backfilled.
- Keep the seven assessment slots and their order frozen. The story ask rewords `what_goes_wrong`; it adds no slot and no practice gate.
- Partial snapshots are member evidence for resumption only. They do not create a readiness result or invent identity claims.
- The baseline names all five readiness dimensions, but each remains “Not measured yet” unless future evidence supports a specific description. Never translate legacy presence scores into readiness.
- Keep this post-auth onboarding surface separate from the Decision 060 `/coach` preview; do not add a Coach-track form or pre-Forge authentication.
- Existing members may tune occasion, bottleneck, and daily duration voluntarily. This writes member-declared context and plan duration only; generated days and history remain unchanged.
- Founder-approved build decisions do not make this Working Knowledge Canonical.

## Downstream

| Field | Value |
|---|---|
| Blind spot review | BS-019 — baseline theater, stale answers, and accidental existing-plan mutation |
| Roadmap link | MASTER-ROADMAP-001, Phase D, D7 |
| Priority | Founder-approved 2026-11-17 |
