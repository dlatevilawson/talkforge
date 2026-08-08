"use client";

import { useEffect, useRef, useState } from "react";
import {
  setMicrophoneEnabled,
  type RealtimeConnection,
} from "@/lib/ce/realtime";
import {
  handsFreeStateLabel,
  reduceHandsFreeState,
  type HandsFreeState,
} from "@/lib/ce/handsfree-fsm";

export type ArenaVoiceMode = "hold" | "handsfree";

type Options = {
  isProUser: boolean;
  connection: RealtimeConnection | null;
  /** Session is live (past mint/connect). */
  sessionActive: boolean;
  /** Forge currently producing audio. */
  forgeSpeaking: boolean;
  /**
   * Pro barge-in: keep mic open during Forge speech so interrupt_response can fire.
   * Free never barge-in.
   */
  allowBargeIn: boolean;
};

/**
 * Dual-engine mic logic for Live Arena.
 * - Free: Hold-to-Talk (manual enable while pressing) — unchanged cost model.
 * - Pro: Hands-free — mic stays open (including during Forge speech for barge-in).
 *
 * Uses the existing Realtime MediaStream (no second getUserMedia).
 */
export function useArenaVoice({
  isProUser,
  connection,
  sessionActive,
  forgeSpeaking,
  allowBargeIn,
}: Options) {
  const [micLive, setMicLive] = useState(false);
  const [userSpeaking, setUserSpeaking] = useState(false);
  const [level, setLevel] = useState(0);
  const [handsFreeMuted, setHandsFreeMuted] = useState(false);
  const [handsFreeState, setHandsFreeState] =
    useState<HandsFreeState>("idle");
  const holdingRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const silenceMsRef = useRef(0);
  const lastTickRef = useRef<number | null>(null);

  const mode: ArenaVoiceMode = isProUser ? "handsfree" : "hold";

  useEffect(() => {
    if (!connection || connection.usedSilentMicFallback || !sessionActive) {
      stopAnalyser();
      setMicrophoneEnabled(connection, false);
      setMicLive(false);
      setUserSpeaking(false);
      setLevel(0);
      return;
    }

    // Pro: mic open whenever unmuted (incl. Forge speaking → barge-in).
    // Free: mic open only while holding and Forge is not speaking.
    const wantOpen =
      mode === "handsfree"
        ? !handsFreeMuted
        : !forgeSpeaking && holdingRef.current;

    setMicrophoneEnabled(connection, wantOpen);
    setMicLive(wantOpen);

    if (wantOpen) {
      startAnalyser(connection.localStream);
    } else {
      stopAnalyser();
      setUserSpeaking(false);
      setLevel(0);
    }
  }, [
    connection,
    sessionActive,
    forgeSpeaking,
    mode,
    handsFreeMuted,
    allowBargeIn,
  ]);

  useEffect(() => {
    if (mode !== "handsfree" || !sessionActive) return;
    setHandsFreeState((s) => reduceHandsFreeState(s, { type: "SESSION_READY" }));
  }, [mode, sessionActive]);

  useEffect(() => {
    return () => {
      holdingRef.current = false;
      stopAnalyser();
    };
  }, []);

  function startAnalyser(stream: MediaStream) {
    if (analyserRef.current) return;
    try {
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.78;
      source.connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      silenceMsRef.current = 0;
      lastTickRef.current = null;

      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = (now: number) => {
        const node = analyserRef.current;
        if (!node) return;
        const last = lastTickRef.current ?? now;
        const dt = Math.min(100, now - last);
        lastTickRef.current = now;

        node.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i += 1) sum += data[i];
        const avg = sum / (data.length * 255);
        const nextLevel = Math.min(1, avg * 2.4);
        setLevel(nextLevel);

        // Higher threshold + hysteresis — brief thinking pauses ≠ end of turn.
        const speaking = nextLevel > 0.1;
        setUserSpeaking(speaking);

        if (mode === "handsfree") {
          if (speaking) {
            silenceMsRef.current = 0;
            setHandsFreeState((s) =>
              reduceHandsFreeState(s, { type: "USER_SPEECH_STARTED" })
            );
          } else if (!forgeSpeaking) {
            silenceMsRef.current += dt;
            // ~2.4s of low energy before PAUSED (not mid-thought ~400–800ms).
            if (silenceMsRef.current > 2400) {
              setHandsFreeState((s) =>
                reduceHandsFreeState(s, { type: "LONG_SILENCE" })
              );
            }
          }
        }

        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      /* analyser optional */
    }
  }

  function stopAnalyser() {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    analyserRef.current = null;
    if (audioCtxRef.current) {
      void audioCtxRef.current.close().catch(() => undefined);
      audioCtxRef.current = null;
    }
    lastTickRef.current = null;
  }

  function startHoldToTalk() {
    if (mode !== "hold" || !connection || connection.usedSilentMicFallback) {
      return;
    }
    if (forgeSpeaking || !sessionActive) return;
    holdingRef.current = true;
    setMicrophoneEnabled(connection, true);
    setMicLive(true);
    startAnalyser(connection.localStream);
  }

  function stopHoldToTalk() {
    if (mode !== "hold" || !connection || connection.usedSilentMicFallback) {
      return;
    }
    holdingRef.current = false;
    setMicrophoneEnabled(connection, false);
    setMicLive(false);
    stopAnalyser();
    setUserSpeaking(false);
    setLevel(0);
  }

  function toggleHandsFreeMute() {
    if (mode !== "handsfree") return;
    setHandsFreeMuted((v) => !v);
  }

  function onForgeStarted() {
    if (mode !== "handsfree") return;
    setHandsFreeState((s) =>
      reduceHandsFreeState(s, { type: "FORGE_RESPONSE_STARTED" })
    );
  }

  function onForgeDone() {
    if (mode !== "handsfree") return;
    setHandsFreeState((s) =>
      reduceHandsFreeState(s, { type: "FORGE_RESPONSE_DONE" })
    );
  }

  function onBargeIn() {
    if (mode !== "handsfree") return;
    setHandsFreeState((s) => reduceHandsFreeState(s, { type: "BARGE_IN" }));
  }

  function onUserSpeechStopped() {
    if (mode !== "handsfree") return;
    setHandsFreeState((s) =>
      reduceHandsFreeState(s, { type: "USER_SPEECH_STOPPED" })
    );
  }

  function onSessionEnd() {
    setHandsFreeState((s) => reduceHandsFreeState(s, { type: "END" }));
  }

  return {
    mode,
    micLive,
    userSpeaking,
    level,
    handsFreeMuted,
    handsFreeState,
    handsFreeLabel: handsFreeStateLabel(handsFreeState),
    startHoldToTalk,
    stopHoldToTalk,
    toggleHandsFreeMute,
    onForgeStarted,
    onForgeDone,
    onBargeIn,
    onUserSpeechStopped,
    onSessionEnd,
  };
}
