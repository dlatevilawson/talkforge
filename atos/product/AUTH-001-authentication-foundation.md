# AUTH-001 — TalkForge Production Authentication Foundation

| Field | Value |
|---|---|
| **Document ID** | AUTH-001 |
| **Version** | 1.0.0 |
| **Status** | Implemented |
| **Date** | 2026-07-29 |
| **Branch** | `cursor/auth-production-98b4` |

---

## Scope

Authentication is a core platform service responsible only for:

1. **Identity** — who the user is (`auth.users` + `profiles`)
2. **Authentication** — email/password sign-in (extensible providers)
3. **Authorization** — role-driven permissions
4. **Session management** — secure HTTP-only cookies via `@supabase/ssr`

Business logic stays outside this layer.

---

## Stack

- Next.js App Router 16 (`proxy.ts` for session refresh + route gates)
- TypeScript
- Supabase Authentication + Database
- `@supabase/ssr` cookie sessions
- Environment variables (`env.example`)

---

## Phase 1 methods

| Method | Status |
|--------|--------|
| Email + password | Enabled |
| Google / Apple / Microsoft / GitHub | Stubbed in `lib/auth/providers.ts` |
| Magic links / Passkeys | Stubbed — additive |

---

## Routes

| Route | Purpose |
|-------|---------|
| `/signup` | Registration (name, email, password) |
| `/login` | Sign in |
| `/forgot-password` | Request reset |
| `/reset-password` | Set new password |
| `/verify-email` | Verification pending / resend |
| `/auth/callback` | Code exchange (verify + recovery + future OAuth) |
| `/logout` | Destroy session → `/` |
| `/onboarding` | Post-verify preferences |
| `/change-password` | Forced change (dev Founder) |

Protected: `/app/*` (app roles), `/founder/*` (founder/admin/system).

---

## Roles

`guest` · `user` · `premium` · `founder` · `admin` · `system`

Permissions live in `lib/auth/roles.ts`. Pages check permissions, not hardcoded role strings (except portal role sets).

Production Founder elevation: set `profiles.role = 'founder'` or add the auth user UUID to `FOUNDER_USER_IDS`.

---

## Development Founder

Only when **all** are true:

- `NODE_ENV !== production`
- `VERCEL_ENV !== production`
- `FOUNDER_DEV_ENABLED=true`
- `FOUNDER_DEV_PASSWORD` set (never commit)

Default email: `founder@talkforge.io`. Seeded via service role on first login attempt; `must_change_password` forces a policy-compliant password before portal access.

---

## Security

- Passwords only in Supabase Auth (never in `profiles`)
- Service role server-only
- Server-side validation + sanitization
- App-layer rate limits + Supabase rate limits
- JWT validation via `getClaims()` in proxy
- RLS policies identity-scoped; Founder tables staff-only

---

## Ops checklist

1. Apply `supabase/migrations/20260729_auth_foundation.sql`
2. Enable Email provider in Supabase Auth
3. **URL Configuration (required for phone confirmation links):**
   - Site URL: `https://talkforge.io`
   - Redirect URLs: `https://talkforge.io/**`, `http://localhost:3000/**`
4. Paste branded templates from `supabase/email-templates/` (or run `SUPABASE_ACCESS_TOKEN=… npm run auth:configure`)
5. Set Vercel env: URL, anon key, `NEXT_PUBLIC_SITE_URL=https://talkforge.io`, service role (server)
6. Assign Founder role to your user id

Until Site URL is updated, users can still verify on phones via **6-digit code** or **paste confirmation link** at `/verify-email`.
