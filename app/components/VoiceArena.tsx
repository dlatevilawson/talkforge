"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  connectRealtime,
  disconnectRealtime,
  recoverMicrophone,
  requestOpeningSpeech,
  resumeRemoteAudio,
  setMicrophoneEnabled,
  type MicFallbackReason,
  type RealtimeConnection,
} from "@/lib/ce/realtime";
import {
  CE_TRACK_TITLES,
  type CeTrack,
} from "@/lib/ce/session-config";
import {
  applyRealtimeTranscriptEvent,
  type TranscriptTurn,
} from "@/lib/ce/transcript";
import {
  createVoiceSessionId,
  saveVoiceTranscript,
  setActiveVoiceSessionId,
} from "@/lib/ce/transcript-store";
import { isCurrentVoiceLifecycle } from "@/lib/ce/voice-lifecycle";
import { voiceTurnsToConversationTurns } from "@/lib/coach/report";
import {
  completePracticeSession,
  createPracticeSession,
  persistActiveSession,
} from "@/lib/session";
import { getUser } from "@/lib/storage";
import type { PracticeSession } from "@/lib/types";

type VoiceArenaProps = {
  track?: CeTrack;
  eventTitle?: string;
  successCriteria?: string;
  autoStart?: boolean;
};

type Phase =
  | "idle"
  | "minting"
  | "connecting"
  | "speaking"
  | "listening"
  | "connected"
  | "momentum"
  | "error";

type Momentum = {
  strength: string;
  improve: string;
  nextAction: string;
  breakthrough?: string;
  biggestWeakness?: string;
  homework?: string;
  coachSummary?: string;
  overallScore?: number;
  confidence?: number;
  empathy?: number;
  listening?: number;
  clarity?: number;
};

