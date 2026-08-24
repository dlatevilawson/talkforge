# IV-AI-009 — Atlas Ask remembers the thread

| Field | Value |
|---|---|
| **ID** | IV-AI-009 |
| **Title** | Atlas Ask remembers the thread |
| **Category** | AI Ideas |
| **Status** | In Development |
| **Importance** | Useful |
| **Owner** | Founder |
| **Last Updated** | 2026-08-24 |
| **Captured** | 2026-08-23 |
| **AI Steward** | Atlas |

---

## Statement

Ask Atlas must keep the current conversation. A follow-up should use the last answers. Atlas still reasons from institutional documents. It does not invent company memory, write identity, or start fixing product.

---

## Why it matters

Founder walk (2026-08-23): Atlas answers a question, then forgets that answer on the next one. The bug is mechanical: Ask Atlas sent one isolated message and replaced the previous reply in the UI.

---

## Relationships

| Direction | Ideas |
|---|---|
| **Depends on** | IV-AI-008 · IV-AI-001 · IV-LAW-011 |
| **Supports** | Founder decision quality |
| **Related** | IV-UX-010 · IV-AI-010 · RES-012 (Founder-visible runtime stays off) |

---

## Evidence

| Field | Value |
|---|---|
| **Why we believe this** | Founder: Atlas reports back, then forgets follow-ups. Code: Ask Atlas was one-shot. |
| **Sources** | Founder insight · Internal experiment (code inspection) |
| **Confidence** | High |

---

## Notes

Working Knowledge. Thread is this sitting only (Temporary). Not Canonical. `ATLAS_RUNTIME_FOUNDER_VISIBLE` stays off. Atlas does not write Living Profile.

**G1 ceiling:** sitting-thread continuity is not Executive Memory. Close sitting runs Memory Keeper; durable recall is Operational / Promotion Candidate with provenance ([IV-AI-010](IV-AI-010-atos-continuous-intelligence.md) G1). Do not reintroduce a pre-G1 Ask Atlas panel that drops Close sitting or recall.

---

## Downstream (filled in later EXEC steps)

| Field | Value |
|---|---|
| Blind spot review | Fabricated institutional memory; thread treated as Canonical |
| Roadmap link | This slice |
| Priority | Founder-approved 2026-08-24 |
