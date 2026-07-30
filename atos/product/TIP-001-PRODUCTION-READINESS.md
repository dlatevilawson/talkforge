# TIP-001 — Production Readiness Report

| Field | Value |
|---|---|
| **Document ID** | TIP-001-PRR |
| **Date** | 2026-07-29 |
| **Branch** | `cursor/auth-production-98b4` |
| **Live** | https://talkforge.io |
| **Auditor** | Atlas (verified against code + live HTTP + public Supabase settings) |

---

## Overall score: **78 / 100**

| Criterion | Max | Score | Notes |
|-----------|-----|-------|-------|
| Auth flows implemented & live | 20 | 18 | Signup/login/verify/reset/logout live; founder/RBAC coded |
| Session + route protection | 15 | 14 | Proxy + getClaims; /app→signup, /founder→login verified |
| Supabase production config | 20 | 8 | App env OK; **Site URL / templates / SMTP not independently verified** |
| Email system (branded + mobile) | 10 | 6 | Templates in repo; **not confirmed applied** in Dashboard |
| Security posture | 15 | 13 | Headers, safeNext, role lock, API guards; rate-limit is in-memory |
| Observability (GA + logs) | 10 | 8 | GA events wired for key flows; verification via email-link callback still server-log only |
| Documentation | 5 | 5 | TIP-001 + this PRR + env/deploy checklist |
| E2E device matrix | 5 | 2 | Desktop/mobile HTTP verified; **no live Gmail/Safari matrix this pass** |

**Not 100:** required Founder Supabase Dashboard steps remain unverified; default Supabase email branding may still be live; no custom SMTP; no full device email matrix; service role not on Vercel.

---

## ✔ Completed (verified)

### Authentication

| Flow | Evidence |
|------|----------|
| Sign Up | Live `/signup` — email, optional display name, password ≥8 |
| Email Verification | Live `/verify-email` — OTP + paste-link backup + callback route |
| Login | Live `/login` — email/password, Keep me signed in |
| Logout | `/logout` → 307 `/`; AppShell sign-out tracks GA |
| Password Reset | Live `/forgot-password` + `/reset-password` |
| Session Persistence | `@supabase/ssr` cookies + proxy `getClaims()` refresh |
| Founder Login | Same `/login`; role from `profiles.role` / `FOUNDER_USER_IDS` |
| RBAC | `lib/auth/roles.ts`; founder/admin/system for portal |
| Protected Routes | Live: `/app/dashboard` → 307 `/signup`; `/founder` → 307 `/login` |

### App / Vercel configuration

| Setting | Status |
|---------|--------|
| `NEXT_PUBLIC_SITE_URL` | Set on Production / Preview / Development |
| `NEXT_PUBLIC_SUPABASE_URL` + `ANON_KEY` | Set on all envs |
| `getSiteUrl()` on Vercel | Forces `https://talkforge.io` (no localhost emails from app) |
| Security headers | Live: HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy |
| Email provider (public API) | `external.email: true`, `mailer_autoconfirm: false` |

### Security (this pass)

| Check | Result |
|-------|--------|
| Hardcoded secrets in repo | None found (env.example placeholders only) |
| Production auth pages emit localhost | **None** in live HTML |
| Open redirects | `safeNextPath` rejects `//`, absolute URLs |
| Privilege escalation via signup metadata | Mitigated by `20260729_tip_secure_role_trigger.sql` (must be applied) |
| Public Founder routes | Blocked (307 to login) |
| Coach / Realtime APIs | Require authenticated session |

### Google Analytics

| Event | Client GA | Server `[TIP]` log |
|-------|-----------|--------------------|
| Signup success/failure | ✔ | ✔ |
| Login success/failure | ✔ | ✔ |
| Logout | ✔ (AppShell) | ✔ |
| Password reset request/complete | ✔ | ✔ |
| Verification success/failure (OTP/paste) | ✔ | ✔ |
| Verification via email button → `/auth/callback` | ✖ client | ✔ server only |

GA4 property loads as `G-6Y0CCE4X1Q` on auth pages (verified in HTML).

### Documentation updated

- `atos/product/TIP-001-identity-platform.md`
- `atos/product/TIP-001-DELIVERABLES.md`
- `atos/product/TIP-001-PRODUCTION-READINESS.md` (this file)
- `env.example`, Decision 042

---

## ⚠ Remaining Manual Tasks (Founder)

These **cannot** be completed from the anon key or Vercel alone. They require Supabase Dashboard or `SUPABASE_ACCESS_TOKEN`.

### 1. Site URL + Redirect URLs

