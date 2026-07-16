"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef } from "react";
import { ensureGuestUser, updateDisplayName } from "@/lib/auth";
import { getUser } from "@/lib/storage";
import { useLocalData } from "@/lib/use-local-data";

export default function AuthPage() {
  const router = useRouter();
  const nameRef = useRef<HTMLInputElement>(null);

  const getClientValue = useCallback(
    () => getUser()?.displayName ?? "Guest",
    []
  );

  const existingName = useLocalData(getClientValue, "Guest");

  function continueAsGuest(event: React.FormEvent) {
    event.preventDefault();
    const name = nameRef.current?.value.trim() || "Guest";
    if (getUser()) {
      updateDisplayName(name);
    } else {
      ensureGuestUser(name);
    }
    router.push("/dashboard");
  }

  return (
    <main className="min-h-screen bg-[var(--tf-bg)] px-4 py-16 font-sans text-[var(--tf-fg)] sm:px-6">
      <div className="mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8">
        <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
          TalkForge
        </p>
        <h1 className="mt-3 text-3xl font-semibold">Continue practicing</h1>
        <p className="mt-4 text-sm leading-6 text-zinc-400">
          Guest mode keeps your sessions on this device so you can complete the
          full practice loop now. Full authentication can replace this later.
        </p>

        <form onSubmit={continueAsGuest} className="mt-8 space-y-5">
          <label className="block">
            <span className="text-sm text-zinc-300">Display name</span>
            <input
              key={existingName}
              ref={nameRef}
              type="text"
              defaultValue={existingName}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
            />
          </label>

          <button
            type="submit"
            className="w-full rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
          >
            Continue as Guest
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
