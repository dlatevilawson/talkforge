# PHASE4B-AC-IMPLEMENTATION-SEQUENCE — Coach preview slices

| Field | Value |
|---|---|
| **Document ID** | PHASE4B-AC-001 |
| **Version** | 2.0.0 |
| **Status** | Authoritative sequence under Decision 060 |
| **Authority** | [Decision 060](../../atlas/decisions.md) · [AC-JOURNEY-001](AC-JOURNEY-001-first-user-architecture.md) · [IV-PROD-010](../knowledge/working/idea-vault/product-ideas/IV-PROD-010-single-session-coach-preview.md) |
| **Law** | Small reviewable slices. No wizard-stack dependency. No `guest_*` revival. |
| **Updated** | 2026-09-07 |

---

## Controlling constraints

| Constraint | Source |
|---|---|
| `/coach` is one single-step seven-topic card grid | Decision 060 |
| Tapping one card enters exactly one anonymous private Forge preview | Decision 060 |
| Signup/signin only after the session | Decision 060 |
| Claim preserves preview transcript and topic | Decision 060 |
| Free = three complete sessions per calendar month | Decision 060 · BILL-001 |
| Claimed or unclaimed preview does not consume Free allowance | Decision 060 · BILL-001 |
| Option B: shared `TopicCard` visuals, independent Coach and LP catalogs | Decision 060 |
| LP remains identity SSOT; preview writes no identity | LP-LAW-001 · OWN-001 |
| Signed HttpOnly server anon session; 14-day claim TTL where appropriate | Decision 060 |
| One preview is best-effort browser-bound, not provable person identity | BS-015 |
| Realtime/economic authorization is server-authoritative | BILL-001 · Decision 060 |
| No wizard, profile form, `member_practice_profile`, semantic gate, or pre-Forge auth | Decision 060 |
| No cloud `guest_*`, archive recovery, or guest reassignment | HARDEN-005 |
| Decision 059 remains historical; its journey mechanics are superseded | Decision 060 |

Exact Coach labels, including punctuation and casing:

1. Interview
2. Salary negotiation
3. Difficult feedback
4. Setting a boundary
5. Pitch / Presentation
6. Handling conflict
7. Something else

---

## Prerequisite — governance only

### Slice C0 — Decision 060 package

Update Decision Ledger, Idea Vault, Blind Spot Register, BILL-001, AC-JOURNEY-001, roadmap/execution indexes, and AGENTS.md. Do not change schema or code. Done when governance checks and `git diff --check` pass and the diff contains no frozen HARDEN document or plan artifact.

---

## Implementation sequence

### Slice C1 — Independent Coach catalog + shared visual card

| Item | Requirement |
|---|---|
| Shared UI | Extract or reuse `TopicCard` component, styling, states, accessibility, and iconography |
| Coach catalog | New Coach-owned catalog with exactly the seven labels above |
| LP catalog | Remains independently owned and unchanged |
| Tests | Exact labels/order; catalog object/reference independence; keyboard and card activation |
| Non-goals | Profile schema, persistence, auth, Forge session |

This is Option B. Do not import the Living Profile catalog into Coach or make either catalog an alias of the other.

### Slice C2 — Preview entitlement contract

| Item | Requirement |
|---|---|
| Server record | Anonymous preview session with selected Coach topic, lifecycle, expiry, economic envelope, and preview classification |
| Cookie | Signed, HttpOnly, Secure, SameSite, server-verifiable |
| TTL | Up to 14 days for same-browser session/claim continuity |
| Limit truth | One best-effort browser-bound preview; never claim person-level proof |
| Ban | No Supabase anonymous user, `guest_*`, profile draft, Living Profile row, or `member_practice_profile` |
| Tests | Mint/restore; tamper/expiry; same browser cannot mint a second preview; no guest imports |

Reuse existing safe signed-cookie/server-session substrate only where it fits this contract. Do not retain semantic-gate or Assistant Coach turn semantics merely because columns or code exist.

### Slice C3 — Server-authoritative preview Forge authorization

| Item | Requirement |
|---|---|
| Entry | Selected valid Coach topic + unused server preview entitlement |
| Realtime | Mint only after server independently verifies preview status and economic limits |
| Scope | One private Forge session; no general anonymous `/app` or practice access |
| Economics | Duration/token/spend/concurrency/reconnect controls enforced server-side |
| Failure | Fail closed before cost-bearing work when truth is unavailable |
| Tests | Forged client plan/topic/counter rejected; replay/concurrency bounded; authenticated entitlement unchanged |

Do not route through Assistant Coach discovery, model turns, intervention validation, `hasExperiencedValue`, or pre-Forge auth.

### Slice C4 — `/coach` single-step card grid

| Item | Requirement |
|---|---|
| Route | Public `/coach` |
| Surface | One responsive card grid; no stepper, wizard, profile form, thread, or diagnosis |
| Action | One tap chooses topic and enters the preview Forge session |
| “Something else” | Topic label may carry generic practice context; do not add a profile intake form in this slice |
| Tests | Desktop/mobile render; exact seven cards; every card starts C3 path; no auth request before Forge |

### Slice C5 — Post-session auth surface

