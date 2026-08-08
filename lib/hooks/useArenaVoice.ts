"use client";

import { useEffect, useRef, useState } from "react";
import {
  setMicrophoneEnabled,
  setOutboundMicrophoneEnabled,
  type RealtimeConnection,
} from "@/lib/ce/realtime";
import {
  handsFreeStateLabel,
  reduceHandsFreeState,
  type HandsFreeState,
} from "@/lib/ce/handsfree-fsm";
import {
  isConfirmedBargeInLevel,
  outboundMicOpenForState,
  type TurnState,
} from "@/lib/ce/handsfree-turntaking";

export type ArenaVoiceMode = "hold" | "handsfree";

type Options = {
  isProUser: boolean;
  connection: RealtimeConnection | null;
  /** Session is live (past mint/connect). */
  sessionActive: boolean;
  /** Authoritative Pro turn state from VoiceArena. */
  turnState: TurnState;
  /**
   * Fired only after echo-aware local confirmation while Forge is speaking.
   * Parent is responsible for response.cancel.
   */
  onConfirmedBargeIn?: (level: number) => void;
};

/**
 * Dual-engine mic logic for Live Arena.
 * - Free: Hold-to-Talk (manual enable while pressing).
 * - Pro: Hands-free — outbound mic muted while Forge speaks; local analyser
 *   confirms true barge-in without treating speaker echo as member speech.
 */
export function useArenaVoice({
  isProUser,
  connection,
  sessionActive,
  turnState,
  onConfirmedBargeIn,
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
  const echoFloorRef = useRef(0.08);
  const echoSamplesRef = useRef<number[]>([]);
  const bargeSustainMsRef = useRef(0);
  const bargeFiredRef = useRef(false);
  const turnStateRef = useRef(turnState);
  turnStateRef.current = turnState;
  const onBargeInRef = useRef(onConfirmedBargeIn);
  onBargeInRef.current = onConfirmedBargeIn;

  const mode: ArenaVoiceMode = isProUser ? "handsfree" : "hold";
  const forgeOwnsFloor =
    turnState === "forge_speaking" || turnState === "forge_thinking";

  useEffect(() => {
    if (!connection || connection.usedSilentMicFallback || !sessionActive) {
      stopAnalyser();
      setMicrophoneEnabled(connection, false);
      setMicLive(false);
      setUserSpeaking(false);
      setLevel(0);
      return;
    }

    if (mode === "handsfree") {
      // Local mic always on for analyser (unless member muted).
      for (const track of connection.localStream.getAudioTracks()) {
        track.enabled = !handsFreeMuted;
      }
      const wantOutbound =
        !handsFreeMuted && outboundMicOpenForState(turnState);
      setOutboundMicrophoneEnabled(connection, wantOutbound);
      setMicLive(wantOutbound || forgeOwnsFloor);
      if (!handsFreeMuted) {
        startAnalyser(connection.localStream);
      } else {
        stopAnalyser();
        setUserSpeaking(false);
        setLevel(0);
      }
      return;
    }

    // Free hold-to-talk
    const wantOpen = !forgeOwnsFloor && holdingRef.current;
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
    turnState,
    mode,
    handsFreeMuted,
    forgeOwnsFloor,
  ]);

  useEffect(() => {
    if (mode !== "handsfree" || !sessionActive) return;
    setHandsFreeState((s) => reduceHandsFreeState(s, { type: "SESSION_READY" }));
  }, [mode, sessionActive]);

  useEffect(() => {
    // Reset barge-in latch whenever Forge starts a new turn.
    if (forgeOwnsFloor) {
      bargeFiredRef.current = false;
      bargeSustainMsRef.current = 0;
      echoSamplesRef.current = [];
    } else {
      echoFloorRef.current = 0.08;
      echoSamplesRef.current = [];
      bargeSustainMsRef.current = 0;
    }
  }, [forgeOwnsFloor, turnState]);

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

        const currentTurn = turnStateRef.current;
        const forgeSpeakingNow =
          currentTurn === "forge_speaking" || currentTurn === "forge_thinking";

        if (mode === "handsfree" && forgeSpeakingNow) {
          // Learn speaker-echo floor from the first moments of Forge audio.
          if (echoSamplesRef.current.length < 12) {
            echoSamplesRef.current.push(nextLevel);
            const samples = echoSamplesRef.current;
            echoFloorRef.current =
              samples.reduce((a, b) => a + b, 0) / samples.length;
          }

          const rising =
            nextLevel >= Math.max(0.2, echoFloorRef.current * 2.4);
          if (rising) {
            bargeSustainMsRef.current += dt;
          } else {
            bargeSustainMsRef.current = 0;
          }
          if (
            !bargeFiredRef.current &&
            isConfirmedBargeInLevel({
              level: nextLevel,
              echoFloor: echoFloorRef.current,
              sustainedMs: bargeSustainMsRef.current,
            })
          ) {
            bargeFiredRef.current = true;
            setUserSpeaking(true);
            setHandsFreeState((s) =>
              reduceHandsFreeState(s, { type: "BARGE_IN" })
            );
            onBargeInRef.current?.(nextLevel);
          }
          // Never mark casual echo as "user speaking" for UI during Forge turns.
          return requestNext(tick);
        }

        const speaking = nextLevel > 0.1;
        setUserSpeaking(speaking);

        if (mode === "handsfree") {
          if (speaking) {
            silenceMsRef.current = 0;
            setHandsFreeState((s) =>
              reduceHandsFreeState(s, { type: "USER_SPEECH_STARTED" })
            );
          } else {
            silenceMsRef.current += dt;
            if (silenceMsRef.current > 2400) {
              setHandsFreeState((s) =>
                reduceHandsFreeState(s, { type: "LONG_SILENCE" })
              );
            }
          }
        }

        requestNext(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      /* analyser optional */
    }
  }

  function requestNext(tick: (now: number) => void) {
    rafRef.current = requestAnimationFrame(tick);
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
    if (forgeOwnsFloor || !sessionActive) return;
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

  const labelFromTurn =
    turnState === "forge_thinking"
      ? "Thinking"
      : turnState === "forge_speaking"
        ? "Forge speaking"
        : turnState === "user_speaking" || turnState === "interrupted"
          ? "Listening"
          : turnState === "listening"
            ? "Speak naturally"
            : handsFreeStateLabel(handsFreeState);

  return {
    mode,
    micLive,
    userSpeaking,
    level,
    handsFreeMuted,
    handsFreeState,
    handsFreeLabel: labelFromTurn,
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
