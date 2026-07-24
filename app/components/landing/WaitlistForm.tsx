"use client";

import { FormEvent, useState } from "react";

type Status = "idle" | "loading" | "success" | "error";

export default function WaitlistForm() {
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
      const data = (await res.json()) as { error?: string; alreadyJoined?: boolean };

      if (!res.ok) {
        throw new Error(data.error || "Could not join the waitlist.");
      }

      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  if (status === "success") {
    return (
      <div
        className="rounded-3xl border border-[var(--lp-line)] bg-white px-6 py-10 text-center sm:px-10"
        role="status"
        aria-live="polite"
      >
        <p className="font-[family-name:var(--font-lp-display)] text-3xl font-semibold tracking-[-0.03em] text-[var(--lp-ink)] sm:text-4xl">
          Welcome to TalkForge.
        </p>
        <p className="mx-auto mt-4 max-w-md text-base leading-7 text-[var(--lp-muted)]">
          You’re officially one of our Founding Members.
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-3xl border border-[var(--lp-line)] bg-white px-5 py-8 sm:px-8 sm:py-10"
    >
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
          className="min-h-12 flex-1 rounded-full border border-[var(--lp-line)] bg-[var(--lp-bg)] px-5 text-base text-[var(--lp-ink)] outline-none placeholder:text-[var(--lp-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--lp-ink)] disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="min-h-12 rounded-full bg-[var(--lp-ink)] px-7 text-sm font-semibold text-[var(--lp-bg)] transition hover:bg-[var(--lp-ink-soft)] disabled:opacity-60"
        >
          {status === "loading" ? "Joining…" : "Join Waitlist"}
        </button>
      </div>
      {error && (
        <p className="mt-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      )}
      <p className="mt-4 text-center text-xs leading-5 text-[var(--lp-muted)] sm:text-left">
        No spam. Just founding updates when the floor opens.
      </p>
    </form>
  );
}
