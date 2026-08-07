-- BILL-001 / IV-PROD-008 — member subscriptions (Stripe SSOT mirror)
-- Financial membership is separate from Living Profile identity (OWN-001).

create table if not exists public.member_subscriptions (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan text not null default 'free'
    check (plan in ('free', 'pro')),
  status text not null default 'free'
    check (
      status in (
        'free',
        'active',
        'trialing',
        'past_due',
        'canceled',
        'unpaid',
        'incomplete',
        'incomplete_expired',
        'paused',
        'expired'
      )
    ),
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  canceled_at timestamptz,
  trial_end timestamptz,
  price_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists member_subscriptions_status_idx
  on public.member_subscriptions (status);

create index if not exists member_subscriptions_stripe_customer_idx
  on public.member_subscriptions (stripe_customer_id);

alter table public.member_subscriptions enable row level security;

drop policy if exists "member_subscriptions_select_own" on public.member_subscriptions;
create policy "member_subscriptions_select_own"
  on public.member_subscriptions for select
  to authenticated
  using (user_id = auth.uid() or public.is_founder_or_admin());

-- Writes are service-role / webhook only (no insert/update policies for members).

drop trigger if exists member_subscriptions_set_updated_at on public.member_subscriptions;
create trigger member_subscriptions_set_updated_at
  before update on public.member_subscriptions
  for each row execute function public.set_updated_at();

comment on table public.member_subscriptions is
  'Stripe subscription mirror for Free/Pro. Server webhook is write authority (BILL-001).';
