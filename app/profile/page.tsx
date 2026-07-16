"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import AppShell from "@/app/components/AppShell";
import PersistenceStatus from "@/app/components/PersistenceStatus";
import { updateDisplayName } from "@/lib/auth";
import { clearAllTalkForgeData, getProgressSummary, getUser } from "@/lib/storage";
import type { ProgressSummary, TalkForgeUser } from "@/lib/types";

export default function ProfilePage() {
  const router = useRouter();
  const nameRef = useRef<HTMLInputElement>(null);
  const [saved, setSaved] = useState(false);
  const [user, setUser] = useState<TalkForgeUser | null>(null);
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const current = await getUser();
        const summary = await getProgressSummary(current?.id);
        if (cancelled) return;
        setUser(current);
        setProgress(summary);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load profile."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);

    try {
      const updated = await updateDisplayName(
        nameRef.current?.value ?? "Guest"
      );
      setUser(updated);
      setSaved(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save profile."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    const confirmed = window.confirm(
      "Delete your TalkForge profile, sessions, and reflections from Supabase?"
    );
    if (!confirmed) return;

    try {
      await clearAllTalkForgeData();
      router.push("/auth");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to clear profile data."
      );
    }
  }

  return (
    <AppShell>
      <div className="mb-6 max-w-xl">
        <PersistenceStatus />
      </div>
      <section className="max-w-xl">
        <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
          User Profile
        </p>
        <h1 className="mt-3 text-3xl font-semibold">Your account</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Guest profile stored in Supabase. Your practice history syncs with this
          browser session&apos;s guest identity.
        </p>
      </section>

      {error && (
        <p className="mt-4 max-w-xl text-sm text-red-300" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-8 text-sm text-zinc-500">Loading profile from Supabase…</p>
      ) : (
        <form
          onSubmit={handleSave}
          className="mt-8 max-w-xl space-y-5 rounded-3xl border border-white/10 bg-white/5 p-6"
        >
          <label className="block" htmlFor="profile-display-name">
            <span className="text-sm text-zinc-300">Display name</span>
            <input
              id="profile-display-name"
              name="displayName"
              key={user?.displayName ?? "Guest"}
              ref={nameRef}
              type="text"
              defaultValue={user?.displayName ?? "Guest"}
              disabled={saving}
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 disabled:opacity-60"
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
            disabled={saving}
            className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save profile"}
          </button>
          {saved && (
            <p className="text-sm text-emerald-300" role="status">
              Profile saved to Supabase.
            </p>
          )}
        </form>
      )}

      <div className="mt-8 max-w-xl">
        <button
          type="button"
          onClick={handleReset}
          className="rounded-full border border-red-400/30 px-5 py-3 text-sm text-red-200 transition hover:bg-red-500/10"
        >
          Clear cloud data
        </button>
      </div>
    </AppShell>
  );
}