export default function VoiceArena({
  track = "hello",
  eventTitle,
  successCriteria,
  autoStart = false,
}: VoiceArenaProps) {
  const connectionRef = useRef<RealtimeConnection | null>(null);
  const turnsRef = useRef<TranscriptTurn[]>([]);
  const voiceSessionIdRef = useRef<string | null>(null);
  const realtimeSessionIdRef = useRef<string | null>(null);
  const createdAtRef = useRef<string>("");
  const practiceSessionRef = useRef<PracticeSession | null>(null);
  const welcomeHintRef = useRef<string>("");
  const mountedRef = useRef(true);
  const lifecycleGenerationRef = useRef(0);
  const autoStartAttemptedRef = useRef(false);
  const beginButtonRef = useRef<HTMLButtonElement>(null);

  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [events, setEvents] = useState<string[]>([]);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [micMode, setMicMode] = useState<"microphone" | "silent_fallback" | null>(
    null
  );
  const [micFallbackReason, setMicFallbackReason] =
    useState<MicFallbackReason | null>(null);
  const [micRecoveryPending, setMicRecoveryPending] = useState(false);
  const [turns, setTurns] = useState<TranscriptTurn[]>([]);
  const [micLive, setMicLive] = useState(false);
  const [momentum, setMomentum] = useState<Momentum | null>(null);
  const [momentumLoading, setMomentumLoading] = useState(false);
  const [savedSessionId, setSavedSessionId] = useState<string | null>(null);
  const [sessionPersisted, setSessionPersisted] = useState(false);
  const [completionError, setCompletionError] = useState("");
  const [completionRetryPending, setCompletionRetryPending] = useState(false);
  const [welcomeLine, setWelcomeLine] = useState("");
  const [remoteAudioBlocked, setRemoteAudioBlocked] = useState(false);

  const showDevDiagnostics = process.env.NODE_ENV === "development";

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      lifecycleGenerationRef.current += 1;
      disconnectRealtime(connectionRef.current);
      connectionRef.current = null;
      setActiveVoiceSessionId(null);
    };
  }, []);

  function pushEvent(label: string) {
    setEvents((prev) =>
      [`${new Date().toISOString().slice(11, 19)} ${label}`, ...prev].slice(
        0,
        16
      )
    );
  }

  function persistTurns(nextTurns: TranscriptTurn[]) {
    const id = voiceSessionIdRef.current;
    if (!id) return;
    saveVoiceTranscript({
      voiceSessionId: id,
      realtimeSessionId: realtimeSessionIdRef.current,
      track,
      eventTitle,
      createdAt: createdAtRef.current,
      turns: nextTurns,
    });
    setActiveVoiceSessionId(id);

    const practice = practiceSessionRef.current;
    // Do not upsert after End — late writes were clearing completed_at.
    if (practice && !practice.completedAt) {
      const conversation = voiceTurnsToConversationTurns(nextTurns);
      void persistActiveSession(practice, conversation)
        .then((updated) => {
          if (!practiceSessionRef.current?.completedAt) {
            practiceSessionRef.current = updated;
          }
        })
        .catch((err) => {
          console.warn("[voice] persist session failed", err);
        });
    }
  }

  function handleServerEvent(event: Record<string, unknown>) {
    const type = typeof event.type === "string" ? event.type : "event";

    if (
      type.includes("audio") ||
      type === "response.created" ||
      type === "response.output_item.added"
    ) {
      setPhase((current) =>
        current === "connecting" || current === "speaking"
          ? "speaking"
          : current
      );
    }

    if (type === "response.done") {
      setPhase((current) =>
        current === "speaking"
          ? "listening"
          : current === "connecting"
            ? "connected"
            : current
      );
      pushEvent("Forge response complete");
    }

    if (type === "input_audio_buffer.speech_started") {
      setPhase("listening");
      pushEvent("Founder speech detected");
    }

    if (type === "error") {
      pushEvent(`Server error: ${JSON.stringify(event).slice(0, 120)}`);
      const serverError =
        event.error && typeof event.error === "object"
          ? (event.error as { message?: unknown }).message
          : null;
      setError(
        typeof serverError === "string"
          ? serverError
          : "Coach Forge hit a connection problem. Restart when you’re ready."
      );
    }

    const { turns: next, added } = applyRealtimeTranscriptEvent(
      turnsRef.current,
      event
    );
    if (added) {
      turnsRef.current = next;
      setTurns(next);
      persistTurns(next);
      pushEvent(
        `Transcript · ${added.role} #${added.turnIndex}: "${added.text.slice(0, 48)}${
          added.text.length > 48 ? "…" : ""
        }"`
      );
    }
  }

  async function handleStart() {
    if (phase === "minting" || phase === "connecting" || phase === "speaking") {
      return;
    }
    lifecycleGenerationRef.current += 1;

    setError("");
    setMicMode(null);
    setMicFallbackReason(null);
    setMicRecoveryPending(false);
    setTurns([]);
    turnsRef.current = [];
    setMicLive(false);
    setEvents([]);
    setMomentum(null);
    setSavedSessionId(null);
    setSessionPersisted(false);
    setCompletionError("");
    setCompletionRetryPending(false);
    setRemoteAudioBlocked(false);
    practiceSessionRef.current = null;
    setPhase("minting");
    pushEvent("Minting session…");

    const newVoiceId = createVoiceSessionId();
    voiceSessionIdRef.current = newVoiceId;
    createdAtRef.current = new Date().toISOString();

    try {
      disconnectRealtime(connectionRef.current);
      connectionRef.current = null;

      const scenarioTitle =
        eventTitle?.trim() || CE_TRACK_TITLES[track] || "Voice practice with Forge";

      const tokenRes = await fetch("/api/realtime/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          track,
          eventTitle,
          successCriteria,
        }),
      });
      const tokenData = (await tokenRes.json()) as {
        value?: string;
        session_id?: string | null;
        error?: string;
        memory?: {
          firstName?: string;
          isReturning?: boolean;
          welcomeHint?: string;
          lastScenarioTitle?: string;
        };
      };

      if (!tokenRes.ok || !tokenData.value) {
        throw new Error(tokenData.error || "Could not start session.");
      }

      realtimeSessionIdRef.current = tokenData.session_id ?? null;
      welcomeHintRef.current = tokenData.memory?.welcomeHint?.trim() || "";
      if (tokenData.memory?.isReturning && tokenData.memory.firstName) {
        setWelcomeLine(
          `Welcome back, ${tokenData.memory.firstName}${
            tokenData.memory.lastScenarioTitle
              ? ` · last: ${tokenData.memory.lastScenarioTitle}`
              : ""
          }`
        );
      } else {
        setWelcomeLine("");
      }
      setPhase("connecting");
      pushEvent("Connecting…");

      const connection = await connectRealtime({
        ephemeralKey: tokenData.value,
        onMicMode: (mode, reason) => {
          setMicMode(mode);
          setMicFallbackReason(reason);
          pushEvent(
            mode === "microphone" ? "Microphone ready" : "No mic — listen only"
          );
        },
        onRemoteTrack: () => {
          pushEvent("Forge audio connected");
          setPhase((current) =>
            current === "connecting" || current === "speaking"
              ? "speaking"
              : current
          );
        },
        onRemotePlayback: (state) => {
          setRemoteAudioBlocked(state === "blocked");
          pushEvent(
            state === "blocked"
              ? "Forge audio needs a tap"
              : "Forge audio playing"
          );
        },
        onConnectionState: (state) => {
          pushEvent(`Peer: ${state}`);
          if (state === "failed") {
            setError(
              "The Training Room lost its connection. Restart when you’re ready."
            );
            setPhase("error");
          }
        },
        onServerEvent: handleServerEvent,
      });

      connectionRef.current = connection;

      if (!connection.usedSilentMicFallback) {
        setMicrophoneEnabled(connection, false);
        setMicLive(false);
      }

      // Do not create permanent history until Realtime is connected.
      const practice = await createPracticeSession({
        scenarioId: `voice_${track}`,
        scenarioTitle,
        missionPrompt:
          successCriteria?.trim() ||
          "Practice clear, warm, confident communication out loud with Forge.",
        modality: "voice",
      });
      practiceSessionRef.current = practice;
      setSavedSessionId(practice.id);
      pushEvent(`Session saved · ${practice.id.slice(0, 8)}`);

      setPhase("speaking");
      requestOpeningSpeech(connection.dc, welcomeHintRef.current);
      pushEvent(
        tokenData.memory?.isReturning
          ? "Forge opening · returning member"
          : "Forge opening"
      );
    } catch (err) {
      console.error(err);
      disconnectRealtime(connectionRef.current);
      connectionRef.current = null;
      setPhase("error");
      setError(
        err instanceof Error ? err.message : "Could not start. Try again."
      );
      pushEvent("FAILED");
    }
  }

  useEffect(() => {
    if (!autoStart || autoStartAttemptedRef.current) return;
    autoStartAttemptedRef.current = true;
    beginButtonRef.current?.click();
  }, [autoStart]);

  async function handleResumeRemoteAudio() {
    const connection = connectionRef.current;
    if (!connection) return;
    const resumed = await resumeRemoteAudio(connection);
    setRemoteAudioBlocked(!resumed);
    if (!resumed) {
      setError(
        "Coach Forge audio is still blocked. Check this site’s sound setting and try again."
      );
    }
  }

  async function handleRecoverMicrophone() {
    const connection = connectionRef.current;
    if (!connection || !connection.usedSilentMicFallback || micRecoveryPending) {
      return;
    }
    const recoveryGeneration = lifecycleGenerationRef.current;
    const isCurrentRecovery = () =>
      isCurrentVoiceLifecycle(
        mountedRef.current,
        connectionRef.current,
        connection,
        lifecycleGenerationRef.current,
        recoveryGeneration
      );

    setMicRecoveryPending(true);
    setError("");
    pushEvent("Checking microphone…");
    const result = await recoverMicrophone(connection, isCurrentRecovery);
    if (!isCurrentRecovery()) return;
    setMicRecoveryPending(false);
    setMicFallbackReason(result.reason);
    if (result.recovered) {
      setMicMode("microphone");
      setMicLive(false);
      pushEvent("Microphone ready");
      return;
    }
    pushEvent("Microphone still unavailable");
  }

  function handleSpeakDown() {
    if (!connectionRef.current || connectionRef.current.usedSilentMicFallback) {
      return;
    }
    setMicrophoneEnabled(connectionRef.current, true);
    setMicLive(true);
    setPhase("listening");
  }

  function handleSpeakUp() {
    if (!connectionRef.current || connectionRef.current.usedSilentMicFallback) {
      return;
    }
    setMicrophoneEnabled(connectionRef.current, false);
    setMicLive(false);
  }

  async function persistCompletedVoiceSession(
    snapshot: TranscriptTurn[],
    wrap: Momentum
  ) {
    const practice = practiceSessionRef.current;
    if (!practice) {
      setCompletionError(
        "This session could not be linked to your history. Return home and begin a new rep."
      );
      return;
    }

    setCompletionRetryPending(true);
    setCompletionError("");
    try {
      const user = await getUser().catch(() => null);
      const conversation = voiceTurnsToConversationTurns(snapshot);
      const completed = await completePracticeSession(practice, conversation, {
        modality: "voice",
        momentum: wrap,
        displayName: user?.displayName,
      });
      practiceSessionRef.current = completed;
      setSavedSessionId(completed.id);
      setSessionPersisted(true);
      pushEvent("History saved · session report");
    } catch (err) {
      console.warn("[voice] complete session failed", err);
      pushEvent("History save failed");
      setCompletionError(
        "Your wrap is ready, but the session did not save. Check your connection and try again."
      );
    } finally {
      setCompletionRetryPending(false);
    }
  }

  async function handleStop() {
    // Snapshot transcript locally only — do not race completePracticeSession
    // with an in-flight persistActiveSession upsert.
    const id = voiceSessionIdRef.current;
    if (id && turnsRef.current.length > 0) {
      saveVoiceTranscript({
        voiceSessionId: id,
        realtimeSessionId: realtimeSessionIdRef.current,
        track,
        eventTitle,
        createdAt: createdAtRef.current,
        turns: turnsRef.current,
      });
    }
    lifecycleGenerationRef.current += 1;
    disconnectRealtime(connectionRef.current);
    connectionRef.current = null;
    setActiveVoiceSessionId(null);
    setMicLive(false);
    pushEvent("Ended");

    const snapshot = [...turnsRef.current];
    setPhase("momentum");
    setMomentumLoading(true);
    setMomentum(null);

    let wrap: Momentum = {
      strength: "You showed up and practiced — that already builds readiness.",
      improve:
        "Next time, say one full thought so we can coach something specific.",
      nextAction:
        "Try one clearer opening line in your next real conversation.",
    };

    try {
      const res = await fetch("/api/session-momentum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          turns: snapshot,
          eventTitle,
        }),
      });
      const data = (await res.json()) as Momentum;
      wrap = {
        strength:
          data.strength ||
          "You showed up and practiced — that already builds readiness.",
        improve:
          data.improve ||
          "Next time, say one full thought so we can coach something specific.",
        nextAction:
          data.nextAction ||
          "Try one clearer opening line in your next real conversation.",
        breakthrough: data.breakthrough,
        biggestWeakness: data.biggestWeakness,
        homework: data.homework,
        coachSummary: data.coachSummary,
        overallScore: data.overallScore,
        confidence: data.confidence,
        empathy: data.empathy,
        listening: data.listening,
        clarity: data.clarity,
      };
      setMomentum(wrap);
    } catch {
      setMomentum(wrap);
    }

    await persistCompletedVoiceSession(snapshot, wrap);

    setMomentumLoading(false);
  }

  const busy =
    phase === "minting" || phase === "connecting" || phase === "speaking";
  const inSession =
    phase === "speaking" ||
    phase === "listening" ||
    phase === "connected" ||
    phase === "connecting" ||
    phase === "minting";

  const lastForge = [...turns].reverse().find((t) => t.role === "forge");
  const lastFounder = [...turns].reverse().find((t) => t.role === "founder");

  const presenceLabel =
    phase === "idle"
      ? "Coach Forge"
      : phase === "minting" || phase === "connecting"
        ? "Connecting…"
        : phase === "speaking"
          ? "Forge is speaking"
          : micLive
            ? "Listening to you"
            : phase === "error"
              ? "Something went wrong"
              : phase === "momentum"
                ? "Nice work"
                : "Your turn";

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[#07070a] text-white">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(59,130,246,0.18),transparent_55%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_80%,rgba(255,255,255,0.04),transparent_45%)]"
        aria-hidden
      />

      <div className="relative mx-auto flex min-h-[100dvh] max-w-3xl flex-col px-5 py-6 sm:px-8">
        <header className="flex items-center justify-between gap-3">
          <Link
            href="/app"
            className="text-sm text-white/45 transition hover:text-white/80"
          >
            TalkForge
          </Link>
          {inSession ? (
            <button
              type="button"
              onClick={() => void handleStop()}
              className="text-sm text-white/45 transition hover:text-white/80"
            >
              End
            </button>
          ) : phase === "momentum" ? (
            <span className="text-sm text-white/30">Session wrap</span>
          ) : (
            <span className="text-sm text-white/30">Practice floor</span>
          )}
        </header>

        <section className="flex flex-1 flex-col items-center justify-center pb-8 pt-6 text-center">
          {phase === "idle" ? (
            <>
              <p className="text-sm uppercase tracking-[0.28em] text-white/40">
                Coach Forge
              </p>
              <h1 className="mt-5 max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">
                {eventTitle?.trim() || "I’m ready when you are"}
              </h1>
              <p className="mt-5 max-w-md text-base leading-7 text-white/55">
                You don’t have to perform here. I’ll listen first. Hold to speak
                when you’re ready — we’ll figure it out together.
              </p>
              {welcomeLine ? (
                <p className="mt-3 max-w-md text-sm leading-6 text-blue-200/80">
                  {welcomeLine}
                </p>
              ) : null}
              {successCriteria?.trim() && (
                <p className="mt-4 max-w-md text-sm leading-6 text-white/40">
                  You’re aiming for: {successCriteria.trim()}
                </p>
              )}
              <button
                ref={beginButtonRef}
                type="button"
                onClick={handleStart}
                className="mt-10 rounded-full bg-white px-10 py-4 text-sm font-semibold text-black transition hover:bg-white/90"
              >
                Begin
              </button>
            </>
          ) : phase === "momentum" ? (
            <>
              <div className="flex h-28 w-28 items-center justify-center rounded-full bg-blue-500/20 shadow-[0_0_50px_rgba(59,130,246,0.25)]">
                <span className="text-sm font-medium text-white/90">
                  {presenceLabel}
                </span>
              </div>
              <h1 className="mt-8 max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
                Leave with momentum
              </h1>
              <p className="mt-3 max-w-md text-base leading-7 text-white/50">
                One strength. One improvement. One thing to try in the real
                conversation.
              </p>

              {momentumLoading ? (
                <p className="mt-10 text-sm text-white/45">
                  Forge is wrapping up your session…
                </p>
              ) : momentum ? (
                <div className="mt-10 w-full max-w-xl space-y-5 text-left">
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/40">
                      Strength
                    </p>
                    <p className="mt-2 text-base leading-7 text-white/90">
                      {momentum.strength}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-white/40">
                      Improve
                    </p>
                    <p className="mt-2 text-base leading-7 text-white/90">
                      {momentum.improve}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-blue-400/30 bg-blue-500/10 px-5 py-4">
                    <p className="text-xs uppercase tracking-[0.2em] text-blue-200/70">
                      Try next
                    </p>
                    <p className="mt-2 text-base leading-7 text-white">
                      {momentum.nextAction}
                    </p>
                  </div>
                </div>
              ) : null}

              {sessionPersisted ? (
                <p className="mt-8 text-xs uppercase tracking-[0.18em] text-emerald-300/80">
                  Saved to your history
                </p>
              ) : null}

              {completionError ? (
                <div className="mt-6 max-w-md">
                  <p className="text-sm text-red-300" role="alert">
                    {completionError}
                  </p>
                  {savedSessionId ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (momentum) {
                          void persistCompletedVoiceSession(
                            [...turnsRef.current],
                            momentum
                          );
                        }
                      }}
                      disabled={completionRetryPending}
                      className="mt-3 rounded-full border border-red-200/20 px-5 py-2.5 text-sm text-red-100 transition hover:bg-red-100/10 disabled:opacity-50"
                    >
                      {completionRetryPending ? "Saving…" : "Try saving again"}
                    </button>
                  ) : null}
                </div>
              ) : null}

              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                {savedSessionId ? (
                  <Link
                    href={`/app/reflect/${savedSessionId}`}
                    className="rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black transition hover:bg-white/90"
                  >
                    Reflect on this rep
                  </Link>
                ) : (
                  <Link
                    href="/app"
                    className="rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black transition hover:bg-white/90"
                  >
                    Return home and begin again
                  </Link>
                )}
                <Link
                  href="/app"
                  className="rounded-full border border-white/10 px-6 py-3.5 text-sm text-white/50 transition hover:bg-white/10"
                >
                  Done for now
                </Link>
              </div>
            </>
          ) : (
            <>
              <div
                className={`relative flex h-40 w-40 items-center justify-center rounded-full transition duration-500 sm:h-48 sm:w-48 ${
                  phase === "speaking"
                    ? "bg-blue-500/25 shadow-[0_0_80px_rgba(59,130,246,0.35)]"
                    : micLive
                      ? "bg-amber-400/20 shadow-[0_0_60px_rgba(251,191,36,0.25)]"
                      : "bg-white/8"
                }`}
                aria-live="polite"
              >
                <div
                  className={`absolute inset-3 rounded-full border ${
                    phase === "speaking"
                      ? "animate-pulse border-blue-300/40"
                      : micLive
                        ? "border-amber-200/40"
                        : "border-white/10"
                  }`}
                />
                <span className="relative text-sm font-medium tracking-wide text-white/90">
                  {presenceLabel}
                </span>
              </div>

              <div className="mt-10 w-full max-w-xl space-y-6">
                {lastForge ? (
                  <blockquote className="text-xl leading-8 text-white/90 sm:text-2xl sm:leading-9">
                    {lastForge.text}
                  </blockquote>
                ) : phase === "minting" || phase === "connecting" ? (
                  <p className="text-lg text-white/45">Joining Forge…</p>
                ) : phase === "speaking" ? (
                  <p className="text-lg text-white/45">Forge is speaking…</p>
                ) : (
                  <p className="text-lg text-white/45">Waiting for Forge…</p>
                )}

                {lastFounder && (
                  <p className="text-base leading-7 text-white/50">
                    <span className="text-white/35">You · </span>
                    {lastFounder.text}
                  </p>
                )}
              </div>

              {error && (
                <p className="mt-6 max-w-md text-sm text-red-300" role="alert">
                  {error}
                </p>
              )}

              {remoteAudioBlocked ? (
                <button
                  type="button"
                  onClick={() => void handleResumeRemoteAudio()}
                  className="mt-5 rounded-full border border-blue-200/25 px-5 py-2.5 text-sm text-blue-100 transition hover:bg-blue-100/10"
                >
                  Hear Coach Forge
                </button>
              ) : null}

              {micMode === "silent_fallback" && (
                <div className="mt-6 max-w-md">
                  <p className="text-sm text-amber-200/80">
                    {micFallbackReason === "permission_denied"
                      ? "Microphone access wasn’t granted. You can keep listening, then allow access in your browser and try again."
                      : micFallbackReason === "device_busy"
                        ? "Your microphone is being used elsewhere. You can keep listening, then close the other app and try again."
                        : micFallbackReason === "unsupported"
                          ? "This browser can’t reach a microphone here. You can keep listening or try a supported browser."
                          : "No microphone is available on this device right now. You can keep listening, connect one, and try again."}
                  </p>
                  {micFallbackReason !== "unsupported" && (
                    <button
                      type="button"
                      onClick={() => void handleRecoverMicrophone()}
                      disabled={micRecoveryPending}
                      className="mt-3 rounded-full border border-amber-200/25 px-5 py-2.5 text-sm text-amber-100 transition hover:bg-amber-100/10 disabled:opacity-50"
                    >
                      {micRecoveryPending
                        ? "Checking microphone…"
                        : micFallbackReason === "permission_denied"
                          ? "Allow microphone"
                          : "Try microphone again"}
                    </button>
                  )}
                </div>
              )}

              <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
                {(phase === "error" ||
                  phase === "connected" ||
                  phase === "listening") &&
                  !busy && (
                    <button
                      type="button"
                      onClick={handleStart}
                      className="rounded-full border border-white/20 px-6 py-3 text-sm text-white/80 transition hover:bg-white/10"
                    >
                      Restart
                    </button>
                  )}
                <button
                  type="button"
                  disabled={
                    !inSession ||
                    phase === "minting" ||
                    phase === "connecting" ||
                    micMode !== "microphone"
                  }
                  onPointerDown={(event) => {
                    event.currentTarget.setPointerCapture(event.pointerId);
                    handleSpeakDown();
                  }}
                  onPointerUp={(event) => {
                    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                      event.currentTarget.releasePointerCapture(event.pointerId);
                    }
                    handleSpeakUp();
                  }}
                  onPointerCancel={handleSpeakUp}
                  onKeyDown={(event) => {
                    if (
                      !event.repeat &&
                      (event.key === " " || event.key === "Enter")
                    ) {
                      event.preventDefault();
                      handleSpeakDown();
                    }
                  }}
                  onKeyUp={(event) => {
                    if (event.key === " " || event.key === "Enter") {
                      event.preventDefault();
                      handleSpeakUp();
                    }
                  }}
                  className={`min-w-[10rem] rounded-full px-10 py-4 text-sm font-semibold transition disabled:opacity-35 ${
                    micLive
                      ? "bg-amber-300 text-black"
                      : "bg-white text-black hover:bg-white/90"
                  }`}
                >
                  {micLive ? "Listening…" : "Hold to speak"}
                </button>
              </div>
            </>
          )}
        </section>

        {showDevDiagnostics && (
          <footer className="pb-2">
            <button
              type="button"
              onClick={() => setShowDiagnostics((v) => !v)}
              className="text-xs text-white/25 transition hover:text-white/45"
            >
              {showDiagnostics ? "Hide diagnostics" : "Diagnostics"}
            </button>
            {showDiagnostics && (
              <div className="mt-3 space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-left">
                <p className="text-xs uppercase tracking-[0.2em] text-white/40">
                  Evidence log · not part of the product surface
                </p>
                <ul className="space-y-1 font-mono text-[11px] text-white/45">
                  {events.length === 0 ? (
                    <li>No events</li>
                  ) : (
                    events.map((line) => <li key={line}>{line}</li>)
                  )}
                </ul>
                {turns.length > 0 && (
                  <ol className="space-y-2 border-t border-white/10 pt-3 text-xs text-white/55">
                    {turns.map((turn) => (
                      <li key={`${turn.turnIndex}-${turn.finalizedAt}`}>
                        #{turn.turnIndex} {turn.role}: {turn.text}
                      </li>
                    ))}
                  </ol>
                )}
              </div>
            )}
          </footer>
        )}
      </div>
    </main>
  );
}
