# TALKFORGE BUG LOG
Version 1.1

Permanent knowledge from TEP Rule #14.

---

## BUG-001 — Continue fails after mission begin (Open)

### Status

**Open — production observation**

### Problem

Continue button behaves inconsistently after the mission begins. Observed reports include: first request can succeed; later requests fail; sometimes context appears to reset; API errors have appeared; environment/tooling failures have also occurred.

### Confirmed (closed sub-findings — not the open production cause)

1. **Strict Mode session init (historical):** a one-shot `sessionInitialized` ref could leave `session` null on first Continue. Mitigated on `main` via shared session promise + `ensureSession()`.
2. **Empty reply without new typing:** Continue exits before `/api/coach` when `message === ""`.
3. **Synthetic overlap race (investigation tooling only):** dual `form.requestSubmit()` from Puppeteer cleared text typed after the first request finished. Stacks proved instrumentation origin (`/tmp/tep-prove-requestsubmit.mjs`), not application code. **Not accepted as production cause.**

### Root Cause (production)

**Unknown.** Awaiting first real production failure capture.

### Observation protocol (current objective)

Do **not** optimize for reproducing the bug. Optimize for observing a real failure.

When Continue fails in a real session, capture console lines tagged `[TEP][Continue]`:

- `before empty guard` — `rawValue`, `isEmpty`, `eventType`, `isTrusted`, `submitter`, `invocationId`, `stack`
- `FAIL empty-message guard` — if the empty guard tripped
- `clearing textarea after success` — `invocationId`, `valueBeforeClear`, `stack`
- `FAIL request/persist` — API/persist errors
- `blocked by loading/ending` — silent loading gate

Every hypothesis must compete against newly captured evidence from a real failure.

### Solution

Not approved. No production fix until root cause is evidenced from a real failure.

### Lessons Learned (so far)

- Distinguish synthetic reproduction from production causation.
- `requestSubmit` dual-submit stacks pointed at investigation tooling, not TalkForge app code (no `requestSubmit` in repo).
- Empty-guard failures require proving `textareaRef.current.value` at the guard, not assuming user intent.
