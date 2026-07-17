# TALKFORGE BUG LOG
Version 1.0

Permanent knowledge from TEP Rule #14.

---

## BUG-001 — Continue button after Mission Start

### Problem

The Continue button does nothing after Mission Start.

### Root Cause

In React Strict Mode (development), the mission session `useEffect` set `sessionInitialized.current = true`, then cleanup cancelled the first `createPracticeSession()`. The effect ran again, saw the ref still true, skipped creating a session, and left `session` null. Continue exited early because there was no active session.

### Solution

Remove the one-shot `sessionInitialized` gate. Share one in-flight session promise via refs. Let Continue call `ensureSession()` before `/api/coach`. Submit the reply through a `<form>`.

### Lessons Learned

- Refs that “run once” break under Strict Mode when paired with cancelled async work.
- Silent early returns hide root causes — surface errors when Continue cannot proceed.
- Verify session existence separately from click-handler existence.
- Investigate with TEP: observe → hypothesize → test one cause → then patch the smallest line set.
