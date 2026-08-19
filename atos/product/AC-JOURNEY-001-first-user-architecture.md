# AC-JOURNEY-001 — First-user journey & conversion architecture (Phase 4A)

| Field | Value |
|---|---|
| **Document ID** | AC-JOURNEY-001 |
| **Status** | Working Knowledge — **OD-0…OD-10 decided** (Decision 059); Phase 4B sequenced |
| **Plane** | Working Knowledge (not Canonical product doctrine) · **implementation authorized** for this track |
| **Idea Vault** | [IV-PROD-009](../knowledge/working/idea-vault/product-ideas/IV-PROD-009-first-user-assistant-coach-journey.md) |
| **Owner** | Founder |
| **Created** | 2026-08-16 |
| **Authority** | [Decision 059](../../atlas/decisions.md) · OWN-001 / FREEZE-001 (unrelated identity) still bind |
| **Implementation** | Phase 4A = design. Phase 4B = small slices per [PHASE4B-AC-IMPLEMENTATION-SEQUENCE](PHASE4B-AC-IMPLEMENTATION-SEQUENCE.md) |

---

## A. Current architecture audit

### A.1 What exists and can be reused

| Area | Shipping truth | Reuse for 4B |
|---|---|---|
| **Auth** | Supabase Auth + cookie SSR (`@supabase/ssr`); `proxy.ts` → `updateSession` | Keep as authenticated identity plane |
| **Account** | `profiles` (role, onboarding_complete, email_verified) | Claim target |
| **Session APIs** | `requireApiUser`, `readSession`, `/api/auth/session` | Gate authenticated AC/Forge routes |
| **Living Profile** | `living_profiles` row per auth UUID; signup trigger + `ensurePersistedLivingProfile` | Authenticated persistence SSOT |
| **LP member writes** | `PUT /api/living-profile` via `applyMemberLivingProfileUpdate` | Do not use for anonymous evidence |
| **Assessment → LP** | `POST /api/assessment/complete` writes goals/challenges (+ optional empty purpose) | Remains parallel until AC replaces Assessment FTUE |
| **System 1 Phase 1** | `evidenceLedger` / `profileInsights` **TS-only** (map defaults `[]`) | Needs migration before prod AC |
| **Assistant Coach Phases 1–3** | `lib/assistant-coach/*` — runtime, validation, readiness, handoff, in-memory repo | Intelligence reused as-is |
| **Forge** | `/app/practice` VoiceArena; requires auth + LP readiness + entitlement | Post-handoff only |
| **Analytics** | GA4 + `trackAuthEvent` / billing events (`domain_action` snake_case) | Extend categories; no transcript text |
| **Local guest leftovers** | `guest_*` detection + `migrateGuestPracticeData` (localStorage only; cloud guest **retired** HARDEN-005) | Pattern for claim, **not** revive cloud guests |

### A.2 What does **not** exist

- Anonymous Supabase Auth (`signInAnonymously` unused)
- Public pre-auth coaching surface
- Assistant Coach HTTP API / UI
- DB columns for `evidence_ledger` / `profile_insights`
- Product analytics for landing → coach → value → gate → Forge
- Atomic anonymous → authenticated claim for LP/evidence

### A.3 Shipping first-user path today (conflict)

```
Landing CTA "Prepare for today" → /signup
→ verify email → /onboarding (optional focus)
→ /app ContinuityHome
→ Explorer: Assessment Forge OR open Forge practice
```

**Account gates first value.** Proxy: unauthenticated `/app/*` → `/signup`. Practice APIs: `requireApiUser`. Guest minting: **gone**.

### A.4 Assistant Coach library (Phases 1–3)

```
runAssistantCoachTurn
→ LLM { reply, observations }
→ validate → addProfileEvidence → deriveProfileInsights
→ evaluateForgeReadiness → buildForgeHandoffContext
```

Intelligence is identity-agnostic given a `LivingProfile` object. **Auth must not change this path** — only ownership of the profile/session rows.

### A.5 Governance conflict — **resolved for this track (Decision 059)**

AUDIT-001.2 / Decision 053 / EXEC-VERIFY-001 historically: **NO-GO feature expansion**; GO only for prod migration/hardening.  
FREEZE-001 / OWN-001: identity PR hold; experiences never write identity.

**Decision 059 (OD-0):** Explicitly **supersedes** that feature NO-GO **for the Assistant Coach first-user architecture only**. Unrelated feature expansion and held identity PR merges remain **NO-GO**. OWN-001 and FREEZE-001 (held identity PRs) stand.

