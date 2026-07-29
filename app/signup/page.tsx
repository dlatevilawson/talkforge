"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useRef, useState } from "react";
import { establishMemberSession } from "@/lib/auth/client";

function SignupForm() {
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
      setError(err instanceof Error ? err.message : "Signup failed");
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center px-5 py-16">
      <p className="text-xs font-medium uppercase tracking-[0.28em] text-zinc-500">
        Start Training
      </p>
      <h1 className="mt-4 font-semibold tracking-tight text-3xl text-white">
        Create your place on the floor.
      </h1>
      <p className="mt-3 text-zinc-400">
        Practice the conversations that matter. Continues with guest identity —
        the same architecture TalkForge already uses.
      </p>
      <form onSubmit={onSubmit} className="mt-10 space-y-4">
        <label className="block text-sm text-zinc-300">
          Display name
          <input
            ref={nameRef}
            name="displayName"
            defaultValue=""
            placeholder="Your name"
            className="mt-2 w-full rounded-full border border-white/15 bg-white/5 px-5 py-3 text-white outline-none focus:border-white/40"
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
          {submitting ? "Opening…" : "Enter the Gym"}
        </button>
      </form>
      <p className="mt-6 text-sm text-zinc-500">
        Already practicing?{" "}
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="text-zinc-200 underline">
          Log in
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

export default function SignupPage() {
  return (
    <div className="min-h-[100dvh] bg-[var(--tf-bg)] text-[var(--tf-fg)]">
      <Suspense>
        <SignupForm />
      </Suspense>
    </div>
  );
}
