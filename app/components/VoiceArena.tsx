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
  | "error";

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
  const [connectionState, setConnectionState] = useState<string>("new");
  const [error, setError] = useState("");
  const [events, setEvents] = useState<string[]>([]);
  const [heardAudio, setHeardAudio] = useState(false);
  const [voiceSessionId, setVoiceSessionId] = useState<string | null>(null);
  const [micMode, setMicMode] = useState<"microphone" | "silent_fallback" | null>(
    null
  );
  const [turns, setTurns] = useState<TranscriptTurn[]>([]);
  const [micLive, setMicLive] = useState(false);
  const [persistedOk, setPersistedOk] = useState(false);

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
    const record = saveVoiceTranscript({
      voiceSessionId: id,
      realtimeSessionId: realtimeSessionIdRef.current,
      track,
      eventTitle,
      createdAt: createdAtRef.current,
      turns: nextTurns,
    });
    setPersistedOk(record.summary.ordered && record.turns.length > 0);
    setActiveVoiceSessionId(id);
  }

  function handleServerEvent(event: Record<string, unknown>) {
    const type = typeof event.type === "string" ? event.type : "event";

    if (
      type.includes("audio") ||
      type === "response.created" ||
      type === "response.output_item.added"
    ) {
      setHeardAudio(true);
      setPhase((current) =>
        current === "connecting" || current === "speaking"
          ? "speaking"
          : current
      );
    }

    if (type === "response.done") {
      setPhase((current) =>
        current === "speaking" ? "listening" : current === "connecting" ? "connected" : current
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
    setHeardAudio(false);
    setMicMode(null);
    setTurns([]);
    turnsRef.current = [];
    setPersistedOk(false);
    setMicLive(false);
    setEvents([]);
    setPhase("minting");
    pushEvent("Minting ephemeral Realtime session (transcription on)…");

    const newVoiceId = createVoiceSessionId();
    voiceSessionIdRef.current = newVoiceId;
    createdAtRef.current = new Date().toISOString();
    setVoiceSessionId(newVoiceId);

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
        throw new Error(tokenData.error || "Could not mint Realtime session.");
      }

      const rtSessionId = tokenData.session_id ?? null;
      realtimeSessionIdRef.current = rtSessionId;
      pushEvent(`Ephemeral key received (session ${rtSessionId ?? "—"})`);
      setPhase("connecting");
      pushEvent("Connecting WebRTC…");

      const connection = await connectRealtime({
        ephemeralKey: tokenData.value,
        onMicMode: (mode) => {
          setMicMode(mode);
          pushEvent(
            mode === "microphone"
              ? "Microphone acquired (CE-M2 Founder capture enabled)"
              : "No mic — Forge transcripts only; Founder capture needs a real mic"
          );
        },
        onRemoteTrack: () => {
          setHeardAudio(true);
          pushEvent("Remote audio track received from Forge");
          setPhase((current) =>
            current === "connecting" || current === "speaking"
              ? "speaking"
              : current
          );
        },
        onConnectionState: (state) => {
          setConnectionState(state);
          pushEvent(`Peer connection: ${state}`);
        },
        onServerEvent: handleServerEvent,
      });

      connectionRef.current = connection;

      // Mute until Founder holds Speak (push-to-talk)
      if (!connection.usedSilentMicFallback) {
        setMicrophoneEnabled(connection, false);
        setMicLive(false);
      }

      pushEvent("WebRTC connected — transcription armed · Forge speaks first");
      setPhase("speaking");
      requestOpeningSpeech(connection.dc);
      pushEvent("response.create sent (interviewer opening)");
    } catch (err) {
      console.error(err);
      disconnectRealtime(connectionRef.current);
      connectionRef.current = null;
      setPhase("error");
      setError(
        err instanceof Error ? err.message : "Failed to start voice session."
      );
      pushEvent("FAILED — see error");
    }
  }

  function handleSpeakDown() {
    if (!connectionRef.current || connectionRef.current.usedSilentMicFallback) {
      return;
    }
    setMicrophoneEnabled(connectionRef.current, true);
    setMicLive(true);
    setPhase("listening");
    pushEvent("Mic open — Founder speaking");
  }

  function handleSpeakUp() {
    if (!connectionRef.current || connectionRef.current.usedSilentMicFallback) {
      return;
    }
    setMicrophoneEnabled(connectionRef.current, false);
    setMicLive(false);
    pushEvent("Mic closed — waiting for Founder transcript finalize");
  }

  function handleStop() {
    // Final persist
    if (voiceSessionIdRef.current && turnsRef.current.length > 0) {
      persistTurns(turnsRef.current);
    }
    disconnectRealtime(connectionRef.current);
    connectionRef.current = null;
    setPhase("idle");
    setConnectionState("closed");
    setMicLive(false);
    pushEvent("Disconnected · transcript persisted for CE-M3");
  }

  const busy =
    phase === "minting" || phase === "connecting" || phase === "speaking";
  const live =
    phase === "speaking" ||
    phase === "listening" ||
    phase === "connected" ||
    connectionState === "connected";

  const founderCount = turns.filter((t) => t.role === "founder").length;
  const forgeCount = turns.filter((t) => t.role === "forge").length;

  return (
    <main className="min-h-[100dvh] bg-gradient-to-b from-black via-zinc-950 to-black px-4 text-white sm:px-6">
      <div className="mx-auto flex min-h-[100dvh] max-w-2xl flex-col py-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/dashboard"
            className="text-sm text-zinc-400 transition hover:text-white"
          >
            ← Dashboard
          </Link>
          <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
            CE-M2 · Stable Transcripts
          </p>
        </div>

        <section className="mt-10 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
            TalkForge Voice
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            {eventTitle?.trim() || "Transcript practice"}
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-zinc-400 sm:text-base">
            Start → Forge speaks first → hold <strong>Speak</strong> to reply.
            Finalized Founder and Forge transcripts stay ordered and persisted
            for CE-M3 coaching.
          </p>
        </section>

        <section className="mt-12 flex flex-col items-center gap-6">
          <div
            className={`flex h-36 w-36 items-center justify-center rounded-full border-2 transition ${
              micLive
                ? "border-amber-400/80 bg-amber-500/20"
                : phase === "speaking"
                  ? "border-blue-400/80 bg-blue-500/20"
                  : live
                    ? "border-emerald-400/50 bg-emerald-500/10"
                    : "border-white/15 bg-white/5"
            }`}
            aria-live="polite"
          >
            <span className="text-sm font-medium text-zinc-200">
              {phase === "idle" && "Ready"}
              {phase === "minting" && "Minting…"}
              {phase === "connecting" && "Connecting…"}
              {phase === "speaking" && "Forge speaking"}
              {phase === "listening" && (micLive ? "Your turn" : "Listening")}
              {phase === "connected" && "Connected"}
              {phase === "error" && "Error"}
            </span>
          </div>

          <p className="text-sm text-zinc-500">
            Peer: <span className="text-zinc-300">{connectionState}</span>
            {voiceSessionId ? (
              <>
                {" "}
                · Voice{" "}
                <span className="font-mono text-xs text-zinc-400">
                  {voiceSessionId.slice(0, 18)}…
                </span>
              </>
            ) : null}
          </p>

          <div className="flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={handleStart}
              disabled={busy}
              className="rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black transition hover:bg-zinc-200 disabled:opacity-50"
            >
              {busy ? "Starting…" : live ? "Restart" : "Start"}
            </button>
            <button
              type="button"
              disabled={!live || micMode !== "microphone"}
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
              className={`rounded-full px-8 py-3.5 text-sm font-semibold transition disabled:opacity-40 ${
                micLive
                  ? "bg-amber-400 text-black"
                  : "border border-white/20 text-white hover:bg-white/10"
              }`}
            >
              {micLive ? "Speaking…" : "Hold to Speak"}
            </button>
            <button
              type="button"
              onClick={handleStop}
              disabled={phase === "idle" || phase === "minting"}
              className="rounded-full border border-white/20 px-8 py-3.5 text-sm font-medium text-white transition hover:bg-white/10 disabled:opacity-40"
            >
              Stop
            </button>
          </div>

          {micMode === "silent_fallback" && (
            <p className="max-w-md text-center text-sm text-amber-200/90">
              No microphone — Forge transcripts may still appear. Founder
              transcript capture requires a real mic (Founder validation
              source).
            </p>
          )}

          {heardAudio && (
            <p className="text-sm text-emerald-300/90" role="status">
              Audio activity detected from Forge.
            </p>
          )}

          {error && (
            <p className="max-w-md text-center text-sm text-red-300" role="alert">
              {error}
            </p>
          )}
        </section>

        <section className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
              Ordered transcript
            </p>
            <p className="text-xs text-zinc-500">
              Founder {founderCount} · Forge {forgeCount}
              {persistedOk ? " · persisted" : ""}
            </p>
          </div>
          {turns.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">
              No finalized turns yet. After Forge speaks, hold Speak and reply.
            </p>
          ) : (
            <ol className="mt-4 space-y-3">
              {turns.map((turn) => (
                <li
                  key={`${turn.turnIndex}-${turn.role}-${turn.finalizedAt}`}
                  className={`rounded-xl border px-4 py-3 text-sm leading-6 ${
                    turn.role === "founder"
                      ? "border-white/15 bg-black/30"
                      : "border-blue-500/20 bg-blue-500/10"
                  }`}
                >
                  <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                    #{turn.turnIndex} ·{" "}
                    {turn.role === "founder" ? "Founder" : "Forge"}
                  </p>
                  <p className="mt-1 text-zinc-100">{turn.text}</p>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5">
          <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
            Connection log
          </p>
          {events.length === 0 ? (
            <p className="mt-3 text-sm text-zinc-500">No events yet.</p>
          ) : (
            <ul className="mt-3 space-y-1 font-mono text-xs text-zinc-400">
              {events.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
        </section>

        <p className="mt-8 text-center text-xs text-zinc-600">
          CE-M2 · Validation = Founder test sessions · CE-M3 coaching not started
        </p>
      </div>
    </main>
  );
}