---

## B. Recommended first-user journey

### B.1 Interaction sequence

1. **Landing** (`/`) — **primary** CTA = Assistant Coach (OD-5). Secondary only: Sign in / Founding Pass. Assessment not an equal competing CTA.
2. **Start** — mint anonymous coach session (signed HttpOnly cookie + server row). Redirect `/coach` (public).
3. **Anonymous Assistant Coach** — same `runAssistantCoachTurn` intelligence; server holds history + provisional LP.
4. **Value in progress** — personalized replies grounded in validated evidence.
5. **Save gate eligible** — server sets sticky `hasExperiencedValue` (deterministic; **semantic** conversion — not turn count).
6. **Save gate shown** — modal with **placeholder** copy keys only (OD-10). Signup + Login. **No indefinite anonymous continue** after meaningful value (OD-1 hard gate).
7. **Auth** — existing email/password flows; prefer **soft email verification** for Coach continuation (OD-8).
8. **Claim** — atomic attach of anonymous session → authenticated user; conversation continues mid-thread.
9. **Authenticated Assistant Coach** — same UI/runtime; persistence now on member LP. Skip redundant onboarding (OD-7).
10. **Forge-ready** — `evaluateForgeReadiness` → handoff card → `/app/practice` (Assessment not default FTUE; kept available — OD-6).
11. **Forge** — requires account/claim (OD-4); coaching-only; read-only handoff/LP context (later slice).

### B.2 What we deliberately remove from the happy path

- Forcing Assessment as FTUE (Explorer assessment becomes optional fallback until retired).
- Asking communication intake on `/onboarding` that AC already learned.
- Gating the first Coach reply behind signup.

### B.3 Progressive commitment

| Stage | Ask for |
|---|---|
| Gate | Email + password (or existing login) only |
| Post-claim | Optional display name if missing |
| Never at gate | Purpose, principles, seasons, communication goals (AC owns these conversationally) |
| Member settings later | Purpose / principles (member-owned identity) |

---

## C. State transition model

### C.1 Product states (server-authoritative where marked ★)

| State | Meaning | Auth required | Survives refresh | Survives browser close |
|---|---|---|---|---|
| `VISITOR` | Landed; no coach session | No | N/A | N/A |
| `ANON_SESSION_ACTIVE` ★ | Anonymous coach session + cookie | No | Yes (cookie + server row) | Yes until TTL |
| `VALUE_IN_PROGRESS` ★ | Session active; value not yet met | No | Yes | Yes until TTL |
| `SAVE_GATE_ELIGIBLE` ★ | `hasExperiencedValue` true | No | Yes | Yes until TTL |
| `SAVE_GATE_SHOWN` | Client presented gate (telemetry) | No | Hard after value (OD-1) | Until claim / TTL |
| `AUTH_IN_PROGRESS` | Signup/login UI | No→Yes | Auth cookies | Yes |
| `CLAIMED` ★ | Anonymous owned by `user_id` | Yes | Yes | Yes |
| `AC_ACTIVE_AUTH` ★ | Continuing AC as member | Yes | Yes | Yes |
| `FORGE_READY` ★ | Readiness true; handoff available | Yes* | Yes | Yes |
| `FORGE_ACTIVE` | In VoiceArena practice | Yes | Session-scoped | Per Forge rules |

\* Forge requires claim (OD-4 / Decision 059). Anonymous Forge is out of scope.

### C.2 Transitions

| From → To | Trigger | Reversible? |
|---|---|---|
| VISITOR → ANON_SESSION_ACTIVE | CTA start; server mints session | No (new session) |
| ANON_SESSION_ACTIVE → VALUE_IN_PROGRESS | First validated useful evidence **or** N≥1 substantive turns with personalized ack | Soft |
| VALUE_IN_PROGRESS → SAVE_GATE_ELIGIBLE | `hasExperiencedValue` algorithm | No (sticky once true) |
| SAVE_GATE_ELIGIBLE → SAVE_GATE_SHOWN | Client shows gate when eligible | UI dismissible; **anon turns still blocked** after value (OD-1) |
| SAVE_GATE_SHOWN → AUTH_IN_PROGRESS | Signup/Login click | Yes |
| AUTH_IN_PROGRESS → CLAIMED | Successful auth + claim API | No |
| CLAIMED → AC_ACTIVE_AUTH | Auto | — |
| AC_ACTIVE_AUTH → FORGE_READY | `evaluateForgeReadiness.ready` | Soft (more evidence) |
| FORGE_READY → FORGE_ACTIVE | User starts practice | Session |

