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

export default function SettingsPage() {
  const router = useRouter();
  const [session, setSession] = useState<SessionPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [memory, setMemory] = useState<CoachMemory | null>(null);
  const [nickname, setNickname] = useState("");
  const [goals, setGoals] = useState("");
  const [challenges, setChallenges] = useState("");
  const [triggers, setTriggers] = useState("");
  const [coachingStyle, setCoachingStyle] = useState("");
  const [learningStyle, setLearningStyle] = useState<LearningStyle>("");
  const [confidence, setConfidence] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [sessionRes, user] = await Promise.all([
          fetch("/api/auth/session").then((r) => r.json() as Promise<SessionPayload>),
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
          setNickname(existing.preferredNickname);
          setGoals(existing.communicationGoals.join(", "));
          setChallenges(existing.longTermChallenges.join(", "));
          setTriggers(existing.emotionalTriggers.join(", "));
          setCoachingStyle(existing.preferredCoachingStyle);
          setLearningStyle(existing.learningStyle);
          setConfidence(
            typeof existing.confidenceLevel === "number"
              ? String(existing.confidenceLevel)
              : ""
          );
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

  async function handleSaveMemory(e: React.FormEvent) {
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
      const conf = confidence.trim() ? Number(confidence) : null;
      const next: CoachMemory = {
        ...base,
        userId: user.id,
        displayName: user.displayName || base.displayName,
        preferredNickname: nickname.trim(),
        communicationGoals: parseMemoryList(goals),
        longTermChallenges: parseMemoryList(challenges),
        emotionalTriggers: parseMemoryList(triggers),
        preferredCoachingStyle: coachingStyle.trim(),
        learningStyle,
        confidenceLevel:
          conf != null && Number.isFinite(conf)
            ? Math.max(0, Math.min(100, Math.round(conf)))
            : null,
        updatedAt: new Date().toISOString(),
      };
      await saveCoachMemory(next);
      setMemory(next);
      setSaveMsg("Saved. Forge will use this next time you practice.");
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
        Your account and what Forge should remember about how you grow —
        so the next session feels continuous, not like starting over.
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
              <dt className="text-zinc-500">Profile</dt>
              <dd className="mt-1">
                <Link href="/app/profile" className="text-blue-300 underline">
                  Open profile
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
              What Forge remembers
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              Optional — only what makes the next conversation better. Forge
              also learns from your practice sessions automatically.
            </p>

            <form className="mt-6 space-y-5" onSubmit={handleSaveMemory}>
              <Field label="Preferred nickname">
                <input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="What should Forge call you?"
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-zinc-100 outline-none ring-sky-400/40 placeholder:text-zinc-600 focus:ring-2"
                />
              </Field>

              <Field
                label="Communication goals"
                hint="Comma-separated — e.g. stay calm in conflict, ask more questions"
              >
                <textarea
                  value={goals}
                  onChange={(e) => setGoals(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-zinc-100 outline-none ring-sky-400/40 placeholder:text-zinc-600 focus:ring-2"
                />
              </Field>

              <Field
                label="Long-term challenges"
                hint="What you’re working on over months, not one session"
              >
                <textarea
                  value={challenges}
                  onChange={(e) => setChallenges(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-zinc-100 outline-none ring-sky-400/40 focus:ring-2"
                />
              </Field>

              <Field
                label="Emotional triggers"
                hint="Moments that throw you — interruptions, silence, authority…"
              >
                <textarea
                  value={triggers}
                  onChange={(e) => setTriggers(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-zinc-100 outline-none ring-sky-400/40 focus:ring-2"
                />
              </Field>

              <Field label="Preferred coaching style">
                <input
                  value={coachingStyle}
                  onChange={(e) => setCoachingStyle(e.target.value)}
                  placeholder="Warm and direct · gentle · challenge me"
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-zinc-100 outline-none ring-sky-400/40 placeholder:text-zinc-600 focus:ring-2"
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

              <Field
                label="Confidence level (0–100)"
                hint="Optional self-rating — Forge also updates this from practice"
              >
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={confidence}
                  onChange={(e) => setConfidence(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-zinc-100 outline-none ring-sky-400/40 focus:ring-2"
                />
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
                {saving ? "Saving…" : "Save coaching memory"}
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
