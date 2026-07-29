"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useRef, useState } from "react";
import {
  establishFounderSession,
  establishMemberSession,
} from "@/lib/auth/client";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/app/dashboard";
  const founderMode = search.get("founder") === "1";
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function onMember(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await establishMemberSession(nameRef.current?.value?.trim() || "Member");
      router.push(next.startsWith("/") ? next : "/app/dashboard");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setSubmitting(false);
    }
  }

  async function onFounder(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await establishFounderSession(
        emailRef.current?.value || "",
        passwordRef.current?.value || ""
      );
      router.push(next.startsWith("/founder") ? next : "/founder");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Founder login failed");
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center px-5 py-16">
      <p className="text-xs font-medium uppercase tracking-[0.28em] text-zinc-500">
        {founderMode ? "Founder access" : "Welcome back"}
      </p>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight text-white">
        {founderMode ? "Enter Founder Portal" : "Continue practicing"}
      </h1>

      {!founderMode ? (
        <form onSubmit={onMember} className="mt-10 space-y-4">
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
      ) : (
        <form onSubmit={onFounder} className="mt-10 space-y-4">
          <p className="rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Development Founder seed only. Credentials come from environment
            variables — never from source. Disable with{" "}
            <code className="text-amber-50">FOUNDER_DEV_ENABLED</code> unset.
          </p>
          <label className="block text-sm text-zinc-300">
            Email
            <input
              ref={emailRef}
              type="email"
              autoComplete="username"
              className="mt-2 w-full rounded-full border border-white/15 bg-white/5 px-5 py-3 text-white outline-none focus:border-white/40"
            />
          </label>
          <label className="block text-sm text-zinc-300">
            Password
            <input
              ref={passwordRef}
              type="password"
              autoComplete="current-password"
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
            className="w-full rounded-full bg-[var(--tf-gold)] px-5 py-3 text-sm font-semibold text-[#121417] disabled:opacity-60"
          >
            {submitting ? "Verifying…" : "Open headquarters"}
          </button>
        </form>
      )}

      <p className="mt-6 text-sm text-zinc-500">
        {founderMode ? (
          <Link href="/login" className="underline">
            Member login
          </Link>
        ) : (
          <>
            New here?{" "}
            <Link
              href={`/signup?next=${encodeURIComponent(next)}`}
              className="text-zinc-200 underline"
            >
              Start Training
            </Link>
          </>
        )}
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