### C.3 Client vs server

| Concern | Owner |
|---|---|
| Anonymous session id cookie (`tf_ac_anon`) | Server-set HttpOnly Secure |
| Session row, messages, provisional LP | Server DB |
| `hasExperiencedValue`, readiness | Server (derived; cache on session) |
| Gate UI visibility | Client, driven by server flags |
| Claim | Server RPC (idempotent) |

### C.4 Data at each stage

| Stage | Data present |
|---|---|
| ANON_* | `assistant_coach_sessions`, messages, provisional `living_profiles_anon` or session-scoped LP blob, evidence, insights |
| CLAIMED+ | Same rows re-keyed / copied to `user_id`; member `living_profiles` |

---

## D. Proposed data architecture

### D.1 Recommendation summary

| Store | Shape | Why |
|---|---|---|
| `assistant_coach_sessions` | Normalized table | Query, TTL, claim, analytics |
| `assistant_coach_messages` | Normalized table | History continuity, audit |
| `living_profiles` | Existing + **JSONB** `evidence_ledger`, `profile_insights` | Matches TS model; versioned with LP; not a third identity store |
| Anonymous binding | `anon_key` (hashed) on session; optional `living_profiles_drafts` | Avoid orphan LP rows on `profiles` FK |

### D.2 Why JSONB on `living_profiles` (for ledger/insights)

- System 1 already models them as arrays on `LivingProfile`.
- Coach context builders load whole profile; no need for cross-row joins early.
- Provenance already JSONB.
- **Tradeoff:** analytics on evidence categories harder — mitigate with session-level counters / later extract tables if needed.
- **Do not** put insights back into evidence (OWN / System 1 law).

### D.3 Conceptual tables

**`assistant_coach_sessions`**

| Column | Notes |
|---|---|
| `id` uuid PK | |
| `anon_key_hash` text null | Hash of cookie secret; unique while unclaimed |
| `user_id` uuid null FK profiles | Set on claim |
| `status` text | active \| gated \| claimed \| expired \| handed_off |
| `turn_count` int | |
| `evidence_captured` int | |
| `has_experienced_value` bool | Server sticky |
| `forge_ready` bool | Cached from evaluateForgeReadiness |
| `expires_at` timestamptz | Anon TTL (e.g. 7–14 days) |
| `claimed_at` timestamptz null | |
| `version` bigint | Claim concurrency |
| `created_at` / `updated_at` | |

**`assistant_coach_messages`**

| Column | Notes |
|---|---|
| `id`, `session_id` FK | |
| `role` | user \| assistant |
| `text` | |
| `turn_index` | |
| `created_at` | |

**`living_profiles` additions**

| Column | Notes |
|---|---|
| `evidence_ledger` jsonb not null default `[]` | |
| `profile_insights` jsonb not null default `[]` | |

**Anonymous draft profile (preferred over FK violation)**

**`assistant_coach_profile_drafts`**

| Column | Notes |
|---|---|
| `session_id` PK/FK | 1:1 with session |
| `profile_json` jsonb | Full `LivingProfile`-shaped draft (`userId` temporary) |
| `version` | |

On claim: merge draft → member `living_profiles` (see F).

### D.4 RLS sketch

- Anon: access only via service role after cookie HMAC verify (browser never gets service key). Prefer **server routes only** — no direct anon Supabase client to these tables.
- Auth: `user_id = auth.uid()` on claimed sessions and LP.

---

## E. Value / gate eligibility algorithm

### E.1 Principle

LLM does **not** decide commercial UI. Server computes `hasExperiencedValue` from validated System 1 state + turn metadata.

### E.2 Deterministic rule (v1.1 — intervention-backed value)

```
discoveryReady =
  substantiveUserTurns >= 2
  AND (
    // Path V1 — understanding demonstrated (discovery)
    (hasGroundedGoalOrOutcome AND hasGroundedContextOrFriction)
    OR
    // Path V2 — supported insight exists (discovery)
    (count(profileInsights where status in {supported, tentative}
          and kind in {root_pattern, focus_area, key_environment}) >= 1
     AND evidenceLedger fact-categories >= 2)
  )
  AND NOT onlyVagueAspiration

hasExperiencedValue =
  discoveryReady
  AND hasValidatedActionableIntervention  // session-scoped; sticky once true
```