| | |
|--|--|
| **Where** | [Auth → URL Configuration](https://supabase.com/dashboard/project/wudjmxqbsozreepgjvef/auth/url-configuration) |
| **Set** | Site URL = `https://talkforge.io` |
| **Set** | Redirect URLs include `https://talkforge.io/**` and `http://localhost:3000/**` |
| **Why manual** | Management API requires Founder access token; not in Vercel env |
| **If omitted** | Confirmation/reset links may still redirect to **localhost** after Supabase verify → phones fail |

### 2. Apply branded email templates

| | |
|--|--|
| **Where** | [Auth → Email Templates](https://supabase.com/dashboard/project/wudjmxqbsozreepgjvef/auth/templates) **or** `SUPABASE_ACCESS_TOKEN=… npm run auth:configure` |
| **Files** | `supabase/email-templates/*.html` |
| **Why manual** | Templates are not writable via anon/service role from this agent without Management token |
| **If omitted** | Users keep default “Supabase Auth” emails; OTP may be missing from body |

### 3. Apply SQL migrations

| | |
|--|--|
| **Where** | Supabase SQL editor |
| **Files** | `20260729_auth_foundation.sql`, `20260729_tip_secure_role_trigger.sql` |
| **If omitted** | RLS/profile shape may be stale; role self-elevation fix not active |

### 4. Optional: `SUPABASE_SERVICE_ROLE_KEY` on Vercel

| | |
|--|--|
| **Where** | Vercel Project → Environment Variables (Production, server-only) |
| **Why** | Needed for Founder allowlist DB sync + admin bootstrap |
| **If omitted** | Allowlist elevation works in proxy via env, but RLS may still see `role=user` until profile updated manually |

---

## ⚠ Known Limitations

1. **Supabase Site URL / template apply state is unverified** from this environment (public Auth settings API does not expose `site_url`).
2. **SMTP** is Supabase built-in mailer (not custom branded sender domain / SPF/DKIM confirmed).
3. **Rate limiting** is in-memory per instance (Supabase also rate-limits).
4. **Email device matrix** (Gmail / Apple Mail / Android / iPhone rendering) not re-executed in this audit pass — templates are responsive HTML, but rendering is unproven after apply.
5. **`/auth/callback` email-button success** does not fire client GA (server log only).
6. **Password policy** minimum 8 characters only (by Founder request).
7. **Preview deployments** intentionally use production Site URL for auth redirects so phones work.

---

## ✔ Recommended Improvements

1. Run `npm run auth:configure` with a Management token → closes localhost email risk.
2. Add custom SMTP (Resend/Postmark) + verified `noreply@talkforge.io`.
3. Add GA4 Measurement Protocol for server-side callback events.
4. Distributed rate limit (Upstash Redis).
5. Sentry (or equivalent) on auth failure rates.
6. Automated Playwright e2e: signup → mailhog/test inbox → verify → login.
7. Merge PR #40 to `main` so GitHub→Vercel auto-deploy matches TIP.

---

## ✔ Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Site URL still localhost | Medium–High until Founder confirms | High (mobile verify broken) | Dashboard step 1; OTP/paste backup exists |
| Templates not applied | Medium | Medium (branding + OTP UX) | `auth:configure` / Dashboard paste |
| Role trigger migration not applied | Medium | High (metadata role trust) | Apply TIP SQL migration |
| Service role missing | Medium | Low–Medium (RLS sync) | Add Vercel secret |
| Weak passwords (8-char) | Accepted | Medium | Product decision; monitor abuse |
| API spend without auth | Low now | High | Coach/realtime gated |

**Residual production risk after manual Supabase steps:** Low–Moderate.  
**Residual risk if manual steps skipped:** High for email verification on mobile.

---

## Authentication / Founder flow (final)

```
Signup → email verify (link or OTP) → onboarding → /app
Login  → session cookies → /app or /founder (RBAC)
Founder = same login + profiles.role ∈ {founder,admin,system}
         or FOUNDER_USER_IDS allowlist
Logout → signOut → /
```

---

## Environment variables (final)

| Variable | Required prod | Notes |
|----------|---------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Set |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Set |
| `NEXT_PUBLIC_SITE_URL` | Yes | Set to `https://talkforge.io` |
| `SUPABASE_SERVICE_ROLE_KEY` | Recommended | Not observed on Vercel |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Optional | Defaults to `G-6Y0CCE4X1Q` |
| `FOUNDER_USER_IDS` | Optional | Production Founder elevation |
| `FOUNDER_DEV_*` | Dev only | Blocked when `VERCEL_ENV=production` |
| `SUPABASE_ACCESS_TOKEN` | Ops only | Local `auth:configure` |

---

## Deployment checklist

1. [x] TIP code on production (talkforge.io)
2. [x] `NEXT_PUBLIC_SITE_URL` on Vercel
3. [ ] Supabase Site URL + redirect allowlist
4. [ ] Branded email templates applied
5. [ ] SQL migrations applied
6. [ ] Service role on Vercel (optional but recommended)
7. [ ] Smoke: signup → email → verify on iPhone → login → logout → reset
8. [ ] Confirm GA4 DebugView shows auth_* events
9. [ ] Merge PR to `main`

---

## Recovery procedures

| Incident | Action |
|----------|--------|
| Verify link → localhost | Use OTP or paste-link on `/verify-email`; then fix Site URL |
| Locked out after password change | `/forgot-password` |
| Founder cannot open `/founder` | Confirm `profiles.role` or `FOUNDER_USER_IDS`; re-login |
| Auth down | Check Supabase status; `/login?error=auth_unavailable` path |
| Session weirdness | `/logout` then login; clear site cookies |

---

## Future authentication providers

Extension point: `lib/auth/providers.ts` (Google, Apple, Microsoft, GitHub, magic link, passkeys — disabled). Add without redesigning TIP session/RBAC layers.
