# PHASE4B-AC-IMPLEMENTATION-SEQUENCE — Migration / API / Security slices

| Field | Value |
|---|---|
| **Document ID** | PHASE4B-AC-001 |
| **Status** | Authoritative sequence under Decision 059 |
| **Authority** | [Decision 059](../../atlas/decisions.md) · [AC-JOURNEY-001](AC-JOURNEY-001-first-user-architecture.md) · [IV-PROD-009](../knowledge/working/idea-vault/product-ideas/IV-PROD-009-first-user-assistant-coach-journey.md) |
| **Law** | Ship **one slice per PR**. No monster change. Do not revive `guest_*` cloud identity. |
| **Created** | 2026-08-16 |

---

## Binding constraints (every slice)

| Constraint | Source |
|---|---|
| GO for this track only; unrelated features + held identity PRs remain NO-GO | Decision 059 / OD-0 |
| Hard gate after semantic value; indefinite anon continue forbidden | OD-1 |
| 14-day anon TTL | OD-2 |
| Signed HttpOnly cookie + server anon session | OD-3 |
| Forge requires claim/account | OD-4 |
| AC = primary landing CTA; Assessment not equal competitor | OD-5 |
| Assessment kept, demoted from default FTUE | OD-6 |
| Skip redundant onboarding after claim | OD-7 |
| Soft email verify for AC continuity | OD-8 |
| JSONB evidence/insights; System 1 sole writer; migration path designed | OD-9 |
| Gate copy placeholder only — no final marketing copy | OD-10 |
| Turn safety cap configurable; conversion = `hasExperiencedValue` | Decision 059 |
| OWN-001: never write identity/purpose as identity authority | OWN-001 |
| Do not modify Forge coaching brain / Assessment lifecycle / VoiceArena VAD unless a later slice explicitly requires handoff wiring | Phase 1–3 non-goals |

---

## Prerequisite

| ID | Deliverable | Done when |
|---|---|---|
| **4B.0** | Decision 059 + this sequence + AC-JOURNEY-001 OD resolution | Merged governance PR |

---

## Exact implementation sequence

### Slice 4B.1 — Living Profile JSONB columns (System 1 persistence)

**Goal:** Persist Phase 1 `evidenceLedger` / `profileInsights` for authenticated LPs.

| Item | Spec |
|---|---|
| Migration | `supabase/migrations/YYYYMMDD_living_profile_evidence_insights.sql` |
| Columns | `living_profiles.evidence_ledger jsonb not null default '[]'::jsonb` · `living_profiles.profile_insights jsonb not null default '[]'::jsonb` |
| Manifest | Append to `supabase/migrations/manifest.json` (SSOT) |
| Code | `mapLivingProfileRow` / write paths load+save arrays; System 1 remains sole writer |
| Migration path (OD-9) | Comment in migration + short note in `AC-JOURNEY-001` / this doc §“Future normalized evidence”: extract to `profile_evidence` / `profile_insights` tables later without changing System 1 API surface |
| Tests | Round-trip map; System 1 unit tests unchanged behavior |
| Non-goals | Anon sessions, APIs, UI, Assessment |

**PR title pattern:** `4B.1: LP evidence_ledger + profile_insights JSONB`

---

### Slice 4B.2 — Anonymous session schema + TTL

**Goal:** Server-side anonymous Coach session storage (no cookie mint yet).

| Item | Spec |
|---|---|
| Tables | `assistant_coach_sessions` · `assistant_coach_messages` · `assistant_coach_profile_drafts` (names may match AC-JOURNEY-001 §D) |
| Session fields (min) | `id`, `anon_key_hash`, `user_id` nullable, `status`, `turn_count`, `has_experienced_value`, `expires_at` (now+14d), `claimed_at`, `created_at`, `updated_at`, draft LP jsonb or FK to drafts |
| Messages | `session_id`, `turn_index`, `role`, `content`, `model_meta` jsonb, `created_at` |
| Drafts | Provisional LP blob; **not** `living_profiles.user_id` until claim |
| Indexes | `expires_at`, `anon_key_hash` unique for active, `user_id` |
| RLS | Service-role / server-only writes preferred for anon; no client direct table access |
| Tests | Migration file + in-memory repository unit tests (`lib/assistant-coach/session-repository.test.mjs`) |
| Status | **Implemented locally** on `cursor/ac-4b2-anon-session-schema-ecce` (not production-applied) |
| Non-goals | HTTP routes, cookies, UI |