**Discovery vs value:** Evidence/insights may accumulate as soon as the Coach understands the struggle. That alone is **not** experienced coaching value. Conversion requires at least one **validated actionable intervention** delivered by Coach (exercise, rehearsal, technique, strategy, usable wording/opener, pacing mechanism, or similar), represented as structured model JSON and checked server-side — **not** free-form reply prose.

Intervention acceptance (deterministic):

- `kind` ∈ {exercise, rehearsal, technique, strategy, wording, pacing, other}
- `summary` length ≥ 24
- `groundedInCategories` intersects grounded fact categories already on the evidence ledger
- Reflection, summary, validation, or a follow-up question **without** a valid `intervention` object does **not** flip value

Definitions:

- **Grounded** = `ProfileEvidenceRecord` with category ≠ `interaction_signal`, confidence ≠ only uncertain, text length ≥ 8, passed validation.
- **Goal/outcome** = `communication_goal` | `desired_outcome` that is **not** vague aspiration (`isVagueAspirationOnly`).
- **Context/friction** = `communication_context` | `communication_friction` | `lived_example` | `observed_pattern`.
- **onlyVagueAspiration** = ledger facts empty except low-confidence vague goals.
- Interventions are **Coach deliverables**; they must not enter `evidence_ledger` as member identity/evidence.

### E.3 Floors, conversion, and safety/economic limit

| Guard | Rule |
|---|---|
| Earliest conversion eligibility | Never before turn 2 substantive user messages (still must pass §E.2) |
| **Conversion gate** | **Semantic only:** sticky `hasExperiencedValue` (§E.2). Turn count does **not** decide conversion. |
| Hard block anon (OD-1) | Once `hasExperiencedValue` is true → further anonymous turns require auth/claim. No soft continue-forever. |
| Safety/economic limit | Configurable anon turn cap (default **10**). Stops/throttles unpaid abuse. **Not** the conversion gate — some users may need fewer or more turns before semantic value. |
| Cap vs value | Cap alone may block further anon turns for economics; it must **not** be treated as “experienced value” for analytics/conversion. |

### E.4 Explicit non-triggers

- Message count alone
- Discovery / understanding alone (goal+friction without an intervention)
- LLM saying “ready to signup”
- Free-form reply prose without a validated structured `intervention`
- Reflection, summary, validation, or follow-up question alone
- Forge readiness (later; stronger bar)
- Interaction signals (“I don’t know”)
- Living Profile “completeness” (not a conversion concept)

---

## F. Account claim algorithm

### F.1 Happy path (signup)

1. Client holds `tf_ac_anon` cookie; completes signup/login.
2. `POST /api/assistant-coach/claim` (auth required) with no body (cookie identifies anon).
3. Server (transaction):
   - Lock session by `anon_key_hash` where `user_id IS NULL` and not expired.
   - If already `user_id = auth.uid()` → idempotent success (return session).
   - If `user_id` other → 409 conflict.
   - Ensure member `living_profiles` exists.
   - **Merge** draft profile → member LP (F.2).
   - Set `sessions.user_id`, `claimed_at`, clear anon association (rotate cookie to authenticated session id).
   - Return session + profile + resume cursor.

### F.2 Merge rules (never silent overwrite)

| Field | Rule |
|---|---|
| `purposeStatement` | Keep member if non-empty; else leave empty (AC must not invent purpose). Draft purpose ignored if any. |
| `goals` / `challenges` / `strengths` | Union unique strings; prefer longer/more specific; cap N |
| `evidence_ledger` | Concatenate; dedupe by `(category, normalized text)`; preserve timestamps |
| `profile_insights` | Re-run `deriveProfileInsights` on merged ledger (source of truth), do not blindly concat competing claims |
| `provenance` | Preserve member provenance; append claim event `anon_session_claimed` |
| `personalPrinciples` / `seasons` | Member wins entirely |
| `coachingIntensity` / style | Member if set; else draft |
| Assessment `profile_source` | Do not downgrade `assessment` → draft; if member already `assessment`, keep and still append evidence |

### F.3 Existing user logs in (already has LP)

Same merge. If member already Forge-active with rich LP:

- Append anon evidence as **additional** observations.
- Recompute insights with competition/uncertainty preserved.
- Surface UI: “We added what you just shared to your Living Profile.”

### F.4 Idempotency / races

- Claim keyed by `(anon_key_hash)` unique partial index where unclaimed.
- Second claim same user: 200 idempotent.
- Claim after expiry: 410; offer restart (OD-2).
- Double-submit: transaction + version check.

