# Assistant Coach — session persistence (Phase 4B.2+)

| Slice | Status |
|---|---|
| **4B.2** | Session / messages / profile_drafts schema + in-memory repository |
| **4B.3** | Signed HttpOnly anon cookie + server session mint/restore |
| 4B.4+ | Turn API, UI, claim — **not in this package yet** |

## 4B.2 rules

1. Tables are **service_role / server-only** (RLS on; no anon/authenticated policies).
2. Anonymous TTL default is **14 days** (`ASSISTANT_COACH_ANON_TTL_DAYS`).
3. Draft profiles live in `assistant_coach_profile_drafts`, **not** `living_profiles`, until claim.
4. Do not resurrect `guest_*` cloud identity.
5. System 1 remains the intelligence writer for evidence/insights inside draft JSON.

## 4B.3 — anon identity

| Item | Value |
|---|---|
| Cookie name | `tf_ac_anon` |
| Cookie value | `v1.<opaqueSecret>.<hmac>` (HMAC-SHA256, timing-safe verify) |
| DB binding | `sha256(opaqueSecret)` hex → `assistant_coach_sessions.anon_key_hash` |
| Attributes | HttpOnly · Secure (prod) · SameSite=Lax · Path=/ · Max-Age = remaining TTL |
| Route | `GET|POST /api/assistant-coach/session` |
| Mint key | Required when cookie missing/invalid: `Idempotency-Key` (43–128 URL-safe chars) |
| Env | `ASSISTANT_COACH_ANON_COOKIE_SECRET` (server-only, ≥32 chars; fail closed if missing) |

### Restore algorithm

1. Read `tf_ac_anon` server-side.
2. Verify HMAC; malformed/tampered → mint fresh (no auth redirect).
3. Hash opaque secret; lookup **active/gated + `user_id IS NULL`** by `anon_key_hash`.
4. Reject expired (`expires_at` / `status=expired`) — mark expired, mint fresh (no resurrection).
5. Reject claimed / member-linked — mint fresh anonymous session.
6. Otherwise restore same session and re-seal cookie.

### Concurrency

- Cookieless mint **requires** `Idempotency-Key` (or `X-AC-Mint-Key`): 43–128 URL-safe chars (≈256-bit).
- That key **is** the raw anon secret → `anon_key_hash = sha256(key)`.
- Concurrent/repeated mints with the same key collapse to one active row via the unique partial index (and a pre-insert lookup).
- Only `AssistantCoachUniqueConflictError` (Postgres `23505` on the active anon hash) may adopt the winning session; unrelated persistence failures must propagate.
- Adopt/restore also requires the paired `assistant_coach_profile_drafts` row. Session-without-draft is never treated as a successful mint.
- On draft insert failure after session insert, the adapter deletes the session row (best-effort) and throws.
- Distinct keys still create distinct sessions (different visitors / intentional new mints).
- Valid cookie restore does not require a mint key.

### Non-goals (still)

Turn/model API, LLM, `/coach` UI, claim, landing CTA, value gate, Forge handoff.
