"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import PersistenceStatus from "@/app/components/PersistenceStatus";
import { updateDisplayName } from "@/lib/auth";
import { IDENTITY_CHANGED_EVENT } from "@/lib/identity";
import {
  clearAllTalkForgeData,
  getProgressSummary,
  getUser,
  listSessions,
} from "@/lib/storage";
import type { PracticeSession, ProgressSummary, TalkForgeUser } from "@/lib/types";

function formatMemberSince(value: string | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatSessionWhen(value: string): string {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ProfilePage() {
  const router = useRouter();
  const nameRef = useRef<HTMLInputElement>(null);
  const [saved, setSaved] = useState(false);
  const [user, setUser] = useState<TalkForgeUser | null>(null);
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      try {
        const current = await getUser();
        if (!current || current.isGuest) {
          if (!cancelled) {
            setUser(null);
            setProgress(null);
            setSessions([]);
            setError(
              current?.isGuest
                ? "Guest identity is no longer active. Please sign in again."
                : "Could not load your authenticated profile. Please sign in again."
            );
          }
          return;
        }

        const summary = await getProgressSummary(current.id);
        const history = (await listSessions(current.id)).filter(
          (session) => session.completedAt
        );

        if (cancelled) return;
        setUser(current);
        setProgress(summary);
        setSessions(history.slice(0, 10));
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

    function onIdentityChanged() {
      void load();
    }
    window.addEventListener(IDENTITY_CHANGED_EVENT, onIdentityChanged);

    return () => {
      cancelled = true;
      window.removeEventListener(IDENTITY_CHANGED_EVENT, onIdentityChanged);
    };
  }, []);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);

    try {
      const updated = await updateDisplayName(
        nameRef.current?.value ?? user?.displayName ?? "Member"
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
      router.push("/login");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to clear profile data."
      );
    }
  }

  const isAuthenticatedMember = Boolean(user && !user.isGuest);

  return (
    <>
      <div className="mb-6 max-w-xl">
        <PersistenceStatus />
      </div>
      <section className="max-w-xl">
        <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
          User Profile
        </p>
        <h1 className="mt-3 text-3xl font-semibold">Your account</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          {isAuthenticatedMember
            ? "Your TalkForge member profile and practice history, synced to your signed-in account."
            : "Sign in to view your member profile and practice history."}
        </p>
      </section>

      {error && (
        <p className="mt-4 max-w-xl text-sm text-red-300" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-8 text-sm text-zinc-500">Loading profile…</p>
      ) : isAuthenticatedMember ? (
        <>
          <form
            onSubmit={handleSave}
            className="mt-8 max-w-xl space-y-5 rounded-3xl border border-white/10 bg-white/5 p-6"
          >
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-zinc-300">
              <p>
                <span className="text-zinc-500">Email</span>
                <br />
                <span className="text-white">{user?.email || "—"}</span>
              </p>
              <p className="mt-3">
                <span className="text-zinc-500">Member since</span>
                <br />
                <span className="text-white">
                  {formatMemberSince(user?.createdAt)}
                </span>
              </p>
              <p className="mt-3">
                <span className="text-zinc-500">Sessions completed</span>
                <br />
                <span className="text-white">
                  {progress?.sessionsCompleted ?? 0}
                </span>
              </p>
            </div>

            <label className="block" htmlFor="profile-display-name">
              <span className="text-sm text-zinc-300">Display name</span>
              <input
                id="profile-display-name"
                name="displayName"
                key={user?.displayName ?? "Member"}
                ref={nameRef}
                type="text"
                defaultValue={user?.displayName ?? "Member"}
                disabled={saving}
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 disabled:opacity-60"
              />
            </label>

            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save profile"}
            </button>
            {saved && (
              <p className="text-sm text-emerald-300" role="status">
                Profile saved.
              </p>
            )}
          </form>

          <section className="mt-10 max-w-xl">
            <h2 className="text-lg font-semibold">Session history</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Recent completed practice sessions on this account.
            </p>
            {sessions.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-500">
                No completed sessions yet.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {sessions.map((session) => (
                  <li
                    key={session.id}
                    className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm"
                  >
                    <p className="font-medium text-white">
                      {session.scenarioTitle}
                    </p>
                    <p className="mt-1 text-zinc-400">
                      {formatSessionWhen(session.completedAt ?? session.startedAt)}
                      {typeof session.averageScore === "number"
                        ? ` · Score ${session.averageScore}`
                        : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : null}

      {isAuthenticatedMember && (
        <div className="mt-8 max-w-xl">
          <button
            type="button"
            onClick={handleReset}
            className="rounded-full border border-red-400/30 px-5 py-3 text-sm text-red-200 transition hover:bg-red-500/10"
          >
            Clear cloud data
          </button>
        </div>
      )}
    </>
  );
}
