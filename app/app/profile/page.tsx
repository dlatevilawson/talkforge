"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import TrainingFocusPicker from "@/app/components/TrainingFocusPicker";
import pickerStyles from "@/app/components/TrainingFocusPicker.module.css";
import { updateDisplayName } from "@/lib/auth";
import { IDENTITY_CHANGED_EVENT } from "@/lib/identity";
import {
  clearAllTalkForgeData,
  getProgressSummary,
  getUser,
  listSessions,
} from "@/lib/storage";
import { formatDuration } from "@/lib/system2/practice-history-display";
import type { LivingProfile } from "@/lib/system1/types";
import {
  TRAINING_FOCUS_OPTIONS,
  type TrainingFocusOption,
} from "@/lib/system2/training-focus";
import type { ProgressSummary, TalkForgeUser } from "@/lib/types";

function formatMemberSince(value: string | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function matchFocusOption(purpose: string): TrainingFocusOption | null {
  const trimmed = purpose.trim();
  if (!trimmed) return null;
  return (
    TRAINING_FOCUS_OPTIONS.find(
      (option) =>
        option.purposeStatement === trimmed ||
        trimmed.includes(option.title) ||
        trimmed.includes(option.blurb)
    ) ?? null
  );
}

function coachForgeHref(focus: TrainingFocusOption): string {
  const params = new URLSearchParams({
    start: "1",
    title: focus.title,
    focus: focus.id,
  });
  // /app/forge aliases Coach Forge (/app/practice) via next.config redirect.
  return `/app/forge?${params.toString()}`;
}

/**
 * Living Profile surface — SSOT for member-declared identity (OWN-001).
 * Active focus selection writes LP then routes into Coach Forge.
 * Session history lives exclusively on /app/history.
 */
export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<TalkForgeUser | null>(null);
  const [living, setLiving] = useState<LivingProfile | null>(null);
  const [tableReady, setTableReady] = useState(true);
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [longestSessionSeconds, setLongestSessionSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [enteringForge, setEnteringForge] = useState(false);
  const [resetting, setResetting] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [nickname, setNickname] = useState("");
  const [purpose, setPurpose] = useState("");
  const [principles, setPrinciples] = useState("");
  const [seasons, setSeasons] = useState("");
  const [coachingStyle, setCoachingStyle] = useState("");
  const [selectedFocusId, setSelectedFocusId] = useState<string | null>(null);

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
            setLongestSessionSeconds(0);
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
        let longest = 0;
        for (const session of history) {
          const d = session.durationSeconds;
          if (typeof d === "number" && d > longest) longest = d;
        }
        setLongestSessionSeconds(longest);
        setTableReady(lpRes.tableReady !== false);
        const profile = lpRes.profile ?? null;
        setLiving(profile);
        setDisplayName(profile?.displayName || current.displayName || "");
        setNickname(profile?.preferredNickname ?? "");
        const nextPurpose = profile?.purposeStatement ?? "";
        setPurpose(nextPurpose);
        setSelectedFocusId(matchFocusOption(nextPurpose)?.id ?? null);
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

  async function persistLivingProfile(focus: TrainingFocusOption | null) {
    const nextDisplayName = displayName.trim() || "Member";
    const principleLines = principles
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);

    const seasonLabels = focus
      ? [focus.seasonLabel]
      : seasons
          .split(/[\n,]/)
          .map((s) => s.trim())
          .filter(Boolean);

    const res = await fetch("/api/living-profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: nextDisplayName,
        preferredNickname: nickname,
        purposeStatement: focus?.purposeStatement ?? purpose,
        principleLines,
        seasonLabels,
        preferredCoachingStyle: coachingStyle,
        expectedVersion: living?.version ?? 0,
      }),
    });
    const data = (await res.json()) as {
      profile?: LivingProfile;
      error?: string;
      tableReady?: boolean;
      conflict?: boolean;
    };

    if (!res.ok) {
      if (data.conflict) {
        if (data.profile) {
          setLiving(data.profile);
          setDisplayName(data.profile.displayName);
          setNickname(data.profile.preferredNickname);
          setPurpose(data.profile.purposeStatement);
          setSelectedFocusId(
            matchFocusOption(data.profile.purposeStatement)?.id ?? null
          );
        } else {
          const reload = await fetch("/api/living-profile", {
            cache: "no-store",
          }).then(
            (r) => r.json() as Promise<{ profile?: LivingProfile | null }>
          );
          if (reload.profile) {
            setLiving(reload.profile);
            setDisplayName(reload.profile.displayName);
            setNickname(reload.profile.preferredNickname);
            setPurpose(reload.profile.purposeStatement);
            setSelectedFocusId(
              matchFocusOption(reload.profile.purposeStatement)?.id ?? null
            );
          }
        }
        throw new Error(
          "Your Living Profile changed in another session. Fields were refreshed — review and save again."
        );
      }
      throw new Error(data.error || "Failed to save Living Profile.");
    }

    if (data.tableReady === false) setTableReady(false);
    if (data.profile) {
      setLiving(data.profile);
      setPurpose(data.profile.purposeStatement);
      setSelectedFocusId(
        matchFocusOption(data.profile.purposeStatement)?.id ??
          focus?.id ??
          selectedFocusId
      );
      setSeasons((data.profile.seasons ?? []).map((s) => s.label).join(", "));
    }
    const updated = await updateDisplayName(nextDisplayName);
    setUser(updated);
    return data.profile ?? null;
  }

  async function handleSelectFocus(option: TrainingFocusOption) {
    if (saving || enteringForge) return;
    setSelectedFocusId(option.id);
    setPurpose(option.purposeStatement);
    setSeasons(option.seasonLabel);
    setError("");
    setSaving(true);
    setEnteringForge(true);
    try {
      await persistLivingProfile(option);
      window.location.assign(coachForgeHref(option));
    } catch (err) {
      setEnteringForge(false);
      setError(
        err instanceof Error
          ? err.message
          : "Could not set focus and open Coach Forge."
      );
      setSaving(false);
    }
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (saving || enteringForge) return;
    setSaving(true);
    setError("");

    try {
      const selected =
        TRAINING_FOCUS_OPTIONS.find((option) => option.id === selectedFocusId) ??
        null;
      await persistLivingProfile(selected);
      router.push("/app");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save profile."
      );
      setSaving(false);
    }
  }

  async function handleReset() {
    const confirmed = window.confirm(
      "Permanently delete your Living Profile, coaching memory, sessions, reports, reflections, and TalkForge coaching data stored on this device? Your login account will remain. Data stored only on other devices cannot be cleared here."
    );
    if (!confirmed) return;

    setResetting(true);
    setError("");
    try {
      await clearAllTalkForgeData();
      router.replace("/login");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete TalkForge data."
      );
    } finally {
      setResetting(false);
    }
  }

  const isAuthenticatedMember = Boolean(user && !user.isGuest);
  const busy = saving || enteringForge;

  return (
    <>
      {enteringForge ? (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-[#07070a] text-center"
          role="status"
          aria-live="polite"
        >
          <div>
            <div className="mx-auto h-20 w-20 rounded-full border border-[#d7b56a]/25 bg-[radial-gradient(circle,#29241a,#090a0b_68%)] shadow-[0_0_70px_rgba(198,151,67,.18)]" />
            <p className="mt-6 text-xs font-semibold uppercase tracking-[0.24em] text-[#c9a95f]">
              Coach Forge
            </p>
            <p className="mt-3 text-lg text-zinc-300">
              Setting your focus and joining Training Room…
            </p>
          </div>
        </div>
      ) : null}

      <section className="max-w-3xl scroll-mt-28">
        <p className="text-sm uppercase tracking-[0.24em] text-[#c9a95f]">
          Living Profile
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          What conversation are you preparing for?
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Select your current focus. Forge uses this to tailor your
          scenarios—changeable anytime.
        </p>
        {!tableReady && (
          <p className="mt-3 text-sm text-amber-200/90">
            Saving isn’t available right now. Try again in a moment.
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
        <form onSubmit={handleSave} className="mt-8 space-y-8">
          <div id="goal" className="scroll-mt-28">
            <TrainingFocusPicker
              selectedId={selectedFocusId}
              onSelect={(option) => {
                void handleSelectFocus(option);
              }}
              title="Select an Active Focus Scenario"
              subtitle="Tap a scenario to save it and open Coach Forge."
            />
            {selectedFocusId ? (
              <p className="mt-3 text-sm text-[#c9a95f]">
                Active focus:{" "}
                {
                  TRAINING_FOCUS_OPTIONS.find((o) => o.id === selectedFocusId)
                    ?.title
                }
              </p>
            ) : (
              <p className={pickerStyles.hint}>
                No active focus yet — you can still Begin from Home.
              </p>
            )}
          </div>

          <div className="max-w-xl space-y-5 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
            <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#c9a95f]">
                Member Presence Profile
              </h3>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-neutral-400">Total Practice Reps</p>
                  <p className="mt-1 text-xl font-bold text-white">
                    {progress?.sessionsCompleted ?? 0}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-neutral-400">Pressure Duration</p>
                  <p className="mt-1 text-xl font-bold text-white">
                    {formatDuration(longestSessionSeconds) ?? "—"}
                  </p>
                </div>
              </div>
              <dl className="mt-5 grid gap-3 border-t border-white/10 pt-4 text-sm text-zinc-300 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-neutral-500">Email</dt>
                  <dd className="mt-1 text-white">{user?.email || "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-neutral-500">Member since</dt>
                  <dd className="mt-1 text-white">
                    {formatMemberSince(user?.createdAt)}
                  </dd>
                </div>
              </dl>
            </div>

            <label className="block" htmlFor="lp-display-name">
              <span className="text-sm text-zinc-300">Display name</span>
              <input
                id="lp-display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={busy}
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 disabled:opacity-60"
              />
            </label>

            <label className="block" htmlFor="lp-nickname">
              <span className="text-sm text-zinc-300">Preferred nickname</span>
              <input
                id="lp-nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                disabled={busy}
                placeholder="What should Forge call you?"
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 disabled:opacity-60"
              />
            </label>

            <details className="rounded-2xl border border-white/10 bg-black/20 p-4">
              <summary className="cursor-pointer text-sm text-zinc-300">
                More details (optional)
              </summary>
              <div className="mt-4 space-y-4">
                <label className="block" htmlFor="lp-principles">
                  <span className="text-sm text-zinc-300">
                    Personal principles
                  </span>
                  <textarea
                    id="lp-principles"
                    value={principles}
                    onChange={(e) => setPrinciples(e.target.value)}
                    disabled={busy}
                    rows={2}
                    placeholder="Comma-separated — your compass, not Forge’s"
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
                    disabled={busy}
                    placeholder="Warm and direct · gentle · challenge me"
                    className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 disabled:opacity-60"
                  />
                </label>
              </div>
            </details>

            <div className={pickerStyles.actions}>
              <button
                type="submit"
                disabled={busy}
                className={pickerStyles.primary}
              >
                {saving && !enteringForge
                  ? "Saving..."
                  : "Save Living Profile"}
              </button>
              <Link href="/app" className={pickerStyles.secondary}>
                Back to training
              </Link>
            </div>
            <p className="text-xs text-zinc-500">
              Save updates your identity, then returns you to Home. Session
              history lives under{" "}
              <Link
                href="/app/history"
                className="text-zinc-400 underline-offset-4 hover:underline"
              >
                Training history
              </Link>
              .
            </p>
          </div>
        </form>
      ) : null}

      {isAuthenticatedMember && (
        <div className="mt-8 max-w-xl">
          <p className="mb-3 text-sm leading-6 text-zinc-400">
            Permanently deletes your Living Profile, coaching memory, practice
            history, reports, reflections, and coaching data stored on this
            device. Your login account remains. Other devices must be cleared
            separately.
          </p>
          <button
            type="button"
            onClick={() => void handleReset()}
            disabled={resetting || busy}
            className="rounded-full border border-red-400/30 px-5 py-3 text-sm text-red-200 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {resetting ? "Deleting TalkForge data…" : "Delete TalkForge data"}
          </button>
        </div>
      )}
    </>
  );
}