**PR:** `4B.2: Assistant Coach anon session tables + 14d TTL`

---

### Slice 4B.3 — Signed cookie + session mint (security substrate)

**Goal:** OD-3 identity plane without guests.

| Item | Spec |
|---|---|
| Cookie | HttpOnly · Secure · SameSite=Lax (or Strict if compatible) · path `/` · name e.g. `tf_ac_anon` |
| Payload | Opaque session id **or** signed token binding `session_id` + expiry; **server stores session truth** |
| Secret | Env `ASSISTANT_COACH_ANON_COOKIE_SECRET` (or shared signing secret); rotate-friendly |
| Mint | `GET/POST /api/assistant-coach/session` (or mint on first turn) creates row + sets cookie |
| Lookup | Hash/compare cookie → session; reject expired (`status=expired` or `expires_at < now`) |
| Explicit ban | No `signInAnonymously`, no `guest_*` profiles, no cloud guest reassignment |
| Tests | Mint → read → reject tampered/expired; no guest path imports |
| Status | **Implemented** — opaque signed cookie `v1.<secret>.<hmac>`, SHA-256 `anon_key_hash`, Supabase service-role adapter, `GET\|POST /api/assistant-coach/session`. Mint adopts only on typed unique-conflict; draft failure rolls back session and never returns 200. |
| Non-goals | LLM turns, gate UI |

**PR:** `4B.3: Signed HttpOnly anon Coach cookie + session mint`

---

### Slice 4B.4 — Turn API (identity-agnostic runtime)

**Goal:** Wire Phase 3 `runAssistantCoachTurn` to HTTP.

| Item | Spec |
|---|---|
| Route | `POST /api/assistant-coach/turn` |
| Auth | Optional: anon cookie **or** authenticated member |
| Body | `{ message, clientTurnId? }` |
| Server | Load session draft/LP → runtime → validate observations → System 1 apply → persist messages + draft → return `{ reply, session, gate }` |
| Idempotency | Dedup on `clientTurnId` / turn index |
| Rate limit | Per session + IP (reuse shared limiter when available) |
| Tests | Integration with injected model; evidence accepted/rejected; no identity writes |
| Status | **Implemented** — `runAssistantCoachTurn` + `POST /api/assistant-coach/turn` (injectable model; OWN-001; idempotent `clientTurnId`; gate flags only) |
| Non-goals | Hard gate enforcement beyond returning flags; landing CTA; Forge |

**PR:** `4B.4: Assistant Coach turn API`

---

### Slice 4B.5 — Semantic value flag + configurable turn safety cap

**Goal:** Separate conversion from economics.

| Item | Spec |
|---|---|
| Conversion | Server computes sticky `hasExperiencedValue` per AC-JOURNEY-001 §E (deterministic) |
| Safety/economic cap | Env/config e.g. `ASSISTANT_COACH_ANON_TURN_CAP` default **10** — **not** conversion |
| Gate payload | `{ hasExperiencedValue, anonTurnCount, turnCap, mustAuthenticateToContinue, copyKey: "placeholder" }` — **no finalized marketing copy (OD-10)** |
| Tests | Matrix: value true before/after cap; cap alone does not set value; value alone can require auth even if under cap |
| Status | **Implemented** — sticky `hasExperiencedValue` (AC-JOURNEY §E.2) + `ASSISTANT_COACH_ANON_TURN_CAP` (default 10); gate flags updated; no hard block |
| Non-goals | UI modal copy polish |

**PR:** `4B.5: Semantic value gate + configurable anon turn cap`

---

### Slice 4B.6 — Hard gate after meaningful value (OD-1)

**Goal:** Anonymous users cannot continue indefinitely once value (or turn safety cap) requires auth.

| Item | Spec |
|---|---|
| Rule | If `hasExperiencedValue` **or** `turn_count >= turnCap` → further anon turns return **401/403** with `mustAuthenticateToContinue: true` (no new model spend) |
| Before value & under cap | Anon turns allowed |
| Status | Session may move to `gated` |
| Tests | Anon blocked after value; auth user still can turn; under-cap pre-value OK |
| Status | **Implemented** — anon turns return 403 `must_authenticate` after value/cap (before model); session → `gated`; idempotent replay still allowed |
| Non-goals | Signup UI redesign |

