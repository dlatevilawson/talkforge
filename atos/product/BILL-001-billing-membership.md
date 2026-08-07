# BILL-001 — Billing & Membership Platform (Production v1)

| Field | Value |
|---|---|
| **Document ID** | BILL-001 |
| **Version** | 1.0.0 |
| **Status** | Working Knowledge — Founder-authorized Production v1 (IV-PROD-008) |
| **Owner** | Founder |
| **Related** | IV-PROD-008 · BS-016 · TIP-001 · OWN-001 · Craft Law #001 · DES-001 |
| **Updated** | 2026-08-07 |

## Plans (only)

| Plan | Access |
|---|---|
| **Free** | Account, explore, browse, talk with Forge, limited complete coaching sessions |
| **Pro** | Unlimited practice/voice, longer sessions, memory, progress, future premium coaching |

No Team / Enterprise in v1.

## Philosophy

Earn subscriptions through value. Never interrupt a live session. Never lock the account. No dark patterns.

## Config (env)

| Variable | Purpose |
|---|---|
| `BILLING_FREE_MAX_SESSIONS` | Max completed free practice sessions (default 3) |
| `BILLING_FREE_MAX_SESSION_SECONDS` | Soft guidance for free session length (default 900) |
| `BILLING_FREE_MONTHLY_LIMIT_ENABLED` | Optional monthly free cap (default false) |
| `BILLING_FREE_MONTHLY_MAX_SESSIONS` | Monthly free sessions when enabled |
| `STRIPE_SECRET_KEY` | Server Stripe key |
| `STRIPE_WEBHOOK_SECRET` | Webhook signing secret |
| `STRIPE_PRICE_PRO_MONTHLY` | Pro monthly Price ID |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Publishable key (Checkout redirect only) |
| `NEXT_PUBLIC_BILLING_PRO_PRICE_LABEL` | Display price e.g. `$29/month` |

### Webhook endpoint

Point Stripe to: `POST {SITE_URL}/api/billing/webhook`  
Events (minimum): `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`.

Apply migration: `supabase/migrations/20260807_member_subscriptions.sql`.

## Entitlement rules

- Founder / admin / system → always Pro access.
- Stripe status `active` | `trialing` | `past_due` → Pro access (past_due = Smart Retries grace).
- `canceled` with `cancel_at_period_end` until `current_period_end` → Pro access.
- Otherwise Free; gate **starting** a new practice session when completed-session count ≥ free max.
- Never revoke mid-session.

## Surfaces

| Route | Role |
|---|---|
| `/membership` | Public Membership page (replaces Pricing nav) |
| `/pricing` | Redirect → `/membership` |
| `/app/billing` | Current plan, upgrade, manage via Stripe Portal |
| `/api/billing/*` | Checkout, portal, membership, entitlement, webhook |

## Analytics events

`billing_upgrade_started` · `billing_checkout_completed` · `billing_subscription_activated` · `billing_subscription_canceled` · `billing_subscription_renewed` · `billing_payment_failed` · `billing_portal_opened`
