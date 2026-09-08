# Coach cards and signed preview session

## Card catalog

`/coach` renders the independent `COACH_TOPICS` catalog with the shared
`TopicCard` visual component. Selecting a card routes immediately to
`/forge?topic=<id>` for one anonymous private Forge preview.

The Living Profile training-focus catalog remains independently owned.

## Signed session substrate

| Item | Value |
|---|---|
| Cookie name | `tf_ac_anon` |
| Cookie value | `v1.<opaqueSecret>.<hmac>` (HMAC-SHA256, timing-safe verify) |
| DB binding | `sha256(opaqueSecret)` hex → `assistant_coach_sessions.anon_key_hash` |
| Attributes | HttpOnly · Secure (prod) · SameSite=Lax · Path=/ · Max-Age = remaining TTL |
| Bootstrap | `POST /api/forge/preview` |
| Mint key | Required when the cookie is missing/invalid: `Idempotency-Key` |
| Env | `ASSISTANT_COACH_ANON_COOKIE_SECRET` (server-only, ≥32 chars; fail closed if missing) |

The server-only repository, row mappers, Supabase adapter, cookie signer, and
session service are shared by preview bootstrap, Realtime authorization,
transcript persistence, completion, and `/api/forge/preview/claim`.

Historical `gated` rows remain readable because the deployed unique index treats
them as active. Here `gated` is only a persistence compatibility status: preview
bootstrap safely heals an unclaimed, unexpired row to `active`. It carries no
semantic value, authentication, conversion, or UI behavior.

The substrate stores preview lifecycle state and the source-filtered Forge
transcript only. It does not write member identity.