| Item | Requirement |
|---|---|
| Timing | Only after genuine Forge session close |
| Headline | **“You just completed your first rep.”** |
| Body | **“Save your progress and get 3 free sessions every month — no credit card required.”** |
| Actions | Primary **“Create account”** · secondary **“Sign in”** · tertiary **“Maybe later”** |
| Input state | Composer/input disabled while the auth prompt is visible |
| Maybe later | Keep further input disabled; show **“Ready to practice again? Create an account for 3 free sessions every month.”** with **“Get started”** linking to auth |
| Continuity | Preserve signed preview binding through auth |
| Ban | No mid-session modal, semantic save gate, upgrade interruption, or profile confirmation |
| Tests | Auth UI absent before/during session; exact-copy assertions; input disabled during prompt; Maybe later state keeps input disabled; Get started targets auth |

C5 must not paraphrase, optimize, or A/B-test this Founder-approved contract without a later Founder decision.

### Slice C6 — Post-auth preview claim

| Item | Requirement |
|---|---|
| Claim | Auth-required, signed-cookie-bound, idempotent, concurrent-safe |
| Preserve | Full available preview transcript, selected Coach topic, timestamps, and preview classification |
| Destination | Member practice history/session ownership—not Living Profile identity |
| Billing | Exclude preview from Free monthly completed-session count |
| Recovery | Same-browser within TTL only; no archive or cross-device guest recovery |
| Tests | Signup and signin claim; retry; cross-account rejection; transcript/topic retained; LP unchanged |

### Slice C7 — Free calendar-month allowance

| Item | Requirement |
|---|---|
| Allowance | Three complete sessions per calendar month |
| Boundary | Server-defined calendar-month timezone, documented and tested |
| Counting | BILL-001 completion semantics; never count preview |
| Active session | Never interrupt or revoke mid-session |
| Realtime | Every mint independently resolves server entitlement |
| Tests | Month rollover; exactly three starts/completions under defined semantics; claimed preview excluded; client claims ignored |

### Slice C8 — Abuse and economic hardening

| Item | Requirement |
|---|---|
| Controls | Mint/start/reconnect rate limits, origin/CSRF, concurrency, replay, duration/token/spend ceilings |
| Monitoring | Non-PII operational events; no transcript text |
| Language | Never represent browser-bound control as provable one-person identity |
| Privacy | No invasive fingerprinting without a later Founder decision |
| Tests | Cookie clearing limitation documented; rate/economic fail-closed matrix |

### Slice C9 — Funnel analytics and expiry

Measure card selection, preview start/completion, post-session auth display, auth completion, claim, and member session starts without transcript/free-text payloads. Purge abandoned anonymous preview data after TTL under existing retention rules.

### Slice C10 — Retire superseded active paths

After the direct preview path is proven:

- remove or bypass the Assistant Coach conversational first-user path;
- remove wizard/profile-contract dependencies if present on an implementation branch;
- remove active semantic-gate, intervention, provisional-LP, confirm, and second-Forge handoff mechanics;
- preserve migrations/history non-destructively when removal would be unsafe;
- keep Decision 059 historical governance unchanged.

Do not merge or use the five-PR wizard stack to accomplish this slice.

---

## Dependency order

```text
C0 governance
  → C1 independent catalog/shared card
  → C2 preview entitlement
  → C3 preview Forge authorization
  → C4 /coach grid
  → C5 post-session auth
  → C6 claim
  → C7 Free monthly allowance
  → C8 abuse/economic hardening
  → C9 analytics/expiry
  → C10 superseded-path retirement
```

C7 contract tests may begin after C2, but production integration must verify C6 exclusion semantics. C8 is cross-cutting and must gate the first cost-bearing preview release.

---

## Security and integrity checklist

- [ ] Signed HttpOnly Secure cookie; server session SSOT
- [ ] One narrow preview Forge authorization, not general anonymous practice access
- [ ] Server-authoritative Realtime and billing entitlement at every cost-bearing boundary
- [ ] Preview excluded from Free three-per-calendar-month count
- [ ] Transcript/topic claim is idempotent and cross-account safe
- [ ] No preview identity/LP writes
- [ ] No `guest_*`, anonymous auth user, archive recovery, or reassignment
- [ ] Rate, concurrency, duration, token, and spend controls
- [ ] No transcript or “Something else” text in analytics
- [ ] Post-session auth only; exact-copy and disabled-input tests, including Maybe later → Get started
- [ ] Shared `TopicCard` visuals but independent catalog contracts

---

## Explicit non-goals

- Multi-step card wizard
- Profile intake or verification card
- `member_practice_profile` or any new schema in this governance package
- Assistant Coach discovery before Forge
- Semantic conversion/value gate
- Pre-Forge signup, signin, or verification
- Anonymous identity or provable one-person enforcement
- Assessment deletion
- Frozen HARDEN document edits
- General feature-GO or FREEZE-001 lift

---

## Change log

| Version | Date | Change |
|---|---|---|
| 1.0.0 | 2026-08-16 | Decision 059 Assistant Coach Phase 4B sequence (historical design) |
| 2.0.0 | 2026-09-07 | Decision 060 direct one-session Coach preview sequence; wizard stack rejected |
