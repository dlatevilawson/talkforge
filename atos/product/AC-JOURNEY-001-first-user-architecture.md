# AC-JOURNEY-001 — Single-session Coach preview architecture

| Field | Value |
|---|---|
| **Document ID** | AC-JOURNEY-001 |
| **Version** | 2.0.0 |
| **Status** | Working Knowledge — implementation authorized by Decision 060 |
| **Plane** | Working Knowledge (not Canonical product doctrine) |
| **Idea Vault** | [IV-PROD-010](../knowledge/working/idea-vault/product-ideas/IV-PROD-010-single-session-coach-preview.md) |
| **Owner** | Founder |
| **Updated** | 2026-09-07 |
| **Authority** | [Decision 060](../../atlas/decisions.md) supersedes Decision 059 journey mechanics; Decision 059 remains historical |
| **Implementation** | Small slices per [PHASE4B-AC-IMPLEMENTATION-SEQUENCE](PHASE4B-AC-IMPLEMENTATION-SEQUENCE.md) |

---

## A. Controlling journey

1. A visitor opens public `/coach`.
2. `/coach` shows one single-step grid of seven topic cards:
   - Interview
   - Salary negotiation
   - Difficult feedback
   - Setting a boundary
   - Pitch / Presentation
   - Handling conflict
   - Something else
3. Tapping one card creates or restores the browser-bound anonymous preview entitlement and enters exactly one private Forge session for that topic.
4. The session runs to its normal coaching close. Do not interrupt it with signup, signin, upgrade, profile, or quota UI.
5. Only after the session, show the Founder-approved post-session auth copy and offer signup or signin.
6. Successful auth claims the preview topic and transcript into the member account.
7. The claimed preview remains excluded from the authenticated Free allowance.
8. Authenticated Free members may start three complete sessions per calendar month. Pro/staff entitlement remains governed by BILL-001.

The preview is the first value. It is not Assistant Coach discovery followed by Forge.

---

## B. Explicitly retired mechanics

The active path has:

- no wizard or multi-step intake;
- no profile form or confirmation card;
- no `member_practice_profile` schema;
- no pre-Forge signup, signin, email-verification, or claim gate;
- no discovery LLM, semantic value test, `hasExperiencedValue`, intervention threshold, save gate, or anonymous turn cap used as conversion logic;
- no provisional Living Profile and no preview write to identity;
- no post-auth handoff into a second “first” Forge session.

Decision 059 remains unchanged as historical authority for the former pre-account Assistant Coach → semantic gate → claim → Forge design. Decision 060 supersedes those journey mechanics and is controlling.

The unmerged five-PR card-wizard stack is not a dependency and must not be merged, cherry-picked, or treated as the implementation base for this architecture.

---

## C. Card reuse boundary — Option B

Reuse the shared visual `TopicCard` component:

- component behavior and accessibility;
- card styling and states;
- iconography system;
- responsive grid treatment.

Keep catalogs independent:

| Catalog | Authority | May contain |
|---|---|---|
| Coach | This document / Decision 060 | Exactly the seven labels in §A |
| Living Profile | Living Profile product and identity governance | Its own member-declared focus taxonomy |

Visual reuse must not couple catalog arrays, IDs, ordering, persistence, analytics semantics, or future catalog changes. A Living Profile catalog edit must not silently change `/coach`, and a Coach catalog edit must not write or redefine identity.

---

## D. Session and claim model

### D.1 Anonymous preview

| Concern | Rule |
|---|---|
| Scope | Exactly one complete private Forge session for the selected topic |
| Binding | Signed HttpOnly Secure cookie + server-side anonymous session |
| Persistence | Server is authoritative; client storage is not entitlement |
| TTL | Up to 14 days for same-browser auth claim continuity and abandoned-data cleanup |
| Privacy | No transcript text in third-party analytics |
| Identity | Anonymous session is not a user, profile, or Living Profile |
| Forge access | Narrow one-session preview authorization only; no general anonymous practice entitlement |

The 14-day TTL preserves the completed preview long enough for same-browser claim. It does not grant 14 days of repeated preview access.

### D.2 Claim after auth

Claim is idempotent and server-authoritative:

1. Verify authenticated member session.
2. Verify the signed anonymous cookie and unexpired preview session.
3. Lock the preview against concurrent or cross-account claim.
4. Attach or copy the selected topic and transcript into the authenticated member’s practice history.
5. Mark the preview claimed while preserving its preview classification.
6. Do not increment the member’s Free calendar-month usage for that preview.
7. Clear or rotate the anonymous binding after successful claim.

If auth fails, the completed preview remains available for same-browser retry until TTL. Clearing the cookie loses claim proof. No archive recovery or cross-device reassignment is authorized.

### D.3 Identity boundary

