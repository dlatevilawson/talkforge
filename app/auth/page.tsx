"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ensureGuestUser, updateDisplayName } from "@/lib/auth";
import { getUser } from "@/lib/storage";

export default function AuthPage() {
  const router = useRouter();
  const nameRef = useRef<HTMLInputElement>(null);
  const [existingName, setExistingName] = useState("Guest");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
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
  }, []);

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
        <h1 className="mt-3 text-3xl font-semibold">Continue practicing</h1>
        <p className="mt-4 text-sm leading-6 text-zinc-400">
          Guest mode creates your profile in Supabase so practice sessions and
          reflections sync across this browser session.
        </p>

        <form onSubmit={continueAsGuest} className="mt-8 space-y-5">
          <label className="block" htmlFor="display-name">
            <span className="text-sm text-zinc-300">Display name</span>
            <input
              id="display-name"
              name="displayName"
              key={existingName}
              ref={nameRef}
              type="text"
              defaultValue={existingName}
              disabled={submitting}
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
            disabled={submitting}
            className="w-full rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-60"
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