**PR:** `4B.6: Hard gate anon continuation after value/cap`

---

### Slice 4B.7 — Claim API + merge (OD-4 continuity)

**Goal:** Attach anon session to authenticated user atomically.

| Item | Spec |
|---|---|
| Route | `POST /api/assistant-coach/claim` (requires Supabase session) |
| Steps | Validate cookie session active → lock → merge draft evidence/insights into member LP via System 1 writers → set `user_id`, `status=claimed`, clear/rotate anon cookie → idempotent if already claimed by same user |
| Conflicts | If session claimed by another user → 409; if member already has richer LP → merge rules in AC-JOURNEY-001 (prefer append evidence; never overwrite member purpose/identity) |
| Forge | Still forbidden until claimed + practice readiness |
| Tests | Merge matrix; double-claim idempotent; cross-user claim rejected; OWN-001: purpose untouched |
| Non-goals | Full onboarding redesign |

**PR:** `4B.7: Claim anonymous Coach session → member LP`

---

### Slice 4B.8 — Soft email verification carve-out (OD-8)

**Goal:** Do not interrupt value → account → Coach continuation.

| Item | Spec |
|---|---|
| Proxy / auth | Allow `/coach` and AC APIs to proceed when `email_verified = false` after claim |
| Keep | Existing hard verify redirect for `/app` (Forge) **may remain** until a separate security Decision softens it |
| UX | Optional soft remind banner on `/coach` (placeholder copy) |
| Tests | Unverified user: claim + `/coach` turn OK; `/app` still redirected if current proxy requires verify |
| Non-goals | Removing all verify gates site-wide |

**PR:** `4B.8: Soft verify for Coach continuity`

---

### Slice 4B.9 — Skip redundant onboarding after claim (OD-7)

**Goal:** Only collect missing account-required fields.

| Item | Spec |
|---|---|
| Logic | If claim brought grounded focus/goal/context, skip communication-focus onboarding step |
| Required | Still collect fields the account product **requires** (e.g. display name if mandatory) — never re-ask AC-learned coaching content |
| Tests | Claimed-with-evidence skips focus; empty claim still shows focus |
| Non-goals | Redesigning entire onboarding brand |

**PR:** `4B.9: Skip redundant onboarding after AC claim`

---

### Slice 4B.10 — Public `/coach` UI (minimal)

**Goal:** Product surface for anon + authed Coach.

| Item | Spec |
|---|---|
| Route | `/coach` (App Router) — **outside** `/app` so proxy does not force signup before first value |
| UI | Minimal thread + input; gate modal uses **placeholder** keys only (OD-10) |
| Dual ship | Craft Law #001 + DES-001 |
| Tests | Playwright smoke: load → send (mocked API) → gate flag renders |
| Non-goals | Luxury polish pass; Assessment deletion |

**PR:** `4B.10: Public /coach UI shell`

---

### Slice 4B.11 — Landing primary CTA (OD-5)

**Goal:** One primary onboarding CTA.

| Item | Spec |
|---|---|
| Landing | Primary CTA → `/coach` (or mint+redirect) |
| Secondary | Sign in / Founding Pass as secondary — **not** equal weight Assessment CTA |
| Assessment | Link elsewhere (footer / Explorer) during transition |
| Tests | Landing snapshot / e2e CTA href |
| Non-goals | Final marketing headline (can keep interim product copy) |

**PR:** `4B.11: Landing primary CTA → Assistant Coach`

---

### Slice 4B.12 — Demote Assessment default FTUE (OD-6)

**Goal:** Assessment remains; not the default first experience.

| Item | Spec |
|---|---|
| Explorer / home | Do not auto-push Assessment as FTUE when AC available |
| Keep | Assessment routes + APIs intact |
| Tests | New-user path prefers Coach; Assessment still reachable |
| Non-goals | Delete Assessment code |

**PR:** `4B.12: Demote Assessment from default FTUE`

---

### Slice 4B.13 — Proxy / route allowlist hardening

**Goal:** Encode public Coach vs private Forge in middleware.

| Item | Spec |
|---|---|
| Public | `/coach`, `/api/assistant-coach/session`, `/api/assistant-coach/turn` (anon OK) |
| Auth required | `/api/assistant-coach/claim`, `/app/*`, practice APIs |
| Checks | Update `auth:check` / practice-readiness scripts if they assume all coach paths under `/app` |
| Tests | Unauth `/coach` 200; unauth `/app/practice` → signup/login; unauth claim → 401 |
| Non-goals | New identity products |

