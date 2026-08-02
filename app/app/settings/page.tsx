"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { destroySession } from "@/lib/auth/client";
import { trackAuthEvent } from "@/lib/auth/analytics";
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

const LEARNING_OPTIONS: Array<{ value: LearningStyle; label: string }> = [
  { value: "", label: "Not set yet" },
  { value: "practice_first", label: "Practice first — learn by doing" },
  { value: "reflect_first", label: "Reflect first — think, then try" },
  { value: "example_first", label: "Example first — show me, then I’ll try" },
  { value: "challenge_first", label: "Challenge first — stretch me gently" },
];

/**
 * Settings = account + coach continuity preferences only.
 * Identity (purpose, principles, seasons, nickname) lives on Living Profile.
 */
export default function SettingsPage() {
  const router = useRouter();
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
          setLearningStyle(existing.learningStyle);
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

  async function handleSignOut() {
    trackAuthEvent("auth_logout");
    await destroySession();
    router.push("/");
    router.refresh();
  }

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
      // Continuity-only writes. Identity fields are not updated here (OWN-001).
      const next: CoachMemory = {
        ...base,
        userId: user.id,
        displayName: user.displayName || base.displayName,
        emotionalTriggers: parseMemoryList(triggers),
        learningStyle,
        updatedAt: new Date().toISOString(),
      };
      await saveCoachMemory(next);
      setMemory(next);
      setSaveMsg(
        "Continuity preferences saved. Identity lives on your Living Profile."
      );
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
    <div>
      <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
      <p className="mt-3 max-w-xl text-zinc-400">
        Account controls and coach continuity preferences. Who you are becoming
        is edited on your Living Profile — not here.
      </p>

      {loading ? (
        <p className="mt-10 text-sm text-zinc-500">Loading account…</p>
      ) : (
        <div className="mt-10 max-w-xl space-y-10">
          <dl className="space-y-5 text-sm">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <dt className="text-zinc-500">Email</dt>
              <dd className="mt-1 text-zinc-100">{email}</dd>
              <p className="mt-2 text-xs text-zinc-500">
                {verified ? "Email verified" : "Email not verified"}
                {status !== "—" ? ` · Status: ${status}` : ""}
              </p>
            </div>

            <div>
              <dt className="text-zinc-500">Display name</dt>
              <dd className="mt-1 text-zinc-200">{name}</dd>
            </div>

            <div>
              <dt className="text-zinc-500">Living Profile</dt>
              <dd className="mt-1">
                <Link href="/app/profile" className="text-blue-300 underline">
                  Edit purpose, principles, seasons
                </Link>
              </dd>
            </div>

            <div>
              <dt className="text-zinc-500">Password</dt>
              <dd className="mt-1 space-x-4">
                <Link
                  href="/change-password?next=/app/settings"
                  className="text-blue-300 underline"
                >
                  Change password
                </Link>
                <Link href="/forgot-password" className="text-zinc-400 underline">
                  Reset via email
                </Link>
              </dd>
            </div>

            {!verified ? (
              <div>
                <dt className="text-zinc-500">Verification</dt>
                <dd className="mt-1">
                  <Link
                    href={`/verify-email?email=${encodeURIComponent(session?.email || "")}`}
                    className="text-blue-300 underline"
                  >
                    Verify email
                  </Link>
                </dd>
              </div>
            ) : null}
          </dl>

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
            <h2 className="text-lg font-medium text-zinc-100">
              Coach continuity
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              How Forge should pace and care for you in session. These are not
              identity facts — goals and purpose live on your{" "}
              <Link href="/app/profile" className="text-zinc-300 underline">
                Living Profile
              </Link>
              .
            </p>

            <form className="mt-6 space-y-5" onSubmit={handleSaveContinuity}>
              <Field
                label="Emotional triggers"
                hint="Moments that throw you — coaching care only, not identity"
              >
                <textarea
                  value={triggers}
                  onChange={(e) => setTriggers(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-zinc-100 outline-none ring-sky-400/40 focus:ring-2"
                />
              </Field>

              <Field label="Learning style">
                <select
                  value={learningStyle}
                  onChange={(e) =>
                    setLearningStyle(e.target.value as LearningStyle)
                  }
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-zinc-100 outline-none ring-sky-400/40 focus:ring-2"
                >
                  {LEARNING_OPTIONS.map((opt) => (
                    <option key={opt.value || "unset"} value={opt.value}>
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
                <p className="text-sm text-emerald-300/90">{saveMsg}</p>
              ) : null}

              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save continuity preferences"}
              </button>
            </form>
          </section>

          <div>
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="rounded-full border border-white/15 px-5 py-2.5 text-sm text-zinc-200 transition hover:bg-white/10"
            >
              Sign out
            </button>
          </div>
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
      <span className="text-zinc-400">{label}</span>
      <div className="mt-2">{children}</div>
      {hint ? <p className="mt-1.5 text-xs text-zinc-600">{hint}</p> : null}
    </label>
  );
}
