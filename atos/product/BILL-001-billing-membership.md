# BILL-001 — Billing & Membership Platform (Production v1)

| Field | Value |
|---|---|
| **Document ID** | BILL-001 |
| **Version** | 1.2.0 |
| **Status** | Working Knowledge — Founder-authorized Production v1 (IV-PROD-008) |
| **Owner** | Founder |
| **Related** | IV-PROD-008 · IV-PROD-010 · BS-015 · BS-016 · TIP-001 · OWN-001 · Craft Law #001 · DES-001 |
| **Updated** | 2026-09-07 |

## Plans (only)

| Plan | Access |
|---|---|
| **Free** | Account, explore, browse, deliberate hold-to-talk with Forge, **3 complete coaching sessions per calendar month** |
| **Pro** | Unlimited practice/voice, hands-free conversation with Coach Forge, longer sessions, memory, progress, future premium coaching |

No Team / Enterprise in v1.

Before authentication, a browser may receive **one anonymous private Forge preview session** through the Decision 060 Coach path. That preview is separate from membership and does not consume the Free monthly allowance, including after it is claimed.

## Philosophy

Earn subscriptions through value. Never interrupt a live session. Never lock the account. No dark patterns.

**Member-facing language:** say complimentary coaching sessions / Become a Pro Member — never “session limit,” “usage limit,” or “quota.” The final complimentary session ends with a genuine coaching wrap before any membership prompt.

## Config (env)

| Variable | Purpose |
|---|---|
| `BILLING_FREE_MAX_SESSIONS` | Legacy total-limit compatibility only; Decision 060 monthly allowance is controlling |
| `BILLING_FREE_MAX_SESSION_SECONDS` | Soft guidance for free session length (default 900) |
| `BILLING_FREE_MONTHLY_LIMIT_ENABLED` | Monthly allowance enforcement; Decision 060 requires enabled in production |
| `BILLING_FREE_MONTHLY_MAX_SESSIONS` | Monthly Free sessions; controlling default **3** |
| `STRIPE_SECRET_KEY` | Server Stripe key |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret |
| `STRIPE_PRO_PRICE_ID` | Preferred — Stripe `price_…` **or** `prod_…` (Product IDs auto-resolve to an active monthly Price) |
| `STRIPE_PRICE_PRO_MONTHLY` | Alias for Price ID |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Publishable key (Checkout redirect only) |
| `NEXT_PUBLIC_BILLING_PRO_PRICE_LABEL` | Optional display override; otherwise price is loaded live from Stripe |

**Vercel:** set these for **Production** (not only Preview), then **Redeploy**.  
Debug: `GET /api/billing/offer` returns `{ configured, priceLabel, diagnostics }` (no secrets).

`/pricing` is the Founding Members offer (live Stripe price + Checkout). `/membership` is the full Membership FAQ.

### Webhook endpoint

Point Stripe to: `POST {SITE_URL}/api/billing/webhook`  
Events (minimum): `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`.

Apply migration: `supabase/migrations/20260807_member_subscriptions.sql`.

## Entitlement rules

- Founder / admin / system → always Pro access.
- Stripe status `active` | `trialing` | `past_due` → Pro access (past_due = Smart Retries grace).
- `canceled` with `cancel_at_period_end` until `current_period_end` → Pro access.
- Otherwise Free; gate **starting** a new practice session when the server-authoritative completed-session count reaches **3 in the current calendar month**.
- Define and document one server calendar-month timezone boundary in implementation; apply it consistently to count and rollover.
- A Decision 060 anonymous preview is classified separately and never increments Free monthly usage, before or after claim.
- Anonymous preview entitlement is one best-effort browser-bound session through a signed HttpOnly cookie + server record. It is not member identity and cannot prove one preview per person.
- Never revoke mid-session.
- Realtime session mint selects hands-free only from server-confirmed Pro/staff entitlement; Free stays hold-to-talk.
- Realtime mint, reconnect, concurrent-session handling, and voice-usage tracking independently resolve server entitlement and ignore client plan/preview/count claims.
- Anonymous preview Forge mints require a valid unused server preview entitlement plus rate, concurrency, duration, token, and spend controls.

## Coach preview boundary (Decision 060)

- `/coach` presents the seven-topic grid and grants one anonymous private Forge preview before auth.
- Signup/signin appears only after that session closes.
- Post-session billing copy is exact: **“Save your progress and get 3 free sessions every month — no credit card required.”**
- The post-session actions are **“Create account,” “Sign in,”** and **“Maybe later.”** The composer/input is disabled while the prompt is visible.
- After **“Maybe later,”** further input remains disabled; show **“Ready to practice again? Create an account for 3 free sessions every month.”** with **“Get started”** linking to auth.
- Claim preserves the preview transcript/topic without converting it into a billable or Free-counted member session.
- The preview writes no Living Profile identity and creates no billing identity.
- No `guest_*` revival, cross-device archive recovery, or client-authoritative entitlement.
- Do not market browser-bound enforcement as a provable one-person limit.

## Surfaces

| Route | Role |
|---|---|
| `/pricing` | Founding Members offer — live Stripe price + Checkout CTA |
| `/membership` | Full Membership FAQ + Pro checkout |
| `/app/billing` | Current plan, upgrade, manage via Stripe Portal |
| `/api/billing/*` | Checkout, portal, membership, entitlement, webhook |

## Analytics events

`billing_upgrade_started` · `billing_checkout_completed` · `billing_subscription_activated` · `billing_subscription_canceled` · `billing_subscription_renewed` · `billing_payment_failed` · `billing_portal_opened`
