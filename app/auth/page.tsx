"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ensureGuestUser,
  signInWithGithub,
  syncAuthUserToProfile,
  updateDisplayName,
} from "@/lib/auth";
import { getUser } from "@/lib/storage";

export default function AuthPage() {
  const router = useRouter();
  const nameRef = useRef<HTMLInputElement>(null);
  const [existingName, setExistingName] = useState("Guest");
  const [submitting, setSubmitting] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const authed = await syncAuthUserToProfile();
        if (!cancelled && authed) {
          router.replace("/dashboard");
          return;
        }

        const user = await getUser();
        if (!cancelled && user?.displayName) {
          setExistingName(user.displayName);
        }
      } catch {
        // Ignore — guest can still continue.
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleGithubSignIn() {
    setGithubLoading(true);
    setError("");

    try {
      await signInWithGithub();
      // Browser redirects to GitHub; keep loading state until navigation.
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not start GitHub sign-in."
      );
      setGithubLoading(false);
    }
  }

  async function continueAsGuest(event: React.FormEvent) {
    event.preventDefault();
    const name = nameRef.current?.value.trim() || "Guest";
    setSubmitting(true);
    setError("");

    try {
      const existing = await getUser();
      if (existing) {
        await updateDisplayName(name);
      } else {
        await ensureGuestUser(name);
      }
      router.push("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not create guest profile."
      );
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--tf-bg)] px-4 py-16 font-sans text-[var(--tf-fg)] sm:px-6">
      <div className="mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8">
        <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
          TalkForge
        </p>
        <h1 className="mt-3 text-3xl font-semibold">Sign in</h1>
        <p className="mt-4 text-sm leading-6 text-zinc-400">
          Sign in with GitHub to keep your practice history tied to your account,
          or continue as a guest for this browser session.
        </p>

        <button
          type="button"
          onClick={handleGithubSignIn}
          disabled={githubLoading || submitting}
          className="mt-8 flex w-full items-center justify-center gap-3 rounded-full border border-white/15 bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-60"
        >
          <GithubMark />
          {githubLoading ? "Redirecting to GitHub..." : "Sign in with GitHub"}
        </button>

        <div className="my-8 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-zinc-500">
          <span className="h-px flex-1 bg-white/10" />
          or
          <span className="h-px flex-1 bg-white/10" />
        </div>

        <form onSubmit={continueAsGuest} className="space-y-5">
          <label className="block" htmlFor="display-name">
            <span className="text-sm text-zinc-300">Display name</span>
            <input
              id="display-name"
              name="displayName"
              key={existingName}
              ref={nameRef}
              type="text"
              defaultValue={existingName}
              disabled={submitting || githubLoading}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 disabled:opacity-60"
            />
          </label>

          {error && (
            <p className="text-sm text-red-300" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting || githubLoading}
            className="w-full rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10 disabled:opacity-60"
          >
            {submitting ? "Starting..." : "Continue as Guest"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-500">
          <Link href="/" className="underline-offset-4 hover:underline">
            Back to home
          </Link>
        </p>
      </div>
    </main>
  );
}

function GithubMark() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      width="16"
      height="16"
      fill="currentColor"
    >
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.5 7.5 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.19 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}
