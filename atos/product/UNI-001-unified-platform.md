# UNI-001 — Unified TalkForge Platform Architecture

| Field | Value |
|---|---|
| **Document ID** | UNI-001 |
| **Version** | 1.0.0 |
| **Status** | Implemented |
| **Date** | 2026-07-29 |
| **Branch** | `cursor/unify-platform-98b4` |

---

## Architecture summary

One Next.js app, one repo, one Vercel project, one domain, one GA property.

```
/                 Marketing landing (preserved)
/about|/pricing|/blog|/contact|/privacy|/terms
/login|/signup    Auth (Supabase Auth — AUTH-001)
/app/*            Communication Gym (protected)
/founder/*        Founder Portal (founder/admin roles)
```

Protection uses Next.js 16 **`proxy.ts`** (not deprecated `middleware`).

### Auth decision (AUTH-001 / Decision 041)

Production identity uses **Supabase Auth** (email/password) with `@supabase/ssr` HTTP-only cookies, role-driven authorization on `profiles.role`, and `proxy.ts` session refresh. See `atos/product/AUTH-001-authentication-foundation.md`.

**Founder access:** same `/login` / `/signup` as every member. Role from `profiles.role` / `FOUNDER_USER_IDS`. Dev Founder bootstrap (`FOUNDER_DEV_*`) is **hard-locked out of production**.

### Why not fork the landing page

The LP remains `app/page.tsx` + `LandingPage` — same hero, film, SEO, GA. Navigation only gained Start Training / Login / Features / Pricing / About.

---

## Files modified (primary)

| Area | Paths |
|------|--------|
| Proxy | `proxy.ts` |
| Auth | `lib/auth/*`, `app/api/auth/session/route.ts` |
| App shell | `app/app/layout.tsx`, `app/components/AppShell.tsx` |
| Product routes | moved under `app/app/**` |
| Auth pages | `app/login`, `app/signup` |
| Founder | `app/founder/**` |
| Marketing stubs | `app/about`, `pricing`, `blog`, `contact` |
| Redirects | `next.config.ts` |
| LP nav/CTA | `LandingNav.tsx`, `LandingPage.tsx` |
| Config | `env.example`, `robots.ts`, `sitemap.ts` |

---

## Future recommendations

1. Replace FOUNDER_DEV cookie seed with Supabase Auth + `profiles.role`.
2. Tighten RLS once Auth lands (BUG-001).
3. Collapse mission arenas under `/app/practice/[mission]`.
4. Wire GA4 custom events for signup → first practice.
5. Close superseded draft LP PRs (#36, #37).

---

## Risks & debt

| Risk | Mitigation |
|------|------------|
| Cookie auth forgeable if attacker sets cookies | Interim; move to signed/JWT or Supabase session |
| Founder env login on Vercel | Only enable FOUNDER_DEV_ENABLED when needed |
| Double chrome on `/founder/atlas` embedding FounderOS | Later: extract panels without FounderOS chrome |
| Guest “login” is not password auth | Honest UX copy; plan real accounts |

---

## Blind spots

- No email verification / password recovery.
- Analytics “top pages” not yet pulled from GA API into Founder Portal.
- `/blog` is a stub (intentional mystery).
- ESLint may still flag other legacy setState patterns outside Reveal.

---

## Strategic note

Unification maximizes trust: visitors never leave TalkForge to “enter the app.” The gym is a wing of the same house — which strengthens the mission of practice without shame or fragmentation.