### F.5 What user must not experience

- Blank new AC thread
- Re-asking known goals/contexts (prompt uses `buildAssistantCoachContext`)
- Second empty Living Profile row

---

## G. Failure / recovery matrix

| Failure | User experience | Server | Integrity |
|---|---|---|---|
| Refresh mid-AC | Resume same thread | Load session by cookie | Intact |
| Tab close / reopen within TTL | Resume | Cookie | Intact |
| Cookie cleared | “Session lost — start again” | Cannot claim orphan without key | Orphan expires via TTL job |
| Network blip on turn | Retry turn; show last good reply | Idempotent turn_id | No double evidence if turn_id deduped |
| Model timeout | Soft apology + retry | No apply | Profile unchanged |
| Malformed model JSON | Safe fail (Phase 3 behavior) | No apply | Unchanged |
| Persist failure after model ok | “Saved locally — retry save”; do not advance gate on false value | Compensating retry | Prefer fail-closed on value flag |
| Signup failure | Stay on gate with errors | No claim | Anon intact |
| Email already registered | Prompt login; preserve anon cookie | — | Claim on login |
| Login failure | Retry | — | Anon intact |
| Anon expired at claim | Explain expiry; restart AC signed-in | 410 | No merge |
| Claim OK, client misses response | Next `/coach` loads claimed session by user | Idempotent claim | OK |
| Other device sign-in | No anon cookie there; sees auth LP only | — | Anon may remain until TTL unless user claims from original device |
| Duplicate anon claim attempt | 409 or idempotent | Reject other user | OK |

---

## H. Privacy / security considerations

1. **Pre-auth PII:** Conversations may include workplace details before account — minimize retention (TTL 7–14d), HTTPS-only cookies, no third-party transcript analytics.
2. **Authorization:** All AC reads/writes via server routes; cookie HMAC / signed anon secret; never expose `evidence_ledger` internals beyond what’s needed for UI transcript.
3. **Cross-user:** Claim refuses if session owned; RLS + service-role discipline.
4. **Deletion:** “Delete my trial data” endpoint; auth account deletion cascades sessions.
5. **Abandoned cleanup:** Cron expire `expires_at`, delete messages + drafts.
6. **Children / sensitive:** Reuse existing ToS; no special AC exception.
7. **HARDEN-005:** Do not revive `guest_*` cloud identities; use first-class anon session keys instead.

---

## I. Analytics event specification

Extend GA4 with `event_category: "assistant_coach" | "conversion"`. **Never send message text, evidence quotes, or purpose.**

| Event | When | Properties (non-PII) |
|---|---|---|
| `landing_viewed` | Landing paint | `cta_variant` |
| `assistant_coach_cta_clicked` | Primary CTA | `from` |
| `anonymous_coach_started` | Session minted | `session_id_hash` |
| `assistant_coach_turn_completed` | Turn OK | `turn_index`, `accepted_obs`, `rejected_obs`, `difficulty` |
| `assistant_coach_value_reached` | Flag flips true | `turn_index`, `path` (v1/v2) |
| `account_gate_shown` | Gate render | `turn_index` |
| `account_gate_auth_required` | Anon turn blocked post-value/cap | `turn_index`, `reason` (`value` \| `turn_cap`) |
| `signup_started` / `signup_completed` | Existing + link `session_id_hash` | reuse auth_* |
| `login_completed` | Existing + claim intent | |
| `anonymous_session_claimed` | Claim OK | `merged_evidence_count`, `had_existing_lp` |
| `assistant_coach_resumed` | Post-claim first turn | |
| `forge_ready` | Readiness true | |
| `forge_handoff_started` | User clicks continue to Forge | |
| `forge_started` | Practice session begins | `mode` |

Funnel:  
`landing_viewed → cta → started → value_reached → gate_shown → signup/login → claimed → resumed → forge_ready → forge_started`

---

## J. Phase 4B implementation plan (reviewable steps)

> **Authorized** by Decision 059. Exact slice order, security checklist, and DAG: **[PHASE4B-AC-IMPLEMENTATION-SEQUENCE](PHASE4B-AC-IMPLEMENTATION-SEQUENCE.md)**.

Summary (do not implement as one PR):

