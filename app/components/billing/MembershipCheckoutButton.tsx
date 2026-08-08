"use client";

import { useEffect, useState } from "react";
import { trackBillingEvent } from "@/lib/billing/analytics";
import { BECOME_PRO_MEMBER_CTA } from "@/lib/billing/member-copy";

type Props = {
  source: string;
  label?: string;
  /** When true, start checkout as soon as the button mounts (post-login return). */
  autoStart?: boolean;
  /** Where to send unauthenticated members (includes return next). */
  loginNext?: string;
  className?: string;
  disabled?: boolean;
  disabledHint?: string;
  /** Optional helper under the button. Pass null to hide. */
  helperText?: string | null;
};

export default function MembershipCheckoutButton({
  source,
  label = BECOME_PRO_MEMBER_CTA,
  autoStart = false,
  loginNext = "/pricing?checkout=1",
  className,
  disabled = false,
  disabledHint,
  helperText = "You’ll sign in (or create an account), then continue to secure Stripe Checkout.",
}: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function startCheckout() {
    if (pending || disabled) return;
    setPending(true);
    setError("");
    trackBillingEvent("billing_upgrade_started", { source });
    try {
      const res = await fetch("/api/billing/checkout", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };

      if (res.status === 401) {
        // Full navigation — more reliable than client router after auth gate.
        window.location.assign(
          `/login?next=${encodeURIComponent(loginNext)}`
        );
        return;
      }

      if (!res.ok || !data.url) {
        throw new Error(data.error || "Could not open Stripe Checkout.");
      }
      window.location.assign(data.url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not open Stripe Checkout."
      );
      setPending(false);
    }
  }

  useEffect(() => {
    if (!autoStart || disabled) return;
    const timer = window.setTimeout(() => {
      void startCheckout();
    }, 0);
    return () => window.clearTimeout(timer);
    // Intentionally once for post-login return (?checkout=1).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart, disabled]);

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => void startCheckout()}
        disabled={pending || disabled}
        className={
          className ??
          "w-full rounded-full bg-[var(--lp-ink)] px-8 py-3.5 text-sm font-semibold text-[var(--lp-bg)] transition hover:opacity-90 disabled:opacity-50"
        }
      >
        {pending ? "Continuing…" : label}
      </button>
      {disabled && disabledHint ? (
        <p className="mt-3 text-sm text-[var(--lp-muted)]">{disabledHint}</p>
      ) : null}
      {error ? (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {!disabled && helperText ? (
        <p className="mt-3 text-xs leading-5 opacity-60">{helperText}</p>
      ) : null}
    </div>
  );
}
