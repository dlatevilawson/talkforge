# AUTH-001 — Production Authentication System

| Field | Value |
|---|---|
| **Document ID** | AUTH-001-PROD |
| **Version** | 1.1.0 |
| **Status** | Production system of record |
| **Date** | 2026-07-30 |
| **Supersedes** | Interim guest cookies; dedicated Founder login as auth mechanism |

---

## Principle

TalkForge has **one** production authentication system:

1. **Identity** — Supabase Auth (`auth.users`) + `public.profiles`
2. **Authentication** — email / password (Phase 1)
3. **Authorization** — `profiles.role` + permissions in `lib/auth/roles.ts`
4. **Session** — HTTP-only cookies via `@supabase/ssr`, refreshed in `proxy.ts` with `getClaims()`

The Founder Portal is **not** a second login. It is a **protected role** (`founder` | `admin` | `system`) on the same account after successful authentication.

Development-only Founder bootstrap (`FOUNDER_DEV_*`) may exist for local testing and is **hard-locked out of production** (`NODE_ENV` / `VERCEL_ENV`).

---

## Member flows (required)

| Flow | Route / API | Status |
|------|-------------|--------|
| Registration | `/signup` → `signupAction` | Live |
| Email verification | `/verify-email` (OTP + paste link) + `/auth/callback` | Live |
| Login | `/login` → `loginAction` | Live |
| Logout | `/logout`, AppShell, Settings | Live |
| Password reset request | `/forgot-password` | Live |
| Password reset complete | `/reset-password` | Live |
| Forced / voluntary password change | `/change-password` | Live |
| Post-verify onboarding | `/onboarding` | Live |
| Session for clients | `GET /api/auth/session` | Live |
| Protected Gym | `/app/*` via proxy + `requireAppAccess` | Live |
| Account settings | `/app/settings` | Live |

---

## Authorization model

| Role | Gym (`/app`) | Founder Portal (`/founder`) |
|------|--------------|-----------------------------|
| `guest` | No | No |
| `user` | Yes | No |
| `premium` | Yes | No |
| `founder` | Yes | Yes |
| `admin` | Yes | Yes |
| `system` | Yes | Yes |

Staff elevation in production:

1. Prefer SQL: `update public.profiles set role = 'founder' … where email = …`
2. Or Vercel env allowlist: `FOUNDER_USER_IDS=<auth-uuid>`

Never assign staff roles via signup form metadata (see `20260729_tip_secure_role_trigger.sql`).

---

## Database

Use the exact ordered path in
`supabase/migrations/manifest.json`. Existing TalkForge production starts with
`20260730_upgrade_legacy_profiles.sql`; greenfield starts with
`20260729_auth_foundation.sql` immediately followed by
`20260729_tip_secure_role_trigger.sql`.

The bootstrap paths are mutually exclusive. The greenfield foundation alone is
not a secure or complete deployment. Do not deploy `supabase/schema.sql`.

---

## Ops checklist (production cutover)

1. [ ] Select and verify the `existingProduction` path in `supabase/migrations/manifest.json`
2. [ ] Supabase Auth → Site URL = `https://talkforge.io`
3. [ ] Redirect allowlist includes `https://talkforge.io/**` and local dev URL
4. [ ] Apply branded email templates (`npm run auth:configure` or Dashboard paste)
5. [ ] Vercel: `NEXT_PUBLIC_SUPABASE_*`, `NEXT_PUBLIC_SITE_URL`
6. [ ] Optional: `SUPABASE_SERVICE_ROLE_KEY` (server only)
7. [ ] Smoke: signup → verify → login → `/app` → logout → login → reset password
8. [ ] Only then: elevate Founder role on the verified account and open `/founder`

---

## Non-goals (this phase)

- Separate Founder username/password product
- OAuth providers (stubbed for later)
- Guest cookie identity as production auth