**PR:** `4B.13: Proxy allowlist for public Coach`

> **Note:** 4B.10 and 4B.13 may be ordered as 4B.13 immediately before or with 4B.10 if UI cannot ship without allowlist. Prefer allowlist **before** or **in the same PR as** first public UI.

---

### Slice 4B.14 — Analytics funnel (no PII/transcripts)

**Goal:** Measure conversion without logging Coach text.

| Events | `assistant_coach_started`, `turn_completed` (counts only), `value_reached`, `account_gate_shown`, `signup_from_gate`, `login_from_gate`, `session_claimed`, `resumed`, `forge_ready`, `forge_started` |
|---|---|
| Ban | Transcript body, raw evidence text |
| Tests | Event name allowlist unit test |

**PR:** `4B.14: Assistant Coach funnel analytics`

---

### Slice 4B.15 — Expiry job + deletion

**Goal:** Enforce 14-day TTL operationally.

| Item | Spec |
|---|---|
| Job | Mark expired; delete messages/drafts for unclaimed expired sessions |
| Claim after expiry | 410 + restart path |
| Tests | Clock-skew unit; delete cascade |

**PR:** `4B.15: Anon Coach session expiry + purge`

---

### Slice 4B.16 — Forge handoff read-only (separate, later)

**Goal:** Authenticated Forge receives handoff context; still no identity writes from Forge.

| Item | Spec |
|---|---|
| Input | `buildForgeHandoffContext` → coach prompt injection **read-only** |
| Gate | Claimed user + practice readiness + entitlement |
| Non-goals | Changing Forge Core judgment / Arena VAD |
| PR | Explicitly labeled Forge-touching; review OWN-001 |

**PR:** `4B.16: Forge read-only AC handoff context`

---

## Recommended merge order (dependency DAG)

```
4B.0 (done in governance PR)
  → 4B.1 (LP JSONB)
  → 4B.2 (session tables)
  → 4B.3 (cookie mint)
  → 4B.4 (turn API)
  → 4B.5 (semantic value + turn cap)
  → 4B.6 (hard gate)
  → 4B.7 (claim)
  → 4B.8 (soft verify)
  → 4B.9 (onboarding skip)
  → 4B.13 (proxy allowlist) ⇄ 4B.10 (UI)
  → 4B.11 (landing CTA)
  → 4B.12 (demote Assessment FTUE)
  → 4B.14 (analytics)
  → 4B.15 (expiry job)
  → 4B.16 (Forge handoff)   # after AC stable in prod
```

Parallelism allowed only where noted (e.g. analytics after turn API exists; expiry after 4B.2).

---

## Security checklist (cross-cutting)

- [ ] Cookie: HttpOnly, Secure, SameSite, short-lived binding, server session SSOT
- [ ] No guest architecture resurrection (`guest-migration:check` still green)
- [ ] Anon cannot call Forge / practice APIs
- [ ] Claim requires authenticated Supabase user; CSRF/origin checks for mutating cookie routes
- [ ] Rate limit anon mint + turn
- [ ] Do not log transcripts in analytics
- [ ] Soft verify only carves `/coach` + AC APIs — document residual `/app` verify hard gate
- [ ] System 1 sole writer for evidence/insights (no client JSONB poke)

---

## Future normalized evidence (OD-9 migration path)

When querying/auditing requires it:

1. Add `profile_evidence` / `profile_insight_rows` tables (or equivalent) with `user_id`, category, text, confidence, source_session_id, created_at.
2. Dual-write from System 1 writers behind a feature flag.
3. Backfill from `evidence_ledger` / `profile_insights` JSONB.
4. Flip reads to SQL; keep System 1 as the only mutation API.
5. Deprecate JSONB columns after verification.

Do **not** start this until product/audit need is real.

---

## Explicit non-goals for Phase 4B

- Canonical admission of AC journey doctrine (Working Knowledge + Decision 059 authorization only)
- Deleting Assessment
- Final gate marketing copy
- Resurrecting guests
- Unrelated feature expansion
- Merging held identity PRs under FREEZE-001
- One mega-PR implementing 4B.1–4B.16 together

---

## Change log

| Version | Date | Change |
|---|---|---|
| 1.0.0 | 2026-08-16 | Initial sequence under Decision 059 |
