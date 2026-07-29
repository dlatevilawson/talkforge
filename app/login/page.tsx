"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useRef, useState } from "react";
import { establishMemberSession } from "@/lib/auth/client";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/app/dashboard";
  const nameRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const session = await establishMemberSession(
        nameRef.current?.value?.trim() || "Member"
      );
      const dest =
        next.startsWith("/founder") && session.role !== "founder"
          ? "/app/dashboard"
          : next.startsWith("/")
            ? next
            : "/app/dashboard";
      router.push(dest);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center px-5 py-16">
      <p className="text-xs font-medium uppercase tracking-[0.28em] text-zinc-500">
        Welcome back
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
        Continue practicing
      </h1>
      <p className="mt-3 text-sm text-zinc-400">
        One sign-in for everyone. Founder Portal access is granted by role —
        not a separate login.
      </p>

      <form onSubmit={onSubmit} className="mt-10 space-y-4">
        <label className="block text-sm text-zinc-300">
          Display name
          <input
            ref={nameRef}
            className="mt-2 w-full rounded-full border border-white/15 bg-white/5 px-5 py-3 text-white outline-none focus:border-white/40"
            placeholder="Your name"
          />
        </label>
        {error ? (
          <p className="text-sm text-red-300" role="alert">
            {error}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-white px-5 py-3 text-sm font-semibold text-black disabled:opacity-60"
        >
          {submitting ? "Signing in…" : "Enter the Gym"}
        </button>
      </form>

      <p className="mt-6 text-sm text-zinc-500">
        New here?{" "}
        <Link
          href={`/signup?next=${encodeURIComponent(next)}`}
          className="text-zinc-200 underline"
        >
          Start Training
        </Link>
      </p>
      <p className="mt-8">
        <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-300">
          ← TalkForge home
        </Link>
      </p>
    </main>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-[100dvh] bg-[var(--tf-bg)] text-[var(--tf-fg)]">
      <Suspense>
        <LoginForm />
      </Suspense>
    </div>
  );
}
