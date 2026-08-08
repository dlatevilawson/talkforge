"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import MembershipCheckoutButton from "@/app/components/billing/MembershipCheckoutButton";
import type { MembershipView } from "@/lib/billing/types";
import { trackBillingEvent } from "@/lib/billing/analytics";
import {
  BILLING_PAGE_COPY,
  CANCELLATION_BODY,
  CANCELLATION_HEADLINE,
} from "@/lib/billing/member-copy";

const copy = BILLING_PAGE_COPY;

function BillingInner() {
  const searchParams = useSearchParams();
  const checkout = searchParams.get("checkout");
  const note =
    checkout === "success"
      ? copy.successBanner
      : checkout === "canceled"
        ? copy.canceledBanner
        : "";
  const autoStartCheckout = checkout === "1";
  const [membership, setMembership] = useState<MembershipView | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (checkout === "success") {
      trackBillingEvent("billing_checkout_completed", { source: "return" });
    }
  }, [checkout]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/billing/membership", { cache: "no-store" });
        const data = (await res.json()) as {
          membership?: MembershipView;
          error?: string;
        };
        if (!res.ok) throw new Error(data.error || "Could not load membership.");
        if (!cancelled) setMembership(data.membership ?? null);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not load membership."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function openPortal() {
    setPending(true);
    setError("");
    trackBillingEvent("billing_portal_opened", { source: "billing_page" });
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Could not open billing portal.");
      }
      window.location.assign(data.url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not open billing portal."
      );
      setPending(false);
    }
  }

  const showCancellation =
    membership &&
    (membership.cancelAtPeriodEnd || membership.status === "canceled");

  return (
    <main className="mx-auto max-w-2xl px-5 py-10 text-zinc-100 sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#c9a95f]">
        Membership
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">
        {copy.header.title}
      </h1>
      <p className="mt-3 max-w-xl text-base leading-7 text-zinc-400">
        {copy.header.subtitle}
      </p>

      {note ? (
        <p className="mt-6 rounded-2xl border border-[#d7b56a]/25 bg-[#c9a95f]/10 px-4 py-3 text-sm text-[#e8d5a0]">
          {note}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-10 text-sm text-zinc-500">Loading your membership…</p>
      ) : membership ? (
        <div className="mt-10 space-y-8">
          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/40">
              Current plan
            </h2>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <p className="text-2xl font-semibold">
                {membership.plan === "pro"
                  ? copy.currentPlan.proTitle
                  : copy.currentPlan.title}
              </p>
              {membership.plan === "free" ? (
                <span className="rounded-full border border-white/15 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-white/55">
                  {copy.currentPlan.badge}
                </span>
              ) : null}
            </div>
            <dl className="mt-5 grid gap-3 text-sm text-zinc-400 sm:grid-cols-2">
              <div>
                <dt className="text-white/35">Status</dt>
                <dd className="mt-1 text-zinc-200">{membership.statusLabel}</dd>
              </div>
              <div>
                <dt className="text-white/35">Billing cycle</dt>
                <dd className="mt-1 text-zinc-200">
                  {membership.billingCycle ?? "—"}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-white/35">Renewal</dt>
                <dd className="mt-1 text-zinc-200">
                  {membership.renewalLabel ?? "—"}
                </dd>
              </div>
            </dl>

            {membership.status === "past_due" ? (
              <p className="mt-5 text-sm leading-6 text-amber-100/90">
                We couldn’t process your latest payment. Please update your
                payment method to keep your membership active.
              </p>
            ) : null}

            {membership.status === "trialing" ? (
              <p className="mt-5 text-sm leading-6 text-zinc-300">
                You’re on a trial membership. Enjoy full Pro access while it
                lasts — no pressure to decide early.
              </p>
            ) : null}

            {showCancellation ? (
              <div className="mt-6 space-y-3 border-t border-white/10 pt-5 text-sm leading-6 text-zinc-300">
                <p className="font-medium text-zinc-100">
                  {CANCELLATION_HEADLINE}
                </p>
                {CANCELLATION_BODY.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            ) : null}
          </section>

          {membership.canUpgrade ? (
            <section className="rounded-3xl border border-[#d7b56a]/25 bg-[#c9a95f]/08 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#e0c07a]">
                {copy.proPlan.tagline}
              </p>
              <h2 className="mt-3 text-lg font-semibold">{copy.proPlan.title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-300">
                {copy.proPlan.description}
              </p>
              <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-lg text-white/40 line-through decoration-white/35">
                  {copy.proPlan.originalPrice}
                </span>
                <span className="text-2xl font-semibold text-zinc-100">
                  {copy.proPlan.price}
                  <span className="text-base font-medium text-zinc-400">
                    {" "}
                    {copy.proPlan.billingCycle}
                  </span>
                </span>
              </div>
              <p className="mt-2 text-sm text-[#e0c07a]">
                {copy.proPlan.priceSubtext}
              </p>
              {!membership.stripeConfigured ? (
                <p className="mt-4 text-sm text-zinc-500">
                  Membership checkout is being connected. Explore TalkForge
                  anytime — Forge will be here when you’re ready.
                </p>
              ) : (
                <div className="mt-6 max-w-sm">
                  <MembershipCheckoutButton
                    source="billing_page"
                    label={copy.proPlan.ctaButton}
                    autoStart={autoStartCheckout}
                    loginNext="/app/billing?checkout=1"
                    helperText={copy.proPlan.footerSubtext}
                    className="rounded-full bg-white px-7 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-50"
                  />
                </div>
              )}
            </section>
          ) : (
            <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <h2 className="text-lg font-semibold">Manage membership</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                Update your payment method, download invoices, cancel or resume,
                and view billing history in the secure customer portal.
              </p>
              <button
                type="button"
                onClick={() => void openPortal()}
                disabled={pending || !membership.canManage}
                className="mt-6 rounded-full border border-white/15 px-7 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-50"
              >
                {pending ? "Opening portal…" : "Open billing portal"}
              </button>
            </section>
          )}

          {membership.plan === "free" ? (
            <p className="text-sm text-zinc-500">
              Explorer includes complimentary coaching sessions so you can
              experience a full coaching cycle before claiming a Founding Pass.
            </p>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p className="mt-6 text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}

      <p className="mt-12 text-sm text-zinc-500">
        <Link href="/pricing" className="text-[#c9a95f] hover:underline">
          Founding Pass
        </Link>
        {" · "}
        <Link href="/app" className="text-zinc-400 hover:underline">
          Back to Home
        </Link>
      </p>
    </main>
  );
}

export default function BillingPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-2xl px-5 py-10 text-zinc-400">
          Loading membership…
        </main>
      }
    >
      <BillingInner />
    </Suspense>
  );
}