Living Profile remains the identity SSOT. The selected preview topic is practice context and transcript metadata, not a profile assertion. Preview and claim do not write purpose, goals, challenges, strengths, principles, seasons, profile evidence, insights, or any new identity field. Later System 1 processing must use its existing governed evidence and confirmation path; it is outside this slice.

---

## E. Entitlement and economics

| Member state | Session rule |
|---|---|
| Anonymous browser | One best-effort browser-bound preview |
| Authenticated Free | Three complete sessions per calendar month |
| Preview later claimed | Preserved, but excluded from Free monthly count |
| Pro / staff | Existing BILL-001 server entitlement |

The calendar month is evaluated by server time with an explicit, implementation-level timezone boundary. A session consumes Free allowance only under BILL-001 completion semantics; never revoke or interrupt an active session.

Every cost-bearing entry point—including Realtime token mint, session start, reconnect, and concurrent-session handling—must independently resolve server entitlement. Client plan, card, topic, preview, or counter claims never grant Realtime access.

---

## F. Abuse limitation and truthfulness

“One preview” is a best-effort browser-bound product limit, not a provable one-person identity limit. A person can clear cookies or use another browser/device. Shared browsers can represent multiple people.

Required controls:

- signed HttpOnly cookie and server session truth;
- rate limits for preview mint, Realtime token mint, and reconnect;
- per-session concurrency and replay protection;
- origin/CSRF controls on mutating cookie routes;
- session duration, token, and spend ceilings;
- abuse monitoring without transcript bodies;
- fail closed when preview or member entitlement cannot be verified.

Do not use invasive fingerprinting, claim “one per person,” revive cloud `guest_*`, or reassign archived guest data. HARDEN-005 remains binding and unchanged.

---

## G. Post-session experience

The session reaches a genuine coaching wrap before auth UI appears. The post-session surface uses the exact Founder-provided copy; implementation must not paraphrase, optimize, or A/B-test it without a later Founder decision.

| Element | Exact Founder-approved copy |
|---|---|
| Headline | **“You just completed your first rep.”** |
| Body | **“Save your progress and get 3 free sessions every month — no credit card required.”** |
| Primary CTA | **“Create account”** |
| Secondary CTA | **“Sign in”** |
| Tertiary | **“Maybe later”** |

Behavior:

- Signup and signin appear only after the session.
- The composer/input is disabled whenever the auth prompt is visible.
- **“Create account”** and **“Sign in”** enter their corresponding auth paths while preserving the preview claim binding.
- If the visitor selects **“Maybe later,”** dismiss the auth prompt but keep further input disabled.
- After **“Maybe later,”** show exactly **“Ready to practice again? Create an account for 3 free sessions every month.”** with **“Get started”** linking to auth.
- Do not imply the preview consumed one of the three Free monthly sessions.
- Do not use “quota,” “usage limit,” guilt, urgency, or cross-device recovery promises.

---

## H. Failure and integrity matrix

| Failure | Required result |
|---|---|
| Cookie tampered or absent before start | No preview entitlement; safe restart subject to controls |
| Refresh/reconnect during preview | Resume the same server session; never mint a second entitlement |
| Model/Realtime failure | Retry within the same session and economic envelope |
| Auth failure after session | Preserve same-browser claim opportunity until TTL |
| Duplicate claim | Idempotent success for same member |
| Claim by another account | Reject |
| Claim after TTL | Reject; no archive recovery |
| Entitlement store unavailable | Fail closed before new cost-bearing session |
| Transcript claim persistence fails | Do not mark claim complete |

---

## I. Analytics

Allowed non-PII events may measure topic-card selection, preview start/completion, post-session auth surface, signup/signin completion, claim, and later member session start. Never send transcript text, audio, free text from “Something else,” Living Profile data, or raw cookie/session secrets.

The anonymous preview and authenticated monthly sessions must have distinct server classifications so billing analytics cannot accidentally count the preview.

---

## J. Acceptance boundaries

A compliant implementation proves:

- one single-step seven-card `/coach` surface with exact labels;
- Option B shared `TopicCard` visuals and independent catalogs;
- card tap enters exactly one anonymous private Forge preview;
- no auth or profile gate before Forge;
- post-session-only signup/signin;
- claim preserves topic and transcript;
- authenticated Free allowance is three sessions per calendar month;
- preview never consumes that allowance;
- server-authoritative Realtime/economic enforcement;
- LP remains identity SSOT and preview writes no identity;
- no wizard, `member_practice_profile`, semantic gate, or `guest_*` revival.

No schema or application code is authorized by this governance-only package itself. Implementation proceeds only through the rewritten sequence.

---

## Change log

| Version | Date | Change |
|---|---|---|
| 1.x | 2026-08-16–2026-09-05 | Decision 059 Assistant Coach discovery → semantic gate → claim → Forge architecture (historical) |
| 2.0.0 | 2026-09-07 | Decision 060 final approach: seven-topic card grid → one anonymous private Forge preview → post-session auth and claim |
