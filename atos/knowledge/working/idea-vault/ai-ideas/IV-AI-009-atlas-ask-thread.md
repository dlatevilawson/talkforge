# IV-AI-009 — Atlas Ask remembers the thread

| Field | Value |
|---|---|
| **ID** | IV-AI-009 |
| **Title** | Atlas Ask remembers the thread |
| **Category** | AI Ideas |
| **Status** | Inbox |
| **Importance** | Useful |
| **Owner** | Founder |
| **Last Updated** | 2026-08-23 |
| **Captured** | 2026-08-23 |
| **AI Steward** | Atlas |

---

## Statement

Ask Atlas must keep the current conversation. A follow-up (“what did you just say?” / “go deeper on that”) should use the last answers. Atlas still reasons from institutional documents. It does not invent company memory, write identity, or start fixing product.

---

## Why it matters

Founder walk (2026-08-23): Atlas answers a question, then forgets that answer on the next one. A Chief of Staff who wipes the whiteboard after every sentence is not counsel. The bug is mechanical: Ask Atlas sends one isolated message and replaces the previous reply in the UI.

---

## Relationships

| Direction | Ideas |
|---|---|
| **Depends on** | IV-AI-008 · IV-AI-001 · IV-LAW-011 |
| **Supports** | Founder decision quality |
| **Related** | IV-UX-010 · RES-012 (Founder-visible runtime stays off) |

---

## Evidence

| Field | Value |
|---|---|
| **Why we believe this** | Founder: Atlas reports back, then forgets follow-ups. Code: `AskAtlasPanel` clears `response` each submit; `generateAtlasResponse` sends only the new user line. |
| **Sources** | Founder insight · Internal experiment (code inspection) |
| **Confidence** | High |

---

## Notes

Working Knowledge. Not Canonical.

Safe slice: keep last N turns in the Ask Atlas panel; send that thread with the new question; show the thread, not one overwritten paragraph.

Do not enable `ATLAS_RUNTIME_FOUNDER_VISIBLE`. Do not let Atlas open PRs or write Living Profile. Thread memory is this conversation, not a new identity store.

---

## Downstream (filled in later EXEC steps)

| Field | Value |
|---|---|
| Blind spot review | Fabricated institutional memory; thread treated as Canonical |
| Roadmap link | *(awaiting Founder approve-to-build)* |
| Priority | *(none until plan accepted)* |
