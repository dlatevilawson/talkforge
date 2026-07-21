"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  connectRealtime,
  disconnectRealtime,
  requestOpeningSpeech,
  setMicrophoneEnabled,
  type RealtimeConnection,
} from "@/lib/ce/realtime";
import type { CeTrack } from "@/lib/ce/session-config";
import {
  applyRealtimeTranscriptEvent,
  type TranscriptTurn,
} from "@/lib/ce/transcript";
import {
  createVoiceSessionId,
  saveVoiceTranscript,
  setActiveVoiceSessionId,
} from "@/lib/ce/transcript-store";

type VoiceArenaProps = {
  track?: CeTrack;
  eventTitle?: string;
  successCriteria?: string;
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
};

export default function VoiceArena({
  track = "hello",
  eventTitle,
  successCriteria,
}: VoiceArenaProps) {
  const connectionRef = useRef<RealtimeConnection | null>(null);
  const turnsRef = useRef<TranscriptTurn[]>([]);
  const voiceSessionIdRef = useRef<string | null>(null);
  const realtimeSessionIdRef = useRef<string | null>(null);
  const createdAtRef = useRef<string>("");

  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [events, setEvents] = useState<string[]>([]);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [micMode, setMicMode] = useState<"microphone" | "silent_fallback" | null>(
    null
  );
  const [turns, setTurns] = useState<TranscriptTurn[]>([]);
  const [micLive, setMicLive] = useState(false);
  const [momentum, setMomentum] = useState<Momentum | null>(null);
  const [momentumLoading, setMomentumLoading] = useState(false);

  const showDevDiagnostics = process.env.NODE_ENV === "development";

  useEffect(() => {
    return () => {
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

    setError("");
    setMicMode(null);
    setTurns([]);
    turnsRef.current = [];
    setMicLive(false);
    setEvents([]);
    setMomentum(null);
    setPhase("minting");
    pushEvent("Minting session…");

    const newVoiceId = createVoiceSessionId();
    voiceSessionIdRef.current = newVoiceId;
    createdAtRef.current = new Date().toISOString();

    try {
      disconnectRealtime(connectionRef.current);
      connectionRef.current = null;

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
      };

      if (!tokenRes.ok || !tokenData.value) {
        throw new Error(tokenData.error || "Could not start session.");
      }

      realtimeSessionIdRef.current = tokenData.session_id ?? null;
      setPhase("connecting");
      pushEvent("Connecting…");

      const connection = await connectRealtime({
        ephemeralKey: tokenData.value,
        onMicMode: (mode) => {
          setMicMode(mode);
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
        onConnectionState: (state) => {
          pushEvent(`Peer: ${state}`);
        },
        onServerEvent: handleServerEvent,
      });

      connectionRef.current = connection;

      if (!connection.usedSilentMicFallback) {
        setMicrophoneEnabled(connection, false);
        setMicLive(false);
      }

      setPhase("speaking");
      requestOpeningSpeech(connection.dc);
      pushEvent("Forge opening");
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

  async function handleStop() {
    if (voiceSessionIdRef.current && turnsRef.current.length > 0) {
      persistTurns(turnsRef.current);
    }
    disconnectRealtime(connectionRef.current);
    connectionRef.current = null;
    setMicLive(false);
    pushEvent("Ended");

    const snapshot = [...turnsRef.current];
    setPhase("momentum");
    setMomentumLoading(true);
    setMomentum(null);

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
      setMomentum({
        strength:
          data.strength ||
          "You showed up and practiced — that already builds readiness.",
        improve:
          data.improve ||
          "Next time, say one full thought so we can coach something specific.",
        nextAction:
          data.nextAction ||
          "Try one clearer opening line in your next real conversation.",
      });
    } catch {
      setMomentum({
        strength: "You showed up and practiced — that already builds readiness.",
        improve:
          "Next time, say one full thought so we can coach something specific.",
        nextAction:
          "Try one clearer opening line in your next real conversation.",
      });
    } finally {
      setMomentumLoading(false);
    }
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
      ? "Forge"
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
            href="/"
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
                Forge
              </p>
              <h1 className="mt-5 max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">
                {eventTitle?.trim() || "I’m ready when you are"}
              </h1>
              <p className="mt-5 max-w-md text-base leading-7 text-white/55">
                You don’t have to perform here. One tap — I’ll greet you. Hold to
                speak when you’re ready. We’ll practice gently.
              </p>
              {successCriteria?.trim() && (
                <p className="mt-4 max-w-md text-sm leading-6 text-white/40">
                  You’re aiming for: {successCriteria.trim()}
                </p>
              )}
              <button
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

              <div className="mt-12 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={handleStart}
                  className="rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black transition hover:bg-white/90"
                >
                  Practice again
                </button>
                <Link
                  href="/dashboard"
                  className="rounded-full border border-white/20 px-6 py-3.5 text-sm text-white/80 transition hover:bg-white/10"
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

              {micMode === "silent_fallback" && (
                <p className="mt-6 max-w-md text-sm text-amber-200/80">
                  No microphone detected. You can listen; speaking needs a mic.
                </p>
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
                  onMouseDown={handleSpeakDown}
                  onMouseUp={handleSpeakUp}
                  onMouseLeave={handleSpeakUp}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    handleSpeakDown();
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    handleSpeakUp();
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
