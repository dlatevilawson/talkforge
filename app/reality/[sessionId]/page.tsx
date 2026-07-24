"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AppShell from "@/app/components/AppShell";
import { ensureGuestUser } from "@/lib/auth";
import { getSession } from "@/lib/storage";
import {
  getEvent,
  getEventIdForSession,
  getRealityCapture,
  saveRealityCapture,
} from "@/lib/transfer";
import type {
  ForgeEvent,
  PracticeSession,
  RealityCapture,
  RealityStatus,
} from "@/lib/types";

export default function RealityCapturePage() {
  const params = useParams<{ sessionId: string }>();
  const router = useRouter();
  const [session, setSession] = useState<PracticeSession | null>(null);
  const [event, setEvent] = useState<ForgeEvent | null>(null);
  const [existing, setExisting] = useState<RealityCapture | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [status, setStatus] = useState<RealityStatus>("happened");
  const [postponeReason, setPostponeReason] = useState("");
  const [wentBetter, setWentBetter] = useState("");
  const [brokeUnderPressure, setBrokeUnderPressure] = useState("");
  const [replayMoment, setReplayMoment] = useState("");
  const [outcomeSignal, setOutcomeSignal] =
    useState<RealityCapture["outcomeSignal"]>("unclear");
  const [readinessBefore, setReadinessBefore] = useState(5);
  const [readinessAfter, setReadinessAfter] = useState(6);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const current = await getSession(params.sessionId);
        const prior = getRealityCapture(params.sessionId);
        const eventId = getEventIdForSession(params.sessionId);
        const linked = eventId ? getEvent(eventId) : null;
        if (cancelled) return;
        setSession(current);
        setExisting(prior);
        setEvent(linked);
        if (prior) {
          setStatus(prior.status);
          setPostponeReason(prior.postponeReason ?? "");
          setWentBetter(prior.wentBetter);
          setBrokeUnderPressure(prior.brokeUnderPressure);
          setReplayMoment(prior.replayMoment);
          setOutcomeSignal(prior.outcomeSignal);
          setReadinessBefore(prior.readinessBefore ?? 5);
          setReadinessAfter(prior.readinessAfter ?? 6);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load session."
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
  }, [params.sessionId]);

  async function handleSave(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    if (!session) return;

    if (status === "postponed" && !postponeReason.trim()) {
      setError("Say why the conversation was postponed.");
      return;
    }

    if (
      (status === "happened" || status === "partial") &&
      (!wentBetter.trim() || !brokeUnderPressure.trim() || !replayMoment.trim())
    ) {
      setError("Complete the three reality fields — reality outranks simulation.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const user = await ensureGuestUser();
      saveRealityCapture({
        userId: user.id,
        sessionId: session.id,
        eventId: event?.id ?? getEventIdForSession(session.id),
        status,
        postponeReason:
          status === "postponed" ? postponeReason.trim() : undefined,
        wentBetter: wentBetter.trim() || "(postponed)",
        brokeUnderPressure: brokeUnderPressure.trim() || "(postponed)",
        replayMoment: replayMoment.trim() || "(postponed)",
        outcomeSignal: status === "postponed" ? "na" : outcomeSignal,
        readinessBefore,
        readinessAfter,
      });
      router.push("/progress");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save reality capture."
      );
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <p className="text-sm text-zinc-500">Loading…</p>
      </AppShell>
    );
  }

  if (!session) {
    return (
      <AppShell>
        <p className="text-zinc-400">Session not found.</p>
        <Link href="/dashboard" className="mt-4 inline-block text-blue-300">
          Back to dashboard
        </Link>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <section className="max-w-2xl">
        <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
          Reality capture · North Star
        </p>
        <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">
          What happened in the real conversation?
        </h1>
        <p className="mt-3 text-sm leading-6 text-zinc-400 sm:text-base">
          Reality completes the learning loop. Your answers update future
          practice — simulation never outranks what actually happened.
        </p>
        {event && (
          <p className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-300">
            Event: <span className="text-white">{event.title}</span> ·{" "}
            {event.whenLabel}
          </p>
        )}
        {existing && (
          <p className="mt-2 text-sm text-emerald-300/90">
            Prior capture on file — saving will update it.
          </p>
        )}
      </section>

      <form onSubmit={handleSave} className="mt-8 max-w-2xl space-y-6">
        <fieldset>
          <legend className="text-sm text-zinc-300">Did it happen?</legend>
          <div className="mt-3 flex flex-wrap gap-2">
            {(
              [
                ["happened", "Yes"],
                ["partial", "Partially"],
                ["postponed", "Postponed"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatus(value)}
                aria-pressed={status === value}
                className={`rounded-full px-4 py-2 text-sm ${
                  status === value
                    ? "bg-blue-500 text-white"
                    : "border border-white/15 text-zinc-300 hover:bg-white/10"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </fieldset>

        {status === "postponed" ? (
          <label className="block">
            <span className="text-sm text-zinc-300">Why postponed?</span>
            <textarea
              value={postponeReason}
              onChange={(e) => setPostponeReason(e.target.value)}
              rows={3}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
            />
          </label>
        ) : (
          <>
            <label className="block">
              <span className="text-sm text-zinc-300">
                What went better than practice?
              </span>
              <textarea
                value={wentBetter}
                onChange={(e) => setWentBetter(e.target.value)}
                rows={3}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
              />
            </label>
            <label className="block">
              <span className="text-sm text-zinc-300">
                What broke under real pressure?
              </span>
              <textarea
                value={brokeUnderPressure}
                onChange={(e) => setBrokeUnderPressure(e.target.value)}
                rows={3}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
              />
            </label>
            <label className="block">
              <span className="text-sm text-zinc-300">
                One moment to replay in the next simulation
              </span>
              <textarea
                value={replayMoment}
                onChange={(e) => setReplayMoment(e.target.value)}
                rows={3}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-400"
              />
            </label>
            <fieldset>
              <legend className="text-sm text-zinc-300">Outcome signal</legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {(
                  [
                    ["advanced", "Advanced"],
                    ["rejected", "Rejected"],
                    ["unclear", "Unclear"],
                    ["na", "N/A"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setOutcomeSignal(value)}
                    aria-pressed={outcomeSignal === value}
                    className={`rounded-full px-4 py-2 text-sm ${
                      outcomeSignal === value
                        ? "bg-blue-500 text-white"
                        : "border border-white/15 text-zinc-300 hover:bg-white/10"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
          </>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm text-zinc-300">
              Readiness before practice (1–10)
            </span>
            <input
              type="number"
              min={1}
              max={10}
              value={readinessBefore}
              onChange={(e) => setReadinessBefore(Number(e.target.value))}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"
            />
          </label>
          <label className="block">
            <span className="text-sm text-zinc-300">
              Readiness after / at the real moment (1–10)
            </span>
            <input
              type="number"
              min={1}
              max={10}
              value={readinessAfter}
              onChange={(e) => setReadinessAfter(Number(e.target.value))}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white"
            />
          </label>
        </div>

        {error && (
          <p className="text-sm text-red-300" role="alert">
            {error}
          </p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving}
            className="rounded-full bg-blue-500 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-400 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save reality capture"}
          </button>
          <Link
            href="/progress"
            className="rounded-full border border-white/15 px-6 py-3 text-sm text-zinc-200 hover:bg-white/10"
          >
            Skip for now
          </Link>
        </div>
      </form>
    </AppShell>
  );
}
