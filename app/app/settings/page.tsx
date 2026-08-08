"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  emptyCoachMemory,
  parseMemoryList,
} from "@/lib/coach/memory";
import type { CoachMemory, LearningStyle } from "@/lib/coach/types";
import {
  getCoachMemory,
  getUser,
  saveCoachMemory,
} from "@/lib/storage";

type SessionPayload = {
  authenticated?: boolean;
  email?: string | null;
  displayName?: string | null;
  role?: string | null;
  profile?: {
    emailVerified?: boolean;
    accountStatus?: string;
    onboardingComplete?: boolean;
  } | null;
};

/** Coaching pressure UI — stored on CoachMemory.learningStyle (continuity, not identity). */
const PRESSURE_OPTIONS: Array<{ value: LearningStyle; label: string }> = [
  {
    value: "challenge_first",
    label: "Direct & High Tension (Recommended)",
  },
  { value: "practice_first", label: "Balanced & Measured" },
  { value: "reflect_first", label: "Supportive & Low Pressure" },
];

function normalizePressure(value: LearningStyle): LearningStyle {
  if (value === "challenge_first" || value === "practice_first" || value === "reflect_first") {
    return value;
  }
  // Legacy example_first → balanced; unset stays unset until member chooses.
  if (value === "example_first") return "practice_first";
  return "";
}

/**
 * Settings = account credentials + coaching mechanics preferences.
 * Identity (purpose, principles, seasons, nickname) lives on Living Profile.
 */
export default function SettingsPage() {
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [memory, setMemory] = useState<CoachMemory | null>(null);
  const [triggers, setTriggers] = useState("");
  const [learningStyle, setLearningStyle] = useState<LearningStyle>("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [sessionRes, user] = await Promise.all([
          fetch("/api/auth/session").then(
            (r) => r.json() as Promise<SessionPayload>
          ),
          getUser().catch(() => null),
        ]);
        if (cancelled) return;
        setSession(sessionRes);

        if (user?.id) {
          const existing =
            (await getCoachMemory(user.id).catch(() => null)) ??
            emptyCoachMemory(user.id, user.displayName);
          if (cancelled) return;
          setMemory(existing);
          setTriggers(existing.emotionalTriggers.join(", "));
          setLearningStyle(normalizePressure(existing.learningStyle));
        }
      } catch {
        if (!cancelled) setSession(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSaveContinuity(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveMsg("");
    setSaveError("");

    try {
      const user = await getUser();
      if (!user?.id) {
        throw new Error("Sign in to save coaching preferences.");
      }
      const base = memory ?? emptyCoachMemory(user.id, user.displayName);
      const next: CoachMemory = {
        ...base,
        userId: user.id,
        displayName: user.displayName || base.displayName,
        emotionalTriggers: parseMemoryList(triggers),
        learningStyle: normalizePressure(learningStyle),
        updatedAt: new Date().toISOString(),
      };
      await saveCoachMemory(next);
      setMemory(next);
      setSaveMsg("Coaching preferences saved.");
    } catch (err) {
      setSaveError(
        err instanceof Error ? err.message : "Could not save preferences."
      );
    } finally {
      setSaving(false);
    }
  }

  const email = session?.email?.trim() || "—";
  const name = session?.displayName?.trim() || "—";
  const verified = Boolean(session?.profile?.emailVerified);
  const status = session?.profile?.accountStatus || "—";

  return (
    <div className="mx-auto max-w-xl space-y-8 pb-16">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#c9a95f]">
          Account
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-white">
          Settings
        </h1>
        <p className="max-w-xl text-sm leading-6 text-neutral-400">
          Manage account credentials, communication preferences, and Forge
          coaching behavior.
        </p>
      </header>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading account…</p>
      ) : (
        <div className="space-y-6">
          {/* Card 1: Account & Credentials */}
          <section className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-white">
              Account & Credentials
            </h2>
            <p className="mt-1.5 text-xs text-neutral-500">
              Sign-in identity and password controls for this membership.
            </p>

            <dl className="mt-6 space-y-5 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-neutral-500">
                  Email
                </dt>
                <dd className="mt-1.5 text-zinc-100">{email}</dd>
                <p className="mt-1.5 text-xs text-neutral-500">
                  {verified ? "Email verified" : "Email not verified"}
                  {status !== "—" ? ` · Status: ${status}` : ""}
                </p>
                {!verified ? (
                  <Link
                    href={`/verify-email?email=${encodeURIComponent(session?.email || "")}`}
                    className="mt-2 inline-block text-sm text-[#c9a95f] underline-offset-4 hover:underline"
                  >
                    Verify email
                  </Link>
                ) : null}
              </div>

              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-neutral-500">
                  Display name
                </dt>
                <dd className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <span className="text-zinc-100">{name}</span>
                  <Link
                    href="/app/profile"
                    className="text-sm font-medium text-[#c9a95f] underline-offset-4 hover:underline"
                  >
                    Edit Living Profile →
                  </Link>
                </dd>
              </div>

              <div>
                <dt className="text-xs uppercase tracking-[0.14em] text-neutral-500">
                  Password controls
                </dt>
                <dd className="mt-2 flex flex-wrap gap-x-4 gap-y-2">
                  <Link
                    href="/change-password?next=/app/settings"
                    className="text-sm text-zinc-200 underline-offset-4 hover:underline"
                  >
                    Change password
                  </Link>
                  <Link
                    href="/forgot-password"
                    className="text-sm text-neutral-400 underline-offset-4 hover:underline"
                  >
                    Reset via email
                  </Link>
                </dd>
              </div>
            </dl>
          </section>

          {/* Card 2: Coaching Mechanics */}
          <section className="rounded-2xl border border-neutral-800 bg-neutral-900/50 p-5 sm:p-6">
            <h2 className="text-lg font-semibold text-white">
              Coaching Mechanics & Continuity
            </h2>
            <p className="mt-1.5 text-xs leading-5 text-neutral-500">
              Customize how Forge calibrates pressure, tone, and pacing during
              practice reps.
            </p>

            <form className="mt-6 space-y-5" onSubmit={handleSaveContinuity}>
              <Field
                label="Pressure Points & Hesitation Triggers"
                hint="Specific conversational dynamics where you tend to freeze or yield status (e.g., interruptions, defensive pushback)."
              >
                <textarea
                  value={triggers}
                  onChange={(e) => setTriggers(e.target.value)}
                  rows={3}
                  placeholder="Interruptions, status challenges, defensive pushback…"
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-zinc-100 outline-none ring-[#c9a95f]/35 focus:ring-2"
                />
              </Field>

              <Field label="Coaching Pressure Level">
                <select
                  value={learningStyle}
                  onChange={(e) =>
                    setLearningStyle(e.target.value as LearningStyle)
                  }
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-zinc-100 outline-none ring-[#c9a95f]/35 focus:ring-2"
                >
                  <option value="">Select coaching pressure</option>
                  {PRESSURE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </Field>

              {saveError ? (
                <p className="text-sm text-red-300" role="alert">
                  {saveError}
                </p>
              ) : null}
              {saveMsg ? (
                <p className="text-sm text-emerald-300/90" role="status">
                  {saveMsg}
                </p>
              ) : null}

              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save Preferences"}
              </button>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-zinc-300">{label}</span>
      <div className="mt-2">{children}</div>
      {hint ? <p className="mt-1.5 text-xs leading-5 text-neutral-500">{hint}</p> : null}
    </label>
  );
}