| Step | Scope |
|---|---|
| **4B.0** | Decision 059 + this OD resolution + sequence doc |
| **4B.1** | LP `evidence_ledger` / `profile_insights` JSONB (+ OD-9 migration-path note) |
| **4B.2** | Anon session / messages / drafts tables + 14d TTL |
| **4B.3** | Signed HttpOnly cookie + session mint (no guests) |
| **4B.4** | `POST /api/assistant-coach/turn` |
| **4B.5** | Semantic `hasExperiencedValue` + configurable turn safety cap |
| **4B.6** | Hard gate anon after value/cap |
| **4B.7** | Claim + merge |
| **4B.8** | Soft verify carve-out for `/coach` |
| **4B.9** | Skip redundant onboarding |
| **4B.10–13** | `/coach` UI · landing primary CTA · demote Assessment FTUE · proxy allowlist |
| **4B.14–15** | Analytics · expiry purge |
| **4B.16** | Forge read-only handoff (later, separate) |

Do **not** in early 4B: delete Assessment, finalize gate copy, change VoiceArena VAD, expand billing, resurrect guests.

---

## K. Founder decisions (OD-0…OD-10) — **DECIDED**

Authority: **Decision 059** (2026-08-16).

| ID | Decision | Binding answer |
|---|---|---|
| **OD-0** | Feature NO-GO vs this track | **GO** for this AC first-user architecture only; supersedes old NO-GO for this track. Unrelated features + held identity PRs remain NO-GO. |
| **OD-1** | Anon continue after value | **Hard gate after meaningful value** (not immediate). Indefinite anon continue forbidden. |
| **OD-2** | Anon TTL | **14 days** |
| **OD-3** | Anon identity | **Signed HttpOnly cookie + server session.** Do not resurrect retired guest architecture. |
| **OD-4** | Forge without claim | **Never.** Anon = Assistant Coach only. |
| **OD-5** | Landing CTA | **AC primary.** No two equal competing onboarding CTAs. Assessment accessible elsewhere during transition. |
| **OD-6** | Assessment FTUE | **Do not delete.** Remove as default FTUE; keep until AC proven in production. |
| **OD-7** | Onboarding after claim | **Skip redundant** questions AC already learned; collect only missing account-required info. |
| **OD-8** | Email verification | Prefer **soft verify** for continuity unless later Decision proves absolute need for verify-first. |
| **OD-9** | Evidence storage | Initial **JSONB** ledger + insights OK if System 1 sole writer; design migration path to normalized evidence. |
| **OD-10** | Gate copy | **Do not finalize** in architecture PRs; product/UI later. |

**Turn cap clarification (Founder):** Ten turns = **configurable safety/economic limit**, not the conversion gate. Conversion remains semantic (`hasExperiencedValue`).

---

## Conflicts with existing architecture (explicit)

| Conflict | Resolution |
|---|---|
| Account-first proxy vs pre-auth `/coach` | Allowlist public AC routes (4B.13). |
| HARDEN-005 guest retirement vs anonymous trial | **New** anon cookie+server session only — never `guest_*`. |
| Assessment-as-discovery vs AC-as-discovery | AC primary; Assessment demoted, kept (OD-5/6). |
| Practice readiness vs AC drafts | Forge still requires claimed LP + readiness (OD-4). |
| Feature NO-GO vs AC journey | **Superseded for this track** by Decision 059 / OD-0. |
| OWN-001 | AC writes evidence/insights only; never identity/purpose authority. |
| Library-only AC | 4B adds API/UI without changing Core intelligence path. |
| Hard `email_verified` redirect to `/verify-email` | Carve soft path for `/coach` + AC APIs (OD-8); `/app` may stay hard until separate Decision. |

---

## Architectural invariant (binding for 4B+)

> Assistant Coach does not belong to authentication.  
> Authentication attaches ownership to an Assistant Coach session.  
> Anonymous and authenticated users share the same intelligence/runtime.  
> Auth changes identity, ownership, and persistence guarantees — not coaching brain.

Responsibility split remains:

| Plane | Owner |
|---|---|
| Conversation + candidates | LLM / AC runtime |
| Evidence acceptance | Validation |
| Truth/memory | System 1 |
| Accumulated understanding | Living Profile |
| Onboarding understanding | Assistant Coach |
| Coaching | Forge |
| Identity | Authentication / member |

---

## Stop (Phase 4A)

Phase 4A design is complete; open decisions are closed. **Implement only via Phase 4B slices** in [PHASE4B-AC-IMPLEMENTATION-SEQUENCE](PHASE4B-AC-IMPLEMENTATION-SEQUENCE.md). Next code PR = **4B.1** (LP JSONB), not a monolith.
