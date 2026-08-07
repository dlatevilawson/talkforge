"use client";

import { useState } from "react";
import { trackBillingEvent } from "@/lib/billing/analytics";
import { BECOME_PRO_MEMBER_CTA } from "@/lib/billing/member-copy";

type Props = {
  source: string;
  className?: string;
};

export default function BecomeProMemberButton({ source, className }: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function upgrade() {
    setPending(true);
    setError("");
    trackBillingEvent("billing_upgrade_started", { source });
    try {
      const res = await fetch("/api/billing/checkout", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Could not open membership checkout.");
      }
      window.location.assign(data.url);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not open membership checkout."
      );
      setPending(false);
    }
  }

  return (
    <div className="w-full">
      <button
        type="button"
        onClick={() => void upgrade()}
        disabled={pending}
        className={
          className ??
          "w-full rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-50"
        }
      >
        {pending ? "Opening checkout…" : BECOME_PRO_MEMBER_CTA}
      </button>
      {error ? (
        <p className="mt-3 text-sm text-red-300" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
