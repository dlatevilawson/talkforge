"use client";

import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import AppShell from "@/app/components/AppShell";
import { ensureGuestUser, updateDisplayName } from "@/lib/auth";
import { clearAllTalkForgeData, getProgressSummary, getUser } from "@/lib/storage";
import { useLocalData } from "@/lib/use-local-data";

export default function ProfilePage() {
  const router = useRouter();
  const nameRef = useRef<HTMLInputElement>(null);
  const [saved, setSaved] = useState(false);

  const getClientValue = useCallback(() => {
    const user = ensureGuestUser();
    return {
      user,
      progress: getProgressSummary(user.id),
    };
  }, []);

  const data = useLocalData(getClientValue, null);

  const user = data?.user ?? null;
  const progress = data?.progress ?? null;

  function handleSave(event: React.FormEvent) {
    event.preventDefault();
    updateDisplayName(nameRef.current?.value ?? "Guest");
    setSaved(true);
  }

  function handleReset() {
    const confirmed = window.confirm(
      "Clear all local TalkForge sessions, reflections, and profile data on this device?"
    );
    if (!confirmed) return;
    clearAllTalkForgeData();
    router.push("/auth");
  }

  return (
    <AppShell>
      <section className="max-w-xl">
        <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
          User Profile
        </p>
        <h1 className="mt-3 text-3xl font-semibold">Your account</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Guest profile for the MVP loop. Data stays on this device until
          Supabase authentication replaces it.
        </p>
      </section>

      <form
        onSubmit={handleSave}
        className="mt-8 max-w-xl space-y-5 rounded-3xl border border-white/10 bg-white/5 p-6"
      >
        <label className="block">
          <span className="text-sm text-zinc-300">Display name</span>
          <input
            key={user?.displayName ?? "Guest"}
            ref={nameRef}
            type="text"
            defaultValue={user?.displayName ?? getUser()?.displayName ?? "Guest"}
            className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
          />
        </label>

        <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-400">
          <p>
            Member since:{" "}
            {user ? new Date(user.createdAt).toLocaleDateString() : "—"}
          </p>
          <p className="mt-1">
            Sessions completed: {progress?.sessionsCompleted ?? 0}
          </p>
        </div>

        <button
          type="submit"
          className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200"
        >
          Save profile
        </button>
        {saved && (
          <p className="text-sm text-emerald-300" role="status">
            Profile saved.
          </p>
        )}
      </form>

      <div className="mt-8 max-w-xl">
        <button
          type="button"
          onClick={handleReset}
          className="rounded-full border border-red-400/30 px-5 py-3 text-sm text-red-200 transition hover:bg-red-500/10"
        >
          Clear local data
        </button>
      </div>
    </AppShell>
  );
}
