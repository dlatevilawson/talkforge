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
import type { LivingProfile } from "@/lib/system1/types";
import {
  TRAINING_FOCUS_OPTIONS,
  type TrainingFocusOption,
} from "@/lib/system2/training-focus";
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

function formatDuration(seconds?: number | null): string | null {
  if (seconds == null || !Number.isFinite(seconds) || seconds <= 0) return null;
  const total = Math.round(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  if (m <= 0) return `${s}s`;
  return `${m}m ${String(s).padStart(2, "0")}s`;
}

function poiseLabel(score?: number | null): string | null {
  if (typeof score !== "number" || !Number.isFinite(score)) return null;
  if (score >= 80) return "Poise: High";
  if (score >= 60) return "Poise: Steady";
  return "Poise: Building";
}

/** Prefer real scenario titles; rename generic voice defaults. */
function sessionDisplayTitle(session: PracticeSession): string {
  const title = session.scenarioTitle?.replace(/\s+/g, " ").trim() || "";
  const lower = title.toLowerCase();
  if (
    !title ||
    lower === "voice practice with forge" ||
    lower === "practice" ||
    lower === "hello" ||
    lower.startsWith("voice practice")
  ) {
    return session.modality === "voice"
      ? "Open Rehearsal"
      : "Unstructured Practice Rep";
  }
  if (
    lower.includes("what brings you") ||
    lower.includes("something on my mind") ||
    lower === "custom scenario"
  ) {
    return "Custom Scenario";
  }
  return title;
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

/**
 * Living Profile surface — SSOT for member-declared identity (OWN-001).
 * Goal / training focus uses visual Machines cards (IV-UX-009).
 */
export default function ProfilePage() {
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [user, setUser] = useState<TalkForgeUser | null>(null);
  const [living, setLiving] = useState<LivingProfile | null>(null);
  const [tableReady, setTableReady] = useState(true);
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [sessions, setSessions] = useState<PracticeSession[]>([]);
  const [longestSessionSeconds, setLongestSessionSeconds] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
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
            setSessions([]);
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
        setSessions(history.slice(0, 10));
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

  function applyFocus(option: TrainingFocusOption) {
    setSelectedFocusId(option.id);
    setPurpose(option.purposeStatement);
    setSeasons(option.seasonLabel);
    setSaved(false);
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);

    try {
      const nextDisplayName = displayName.trim() || "Member";
      const selected = TRAINING_FOCUS_OPTIONS.find(
        (option) => option.id === selectedFocusId
      );

      const principleLines = principles
        .split(/[\n,]/)
        .map((s) => s.trim())
        .filter(Boolean);

      const seasonLabels = selected
        ? [selected.seasonLabel]
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
          purposeStatement: selected?.purposeStatement ?? purpose,
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
          matchFocusOption(data.profile.purposeStatement)?.id ?? selectedFocusId
        );
        setSeasons((data.profile.seasons ?? []).map((s) => s.label).join(", "));
      }
      const updated = await updateDisplayName(nextDisplayName);
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

  return (
    <>
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
        <>
          <form onSubmit={handleSave} className="mt-8 space-y-8">
            <div id="goal" className="scroll-mt-28">
              <TrainingFocusPicker
                selectedId={selectedFocusId}
                onSelect={applyFocus}
                title="Select an Active Focus Scenario"
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
                      disabled={saving}
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
                      disabled={saving}
                      placeholder="Warm and direct · gentle · challenge me"
                      className="mt-2 w-full rounded-xl border border-white/10 bg-black/40 px-4 py-3 text-sm text-white outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400 disabled:opacity-60"
                    />
                  </label>
                </div>
              </details>

              <div className={pickerStyles.actions}>
                <button
                  type="submit"
                  disabled={saving}
                  className={pickerStyles.primary}
                >
                  {saving ? "Saving..." : "Save Living Profile"}
                </button>
                <Link href="/app" className={pickerStyles.secondary}>
                  Back to training
                </Link>
              </div>
              {saved && (
                <p className="text-sm text-emerald-300" role="status">
                  Saved.
                </p>
              )}
            </div>
          </form>

          <section className="mt-10 max-w-3xl">
            <div className="flex items-end justify-between gap-3">
              <h2 className="text-lg font-semibold tracking-tight">
                Recent practice
              </h2>
              <Link
                href="/app/dashboard"
                className="text-sm text-[#c9a95f] underline-offset-4 hover:underline"
              >
                See all
              </Link>
            </div>
            {sessions.length === 0 ? (
              <p className="mt-4 text-sm text-zinc-500">
                No completed sessions yet.
              </p>
            ) : (
              <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {sessions.map((session) => {
                  const title = sessionDisplayTitle(session);
                  const duration = formatDuration(session.durationSeconds);
                  const poise = poiseLabel(session.averageScore);
                  return (
                    <li key={session.id}>
                      <Link
                        href="/app/dashboard"
                        className="group relative flex aspect-square flex-col justify-between rounded-[1.35rem] border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-4 transition hover:border-white/20 hover:bg-white/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9a95f]"
                      >
                        <span className="flex items-start justify-between gap-2">
                          <span className="rounded-full border border-white/10 bg-white/[0.05] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.12em] text-zinc-400">
                            {session.modality === "voice" ? "Voice" : "Text"}
                          </span>
                          <span
                            className="grid h-7 w-7 place-items-center rounded-full bg-white/90 text-black transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                            aria-hidden
                          >
                            <svg viewBox="0 0 20 20" className="h-3 w-3">
                              <path
                                d="M5 15 15 5M8 5h7v7"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </span>
                        </span>
                        <span>
                          <span className="line-clamp-3 text-[0.92rem] font-semibold leading-snug tracking-tight text-white">
                            {title}
                          </span>
                          <span className="mt-2 flex flex-wrap items-center gap-1.5">
                            {duration ? (
                              <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-[#e0c07a]">
                                {duration}
                              </span>
                            ) : null}
                            {poise ? (
                              <span className="rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em] text-zinc-300">
                                {poise}
                              </span>
                            ) : null}
                            <span className="text-xs text-zinc-500">
                              {formatSessionWhen(
                                session.completedAt ?? session.startedAt
                              )}
                            </span>
                          </span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
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
            disabled={resetting}
            className="rounded-full border border-red-400/30 px-5 py-3 text-sm text-red-200 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {resetting ? "Deleting TalkForge data…" : "Delete TalkForge data"}
          </button>
        </div>
      )}
    </>
  );
}
