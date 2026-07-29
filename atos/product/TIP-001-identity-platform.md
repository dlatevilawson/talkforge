# TIP-001 — TalkForge Identity Platform
# Phase I — Production Authentication Foundation

| Field | Value |
|---|---|
| **Document ID** | TIP-001 |
| **Version** | 1.0.0 |
| **Status** | Production-ready with Founder ops remaining (see TIP-001-PRR) |
| **Date** | 2026-07-29 |
| **Branch** | `cursor/auth-production-98b4` |
| **Supersedes** | AUTH-001 interim notes (retained as volume) |

---

## 1. Executive summary

TalkForge Identity Platform (TIP) Phase I replaces interim guest-cookie identity with **Supabase Auth** as the permanent identity service for all TalkForge products.

**Responsibilities of TIP (only):**

1. Identity — who the user is  
2. Authentication — can they sign in  
3. Authorization — what they can access (RBAC)  
4. Session management — how long access persists  

Business logic, onboarding questionnaires, and training content remain outside TIP.

---

## 2. Architecture audit (verified 2026-07-29)

### Provider

| Item | Finding |
|------|---------|
| Provider | Supabase Auth (email + password) |
| Packages | `@supabase/ssr` 0.12.4, `@supabase/supabase-js` 2.111.0 |
| Session | HTTP-only cookies via `@supabase/ssr` |
| Validation | `getClaims()` in `proxy.ts` (JWT signature verified) |
| Future providers | Stubbed in `lib/auth/providers.ts` |

### Route protection (`proxy.ts`)

| Surface | Rule |
|---------|------|
| Public marketing | `/`, `/about`, `/pricing`, `/blog`, `/contact`, `/privacy`, `/terms` |
| Auth flows | `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/verify-email`, `/auth/callback`, `/logout` |
| Authenticated Gym | `/app/*` |
| Founder HQ | `/founder/*` — roles `founder` \| `admin` \| `system` |
| Post-auth | `/onboarding`, `/change-password` |

### Critical findings (addressed in this phase)

| ID | Severity | Finding | Mitigation |
|----|----------|---------|------------|
| TIP-S1 | Critical | `profiles` trigger trusted `raw_user_meta_data.role` | Force role=`user` on self-signup; staff roles only via service role / allowlist sync |
| TIP-S2 | High | Open redirect via `next=//evil.com` | `safeNextPath()` allows only same-origin relative paths |
| TIP-S3 | High | Supabase Site URL may still be localhost | Configure script + `NEXT_PUBLIC_SITE_URL`; templates use production Site URL |
| TIP-S4 | Medium | No security headers | Add CSP-friendly baseline headers in `next.config.ts` |
| TIP-S5 | Medium | No auth analytics | GA4 custom events for auth lifecycle |
| TIP-S6 | Medium | FOUNDER_USER_IDS not synced to DB RLS | Sync elevate on login when allowlisted |
| TIP-S7 | Low | Signup collected first/last (onboarding leak) | Signup = email + password + optional display name |
| TIP-S8 | Low | In-memory rate limit only | Keep + document Supabase rate limits as primary |

---

## 3. Identity model (Phase 5)

**At account creation (minimal):**

- User ID (`auth.users.id`)
- Email
- Display name (optional)
- Provider (`email`)
- Created at
- Email verification status
- Role (`user` default)
- Preferences JSON (future-ready, empty)
- Consent (future-ready)

**After verification → onboarding** (not part of signup): timezone, language, profile polish.

Passwords never stored in `profiles`.

---

## 4. Environment matrix

| Variable | Dev | Preview | Production |
|----------|-----|---------|------------|
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3000` | `https://talkforge.io` | `https://talkforge.io` |
| `NEXT_PUBLIC_SUPABASE_URL` | project | project | project |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon | anon | anon |
| `SUPABASE_SERVICE_ROLE_KEY` | optional local | server only | server only |
| `FOUNDER_DEV_*` | allowed if flagged | **blocked** (`VERCEL_ENV`) | **blocked** |
| `FOUNDER_USER_IDS` | optional | optional | production Founder elevation |

Supabase Dashboard **must** set:

- Site URL = `https://talkforge.io`
- Redirect allowlist = `https://talkforge.io/**`, `http://localhost:3000/**`

---

## 5. Auth lifecycle

```
Signup (email+password)
  → Supabase creates auth.users (unverified)
  → Trigger creates profiles (pending, role=user)
  → Verification email (TalkForge branded)
  → /auth/callback or OTP on /verify-email
  → profiles.email_verified=true, account_status=active
  → /onboarding (preferences)
  → /app/dashboard

Login → session cookies → proxy refresh via getClaims
Logout → signOut → clear cookies → /
Forgot → reset email → /reset-password → login
```

---

## 6. Folder structure

```
lib/auth/           TIP core (roles, session, password, validate, analytics)
lib/supabase/       SSR clients, proxy session, admin
app/actions/auth.ts Server Actions (signup/login/reset/verify)
app/login|signup|…  Auth UI routes
app/auth/callback   OAuth/email callback
app/founder/        Founder HQ (RBAC)
supabase/migrations Auth schema + RLS
supabase/email-templates/ Branded HTML
scripts/configure-supabase-auth.mjs  Site URL + templates API
atos/product/TIP-001-*.md  This document
```

---

## 7. Definition of Done checklist

See end of implementation PR / deployment verification section.
