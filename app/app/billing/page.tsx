"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import type { MembershipView } from "@/lib/billing/types";
import { trackBillingEvent } from "@/lib/billing/analytics";

function BillingInner() {
  const searchParams = useSearchParams();
  const checkout = searchParams.get("checkout");
  const note =
    checkout === "success"
      ? "Welcome to TalkForge Pro. Your membership is updating."
      : checkout === "canceled"
        ? "Checkout canceled. You can upgrade whenever you’re ready."
        : "";
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
        if (!res.ok) throw new Error(data.error || "Could not load billing.");
        if (!cancelled) setMembership(data.membership ?? null);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not load billing."
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

  async function upgrade() {
    setPending(true);
    setError("");
    trackBillingEvent("billing_upgrade_started", { source: "billing_page" });
    try {
      const res = await fetch("/api/billing/checkout", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Could not start checkout.");
      }
      window.location.assign(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout.");
      setPending(false);
    }
  }

  async function openPortal() {
    setPending(true);
    setError("");
    trackBillingEvent("billing_portal_opened", { source: "billing_page" });
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Could not open portal.");
      }
      window.location.assign(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open portal.");
      setPending(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-10 text-zinc-100 sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#c9a95f]">
        Membership
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">Billing</h1>
      <p className="mt-3 max-w-xl text-base leading-7 text-zinc-400">
        Prepare with confidence. Upgrade when deliberate practice becomes part
        of your routine — never under pressure.
      </p>

      {note ? (
        <p className="mt-6 rounded-2xl border border-[#d7b56a]/25 bg-[#c9a95f]/10 px-4 py-3 text-sm text-[#e8d5a0]">
          {note}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-10 text-sm text-zinc-500">Loading your plan…</p>
      ) : membership ? (
        <div className="mt-10 space-y-8">
          <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-white/40">
              Current plan
            </h2>
            <p className="mt-4 text-2xl font-semibold">
              {membership.plan === "pro" ? "TalkForge Pro" : "TalkForge Free"}
            </p>
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
          </section>

          {membership.canUpgrade ? (
            <section className="rounded-3xl border border-[#d7b56a]/25 bg-[#c9a95f]/08 p-6">
              <h2 className="text-lg font-semibold">Upgrade to Pro</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-300">
                Unlimited practice sessions, longer voice coaching, conversation
                memory, and progress tracking — so consistent preparation stays
                available when the stakes are high.
              </p>
              <p className="mt-4 text-sm text-[#e0c07a]">
                {membership.proPriceLabel} · Cancel anytime
              </p>
              {!membership.stripeConfigured ? (
                <p className="mt-4 text-sm text-zinc-500">
                  Billing is being connected. Check back shortly, or continue
                  exploring Free practice while it lasts.
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => void upgrade()}
                  disabled={pending}
                  className="mt-6 rounded-full bg-white px-7 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-50"
                >
                  {pending ? "Opening checkout…" : "Upgrade to Pro"}
                </button>
              )}
            </section>
          ) : (
            <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <h2 className="text-lg font-semibold">Manage subscription</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">
                Update your payment method, download invoices, cancel or resume,
                and view billing history in the secure Stripe customer portal.
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
              Free includes up to {membership.freeLimits.maxPracticeSessions}{" "}
              complete practice sessions so you can experience a full coaching
              cycle before deciding.
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
        <Link href="/membership" className="text-[#c9a95f] hover:underline">
          Membership overview
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
          Loading billing…
        </main>
      }
    >
      <BillingInner />
    </Suspense>
  );
}
