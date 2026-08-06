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

/** Compact card label + mark for mobile session grids. */
function sessionCardVisual(session: PracticeSession): {
  mark: string;
  label: string;
} {
  const title = session.scenarioTitle.trim() || "Practice";
  const lower = title.toLowerCase();
  if (session.modality === "voice" || lower.includes("voice")) {
    return { mark: "🎙️", label: shortSessionLabel(title, "Voice practice") };
  }
  if (lower.includes("executive") || lower.includes("update")) {
    return { mark: "🎯", label: shortSessionLabel(title, "Executive") };
  }
  if (lower.includes("boundary") || lower.includes("saying no")) {
    return { mark: "🛡️", label: shortSessionLabel(title, "Boundaries") };
  }
  if (lower.includes("empathy") || lower.includes("emotional")) {
    return { mark: "🤝", label: shortSessionLabel(title, "Empathy") };
  }
  if (lower.includes("negotiat") || lower.includes("objection")) {
    return { mark: "⚖️", label: shortSessionLabel(title, "Negotiation") };
  }
  if (lower.includes("interrupt")) {
    return { mark: "🔁", label: shortSessionLabel(title, "Interruptions") };
  }
  if (lower.includes("conflict") || lower.includes("pressure")) {
    return { mark: "🔥", label: shortSessionLabel(title, "Conflict") };
  }
  if (lower.includes("phone") || lower.includes("call")) {
    return { mark: "📞", label: shortSessionLabel(title, "Phone") };
  }
  if (lower.includes("bring") || lower.includes("forge")) {
    return { mark: "✨", label: shortSessionLabel(title, "With Forge") };
  }
  if (lower.includes("showed up") || lower.includes("practice")) {
    return { mark: "💪", label: shortSessionLabel(title, "Practice") };
  }
  return { mark: "💬", label: shortSessionLabel(title, "Conversation") };
}

function shortSessionLabel(title: string, fallback: string): string {
  const clean = title.replace(/\s+/g, " ").trim();
  if (clean.length <= 28) return clean;
  return fallback;
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
      <section className="max-w-3xl">
        <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
          Living Profile
        </p>
        <h1 className="mt-3 text-3xl font-semibold">What is your goal?</h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400">
          Tap a Machine to set your training focus — optional, visual, and
          changeable anytime.
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
            <div id="goal" className="scroll-mt-24">
              <TrainingFocusPicker
                selectedId={selectedFocusId}
                onSelect={applyFocus}
                eyebrow="Optional"
                title="Choose a training focus"
                subtitle="One tap sets your goal. Skip the forms — you can still Begin from Home without a focus."
              />
              {selectedFocusId ? (
                <p className="mt-3 text-sm text-[#c9a95f]">
                  Selected:{" "}
                  {
                    TRAINING_FOCUS_OPTIONS.find((o) => o.id === selectedFocusId)
                      ?.title
                  }
                </p>
              ) : (
                <p className={pickerStyles.hint}>
                  No focus selected yet — that’s fine.
                </p>
              )}
            </div>

            <div className="max-w-xl space-y-5 rounded-3xl border border-white/10 bg-white/5 p-6">
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
                  const visual = sessionCardVisual(session);
                  return (
                    <li key={session.id}>
                      <Link
                        href="/app/dashboard"
                        className="flex aspect-square flex-col justify-between rounded-[1.35rem] border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.02] p-4 transition hover:border-white/20 hover:bg-white/[0.08] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#c9a95f]"
                      >
                        <span
                          className="grid h-11 w-11 place-items-center rounded-2xl bg-white/[0.06] text-2xl leading-none"
                          aria-hidden
                        >
                          {visual.mark}
                        </span>
                        <span>
                          <span className="line-clamp-2 text-[0.95rem] font-semibold leading-snug tracking-tight text-white">
                            {visual.label}
                          </span>
                          <span className="mt-1.5 block text-xs text-zinc-500">
                            {formatSessionWhen(
                              session.completedAt ?? session.startedAt
                            )}
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
