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
import {
  formatMilestonesText,
  formatOpenCommitmentsText,
  parseCommitmentsText,
  parseMilestonesText,
} from "@/lib/coach/purpose";
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
  const [northStar, setNorthStar] = useState("");
  const [lifeVision, setLifeVision] = useState("");
  const [become, setBecome] = useState("");
  const [compassRelationships, setCompassRelationships] = useState("");
  const [compassLearning, setCompassLearning] = useState("");
  const [compassHealth, setCompassHealth] = useState("");
  const [careerGoals, setCareerGoals] = useState("");
  const [familyGoals, setFamilyGoals] = useState("");
  const [healthGoals, setHealthGoals] = useState("");
  const [businessGoals, setBusinessGoals] = useState("");
  const [learningGoals, setLearningGoals] = useState("");
  const [milestonesText, setMilestonesText] = useState("");
  const [commitmentsText, setCommitmentsText] = useState("");
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
          setNorthStar(existing.northStar);
          setLifeVision(existing.lifeVision);
          setBecome(existing.personTheyWantToBecome);
          setCompassRelationships(existing.compassRelationships);
          setCompassLearning(existing.compassLearning);
          setCompassHealth(existing.compassHealth);
          setCareerGoals(existing.careerGoals.join(", "));
          setFamilyGoals(existing.familyGoals.join(", "));
          setHealthGoals(existing.healthGoals.join(", "));
          setBusinessGoals(existing.businessGoals.join(", "));
          setLearningGoals(existing.learningGoals.join(", "));
          setMilestonesText(formatMilestonesText(existing.lifeMilestones));
          setCommitmentsText(formatOpenCommitmentsText(existing.commitments));
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
        northStar: northStar.trim(),
        lifeVision: lifeVision.trim(),
        personTheyWantToBecome: become.trim(),
        compassRelationships: compassRelationships.trim(),
        compassLearning: compassLearning.trim(),
        compassHealth: compassHealth.trim(),
        careerGoals: parseMemoryList(careerGoals),
        familyGoals: parseMemoryList(familyGoals),
        healthGoals: parseMemoryList(healthGoals),
        businessGoals: parseMemoryList(businessGoals),
        learningGoals: parseMemoryList(learningGoals),
        lifeMilestones: parseMilestonesText(
          milestonesText,
          base.lifeMilestones
        ),
        commitments: parseCommitmentsText(
          commitmentsText,
          base.commitments
        ),
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
        Your account, how you grow, and the life you said you want to build —
        so Forge can protect your goals without ever deciding them for you.
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

              <div className="border-t border-white/10 pt-6">
                <h3 className="text-base font-medium text-zinc-100">
                  Life Compass
                </h3>
                <p className="mt-2 text-sm leading-6 text-zinc-500">
                  You declare what matters. Forge remembers and protects it —
                  never invents or judges. Not a task list.
                </p>
              </div>

              <Field
                label="North Star"
                hint="The life or work you’re building toward — e.g. Build TalkForge"
              >
                <input
                  value={northStar}
                  onChange={(e) => setNorthStar(e.target.value)}
                  placeholder="What are you building toward?"
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-zinc-100 outline-none ring-sky-400/40 placeholder:text-zinc-600 focus:ring-2"
                />
              </Field>

              <Field label="Relationships">
                <input
                  value={compassRelationships}
                  onChange={(e) => setCompassRelationships(e.target.value)}
                  placeholder="e.g. Family first"
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-zinc-100 outline-none ring-sky-400/40 placeholder:text-zinc-600 focus:ring-2"
                />
              </Field>

              <Field label="Learning">
                <input
                  value={compassLearning}
                  onChange={(e) => setCompassLearning(e.target.value)}
                  placeholder="e.g. Improve communication every week"
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-zinc-100 outline-none ring-sky-400/40 placeholder:text-zinc-600 focus:ring-2"
                />
              </Field>

              <Field label="Health">
                <input
                  value={compassHealth}
                  onChange={(e) => setCompassHealth(e.target.value)}
                  placeholder="e.g. Exercise consistently"
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-zinc-100 outline-none ring-sky-400/40 placeholder:text-zinc-600 focus:ring-2"
                />
              </Field>

              <Field
                label="Life vision"
                hint="Longer picture — optional"
              >
                <textarea
                  value={lifeVision}
                  onChange={(e) => setLifeVision(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-zinc-100 outline-none ring-sky-400/40 focus:ring-2"
                />
              </Field>

              <Field
                label="The person you want to become"
                hint="Forge may ask every few weeks if this still feels true"
              >
                <textarea
                  value={become}
                  onChange={(e) => setBecome(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-zinc-100 outline-none ring-sky-400/40 focus:ring-2"
                />
              </Field>

              <Field label="Career goals" hint="Comma-separated">
                <textarea
                  value={careerGoals}
                  onChange={(e) => setCareerGoals(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-zinc-100 outline-none ring-sky-400/40 focus:ring-2"
                />
              </Field>

              <Field label="Family goals" hint="Comma-separated">
                <textarea
                  value={familyGoals}
                  onChange={(e) => setFamilyGoals(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-zinc-100 outline-none ring-sky-400/40 focus:ring-2"
                />
              </Field>

              <Field label="Business goals" hint="Comma-separated">
                <textarea
                  value={businessGoals}
                  onChange={(e) => setBusinessGoals(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-zinc-100 outline-none ring-sky-400/40 focus:ring-2"
                />
              </Field>

              <Field label="Health goals" hint="Comma-separated">
                <textarea
                  value={healthGoals}
                  onChange={(e) => setHealthGoals(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-zinc-100 outline-none ring-sky-400/40 focus:ring-2"
                />
              </Field>

              <Field
                label="Learning goals"
                hint="Books you’re writing, skills you’re learning — comma-separated"
              >
                <textarea
                  value={learningGoals}
                  onChange={(e) => setLearningGoals(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-zinc-100 outline-none ring-sky-400/40 focus:ring-2"
                />
              </Field>

              <Field
                label="Life milestones"
                hint="One per line: Label · YYYY-MM-DD · optional note"
              >
                <textarea
                  value={milestonesText}
                  onChange={(e) => setMilestonesText(e.target.value)}
                  rows={3}
                  placeholder={"Anniversary · 2026-08-12\nDaughter starts school · 2026-09-02"}
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-zinc-100 outline-none ring-sky-400/40 placeholder:text-zinc-600 focus:ring-2"
                />
              </Field>

              <Field
                label="Open commitments"
                hint="Things you said you’d do — one per line. Forge asks how it went; never shames."
              >
                <textarea
                  value={commitmentsText}
                  onChange={(e) => setCommitmentsText(e.target.value)}
                  rows={3}
                  placeholder="Talk with my manager about the timeline"
                  className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-zinc-100 outline-none ring-sky-400/40 placeholder:text-zinc-600 focus:ring-2"
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
