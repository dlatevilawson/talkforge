"use client";

import { FormEvent, useState } from "react";

type Status = "idle" | "loading" | "success" | "error";

type WaitlistFormProps = {
  ctaLabel?: string;
  tone?: "light" | "dark";
};

export default function WaitlistForm({
  ctaLabel = "Begin the Forge",
  tone = "light",
}: WaitlistFormProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus("loading");
    setError("");

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "landing" }),
      });
      const data = (await res.json()) as { error?: string };

      if (!res.ok) {
        throw new Error(data.error || "Could not join.");
      }

      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  const dark = tone === "dark";

  if (status === "success") {
    return (
      <div
        className={`px-2 py-8 text-center ${dark ? "text-white" : "text-[var(--lp-ink)]"}`}
        role="status"
        aria-live="polite"
      >
        <p className="font-[family-name:var(--font-lp-display)] text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
          Welcome to the Forge.
        </p>
        <p
          className={`mx-auto mt-4 max-w-md text-base leading-7 ${
            dark ? "text-white/65" : "text-[var(--lp-muted)]"
          }`}
        >
          You’re among the Founding Members. We’ll meet you when the floor opens.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="w-full max-w-md">
      <label htmlFor="waitlist-email" className="sr-only">
        Email address
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id="waitlist-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === "loading"}
          placeholder="you@email.com"
          className={`min-h-12 flex-1 rounded-full border px-5 text-base outline-none transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-60 ${
            dark
              ? "border-white/20 bg-white/5 text-white placeholder:text-white/40 focus-visible:outline-white"
              : "border-[var(--lp-line)] bg-white/70 text-[var(--lp-ink)] placeholder:text-[var(--lp-muted)] focus-visible:outline-[var(--lp-ink)]"
          }`}
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className={`min-h-12 rounded-full px-7 text-sm font-semibold transition disabled:opacity-60 ${
            dark
              ? "bg-white text-[var(--lp-ink)] hover:bg-white/90"
              : "bg-[var(--lp-ink)] text-[var(--lp-bg)] hover:bg-[var(--lp-ink-soft)]"
          }`}
        >
          {status === "loading" ? "Entering…" : ctaLabel}
        </button>
      </div>
      {error && (
        <p className="mt-4 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <p
        className={`mt-4 text-center text-xs leading-5 sm:text-left ${
          dark ? "text-white/45" : "text-[var(--lp-muted)]"
        }`}
      >
        No spam. No pressure. Just an invitation when the Forge opens.
      </p>
    </form>
  );
}
