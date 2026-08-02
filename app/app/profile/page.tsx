"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import PersistenceStatus from "@/app/components/PersistenceStatus";
import { updateDisplayName } from "@/lib/auth";
import { IDENTITY_CHANGED_EVENT } from "@/lib/identity";
import {
  clearAllTalkForgeData,
  getProgressSummary,
  getUser,
  listSessions,
} from "@/lib/storage";
import type { LivingProfile } from "@/lib/system1/types";
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

/**
 * Living Profile surface — SSOT for who the member is becoming (OWN-001).
 * Account history remains secondary; identity fields read/write Living Profile only.
 */
export default function ProfilePage() {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [user, setUser] = useState<TalkForgeUser | null>(null);
  const [living, setLiving] = useState<LivingProfile | null>(null);
  const [tableReady, setTableReady] = useState(true);
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [nickname, setNickname] = useState("");
  const [purpose, setPurpose] = useState("");
  const [principles, setPrinciples] = useState("");
  const [seasons, setSeasons] = useState("");
  const [coachingStyle, setCoachingStyle] = useState("");

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
            setLiving(null);
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

        const [summary, history, lpRes] = await Promise.all([
          getProgressSummary(current.id),
          listSessions(current.id).then((s) =>
            s.filter((session) => session.completedAt)
          ),
          fetch("/api/living-profile", { cache: "no-store" }).then((r) =>
            r.json() as Promise<{
              profile?: LivingProfile | null;
              tableReady?: boolean;
            }>
          ),
        ]);

        if (cancelled) return;
        setUser(current);
        setProgress(summary);
        setSessions(history.slice(0, 10));
        setTableReady(lpRes.tableReady !== false);
        const profile = lpRes.profile ?? null;
        setLiving(profile);
        setDisplayName(profile?.displayName || current.displayName || "");
        setNickname(profile?.preferredNickname ?? "");
        setPurpose(profile?.purposeStatement ?? "");
        setPrinciples(
          (profile?.personalPrinciples ?? []).map((p) => p.text).join(", ")
        );
        setSeasons((profile?.seasons ?? []).map((s) => s.label).join(", "));
        setCoachingStyle(profile?.preferredCoachingStyle ?? "");
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
      const updated = await updateDisplayName(displayName || "Member");
      setUser(updated);

      const principleLines = principles
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean);
      const seasonLabels = seasons
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch("/api/living-profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: updated.displayName,
          preferredNickname: nickname,
          purposeStatement: purpose,
          principleLines,
          seasonLabels,
          preferredCoachingStyle: coachingStyle,
        }),
      });
      const data = (await res.json()) as {
        profile?: LivingProfile;
        error?: string;
        tableReady?: boolean;
      };
      if (!res.ok) {
        throw new Error(data.error || "Failed to save Living Profile.");
      }
      if (data.tableReady === false) setTableReady(false);
      if (data.profile) setLiving(data.profile);
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
  const pendingEvidence =
    living?.provenance.filter(
      (p) => !p.memberConfirmed && p.sourceKind !== "member_declared"
    ) ?? [];

  return (
    <>
      <div className="mb-6 max-w-xl">
        <PersistenceStatus />
      </div>
      <section className="max-w-xl">
        <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
          Living Profile
        </p>
        <h1 className="mt-3 text-3xl font-semibold">Who you are becoming</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Single source of truth for identity. Readiness and coaching consume
          this — they do not invent a second profile.
        </p>
        {!tableReady && (
          <p className="mt-3 text-sm text-amber-200/90">
            Production note: apply{" "}
            <code className="text-xs">20260802_living_profiles.sql</code> so
            saves persist. Until then, identity edits may not stick.
          </p>
        )}
      </section>

      {error && (
        <p className="mt-4 max-w-xl text-sm text-red-300" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="mt-8 text-sm text-zinc-500">Loading Living Profile…</p>
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

            <label className="block" htmlFor="lp-display-name">
              <span className="text-sm text-zinc-300">Display name</span>
              <input
                id="lp-display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={saving}
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 disabled:opacity-60"
              />
            </label>

            <label className="block" htmlFor="lp-nickname">
              <span className="text-sm text-zinc-300">Preferred nickname</span>
              <input
                id="lp-nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                disabled={saving}
                placeholder="What should Forge call you?"
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 disabled:opacity-60"
              />
            </label>

            <label className="block" htmlFor="lp-purpose">
              <span className="text-sm text-zinc-300">
                Purpose / what matters now
              </span>
              <textarea
                id="lp-purpose"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                disabled={saving}
                rows={2}
                placeholder="Member-declared only — Forge will not invent this"
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 disabled:opacity-60"
              />
            </label>

            <label className="block" htmlFor="lp-principles">
              <span className="text-sm text-zinc-300">
                Personal principles
              </span>
              <textarea
                id="lp-principles"
                value={principles}
                onChange={(e) => setPrinciples(e.target.value)}
                disabled={saving}
                rows={2}
                placeholder="Comma-separated — your compass, not Forge’s"
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 disabled:opacity-60"
              />
            </label>

            <label className="block" htmlFor="lp-seasons">
              <span className="text-sm text-zinc-300">
                Life seasons / long-term challenges
              </span>
              <textarea
                id="lp-seasons"
                value={seasons}
                onChange={(e) => setSeasons(e.target.value)}
                disabled={saving}
                rows={2}
                placeholder="Comma-separated seasons you are in"
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 disabled:opacity-60"
              />
            </label>

            <label className="block" htmlFor="lp-coaching">
              <span className="text-sm text-zinc-300">
                Preferred coaching style
              </span>
              <input
                id="lp-coaching"
                value={coachingStyle}
                onChange={(e) => setCoachingStyle(e.target.value)}
                disabled={saving}
                placeholder="Warm and direct · gentle · challenge me"
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 disabled:opacity-60"
              />
            </label>

            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Living Profile"}
            </button>
            {saved && (
              <p className="text-sm text-emerald-300" role="status">
                Living Profile saved with provenance.
              </p>
            )}
          </form>

          {pendingEvidence.length > 0 && (
            <section className="mt-8 max-w-xl rounded-2xl border border-dashed border-white/15 bg-black/20 p-5">
              <h2 className="text-sm font-medium text-zinc-200">
                Pending evidence (not identity)
              </h2>
              <p className="mt-2 text-xs leading-5 text-zinc-500">
                Session observations waiting for confirmation. They do not
                overwrite who you are becoming.
              </p>
              <ul className="mt-3 space-y-2 text-sm text-zinc-400">
                {pendingEvidence.slice(0, 5).map((p) => (
                  <li key={p.id}>
                    <span className="text-zinc-500">{p.fieldPath}:</span>{" "}
                    {p.claim}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-10 max-w-xl">
            <h2 className="text-lg font-semibold">Session history</h2>
            <p className="mt-2 text-sm text-zinc-400">
              Activity only — not a second identity store.{" "}
              <Link href="/app/dashboard" className="text-zinc-300 underline">
                Open Activity
              </Link>
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
                      {formatSessionWhen(
                        session.completedAt ?? session.startedAt
                      )}
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
