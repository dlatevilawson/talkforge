"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  connectRealtime,
  disconnectRealtime,
  requestOpeningSpeech,
  type RealtimeConnection,
} from "@/lib/ce/realtime";
import type { CeTrack } from "@/lib/ce/session-config";

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
  | "connected"
  | "error";

export default function VoiceArena({
  track = "hello",
  eventTitle,
  successCriteria,
}: VoiceArenaProps) {
  const connectionRef = useRef<RealtimeConnection | null>(null);
  const [phase, setPhase] = useState<Phase>("idle");
  const [connectionState, setConnectionState] = useState<string>("new");
  const [error, setError] = useState("");
  const [events, setEvents] = useState<string[]>([]);
  const [heardAudio, setHeardAudio] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [micMode, setMicMode] = useState<"microphone" | "silent_fallback" | null>(
    null
  );

  useEffect(() => {
    return () => {
      disconnectRealtime(connectionRef.current);
      connectionRef.current = null;
    };
  }, []);

  function pushEvent(label: string) {
    setEvents((prev) => [`${new Date().toISOString().slice(11, 19)} ${label}`, ...prev].slice(0, 12));
  }

  async function handleStart() {
    if (phase === "minting" || phase === "connecting" || phase === "speaking") {
      return;
    }

    setError("");
    setHeardAudio(false);
    setMicMode(null);
    setEvents([]);
    setPhase("minting");
    pushEvent("Minting ephemeral Realtime session…");

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

      setSessionId(tokenData.session_id ?? null);
      pushEvent(`Ephemeral key received (session ${tokenData.session_id ?? "—"})`);
      setPhase("connecting");
      pushEvent("Connecting WebRTC (mic or silent fallback)…");

      const connection = await connectRealtime({
        ephemeralKey: tokenData.value,
        onMicMode: (mode) => {
          setMicMode(mode);
          pushEvent(
            mode === "microphone"
              ? "Microphone acquired"
              : "No mic device — silent track fallback (CE-M1 audio-out still valid)"
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
          if (state === "connected") {
            setPhase((current) =>
              current === "connecting" ? "speaking" : current
            );
          }
        },
        onServerEvent: (event) => {
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
            setPhase("connected");
            pushEvent("Opening speech response complete");
          }
          if (type === "error") {
            pushEvent(
              `Server error event: ${JSON.stringify(event).slice(0, 120)}`
            );
          }
        },
      });

      connectionRef.current = connection;
      pushEvent("WebRTC connected — requesting Forge to speak first");
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

  function handleStop() {
    disconnectRealtime(connectionRef.current);
    connectionRef.current = null;
    setPhase("idle");
    setConnectionState("closed");
    pushEvent("Disconnected cleanly");
  }

  const busy =
    phase === "minting" || phase === "connecting" || phase === "speaking";
  const live =
    phase === "speaking" ||
    phase === "connected" ||
    connectionState === "connected";

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
            CE-M1 · Realtime Hello
          </p>
        </div>

        <section className="mt-10 text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-zinc-500">
            TalkForge Voice
          </p>
          <h1 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            {eventTitle?.trim() || "Realtime connection test"}
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-6 text-zinc-400 sm:text-base">
            Press Start. Forge (interviewer) speaks first. Validate a stable
            voice connection, then Stop. Transcripts and coaching ship in later
            milestones — not CE-M1.
          </p>
        </section>

        <section className="mt-12 flex flex-col items-center gap-6">
          <div
            className={`flex h-36 w-36 items-center justify-center rounded-full border-2 transition ${
              phase === "speaking"
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
              {phase === "connected" && "Connected"}
              {phase === "error" && "Error"}
            </span>
          </div>

          <p className="text-sm text-zinc-500">
            Peer: <span className="text-zinc-300">{connectionState}</span>
            {sessionId ? (
              <>
                {" "}
                · Session{" "}
                <span className="font-mono text-xs text-zinc-400">
                  {sessionId}
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
              onClick={handleStop}
              disabled={phase === "idle" || phase === "minting"}
              className="rounded-full border border-white/20 px-8 py-3.5 text-sm font-medium text-white transition hover:bg-white/10 disabled:opacity-40"
            >
              Stop
            </button>
          </div>

          {micMode === "silent_fallback" && (
            <p className="max-w-md text-center text-sm text-amber-200/90">
              No microphone device detected — using silent input so Forge can
              still speak (CE-M1). Real mic required from CE-M2 onward for user
              speech.
            </p>
          )}

          {heardAudio && (
            <p className="text-sm text-emerald-300/90" role="status">
              Audio / response activity detected from Forge.
            </p>
          )}

          {error && (
            <p className="max-w-md text-center text-sm text-red-300" role="alert">
              {error}
            </p>
          )}
        </section>

        <section className="mt-12 rounded-2xl border border-white/10 bg-white/5 p-5">
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
          CE-M1 only · CE-M2 (transcripts) not started
        </p>
      </div>
    </main>
  );
}
