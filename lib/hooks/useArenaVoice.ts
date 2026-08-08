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
  isIntentionalSpeechSignal,
  levelModulation,
  outboundMicOpenForState,
  speechBandRatioFromSpectrum,
  type TurnState,
} from "@/lib/ce/handsfree-turntaking";

export type ArenaVoiceMode = "hold" | "handsfree";

type Options = {
  isProUser: boolean;
  connection: RealtimeConnection | null;
  sessionActive: boolean;
  turnState: TurnState;
  /** Forge speaking → confirmed intentional barge-in. */
  onConfirmedBargeIn?: (level: number) => void;
  /** Listening → confirmed intentional user turn (opens outbound). */
  onConfirmedUserTurn?: (level: number) => void;
};

/**
 * Dual-engine mic logic for Live Arena.
 * - Free: Hold-to-Talk.
 * - Pro: outbound muted until local intentional-speech confirmation
 *   (listening) or confirmed barge-in (Forge speaking). Ambient/TV never
 *   reaches OpenAI VAD.
 */
export function useArenaVoice({
  isProUser,
  connection,
  sessionActive,
  turnState,
  onConfirmedBargeIn,
  onConfirmedUserTurn,
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
  const ambientFloorRef = useRef(0.06);
  const echoSamplesRef = useRef<number[]>([]);
  const ambientSamplesRef = useRef<number[]>([]);
  const levelHistoryRef = useRef<number[]>([]);
  const sustainMsRef = useRef(0);
  const bargeFiredRef = useRef(false);
  const userTurnFiredRef = useRef(false);
  const turnStateRef = useRef(turnState);
  turnStateRef.current = turnState;
  const onBargeInRef = useRef(onConfirmedBargeIn);
  onBargeInRef.current = onConfirmedBargeIn;
  const onUserTurnRef = useRef(onConfirmedUserTurn);
  onUserTurnRef.current = onConfirmedUserTurn;

  const mode: ArenaVoiceMode = isProUser ? "handsfree" : "hold";
  const forgeOwnsFloor =
    turnState === "forge_speaking" || turnState === "forge_thinking";
  const outboundOpen = outboundMicOpenForState(turnState);

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
      for (const track of connection.localStream.getAudioTracks()) {
        track.enabled = !handsFreeMuted;
      }
      const wantOutbound = !handsFreeMuted && outboundOpen;
      setOutboundMicrophoneEnabled(connection, wantOutbound);
      // Mic "live" for UI when outbound open OR when we're locally monitoring.
      setMicLive(wantOutbound || (!handsFreeMuted && sessionActive));
      if (!handsFreeMuted) {
        startAnalyser(connection.localStream);
      } else {
        stopAnalyser();
        setUserSpeaking(false);
        setLevel(0);
      }
      return;
    }

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
    outboundOpen,
  ]);

  useEffect(() => {
    if (mode !== "handsfree" || !sessionActive) return;
    setHandsFreeState((s) => reduceHandsFreeState(s, { type: "SESSION_READY" }));
  }, [mode, sessionActive]);

  useEffect(() => {
    if (forgeOwnsFloor) {
      bargeFiredRef.current = false;
      sustainMsRef.current = 0;
      echoSamplesRef.current = [];
      userTurnFiredRef.current = false;
    } else if (turnState === "listening") {
      bargeFiredRef.current = false;
      userTurnFiredRef.current = false;
      sustainMsRef.current = 0;
      ambientSamplesRef.current = [];
      levelHistoryRef.current = [];
    } else if (turnState === "user_speaking" || turnState === "interrupted") {
      userTurnFiredRef.current = true;
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
      analyser.smoothingTimeConstant = 0.72;
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

        const history = levelHistoryRef.current;
        history.push(nextLevel);
        if (history.length > 16) history.shift();
        const modulation = levelModulation(history);
        const speechRatio = speechBandRatioFromSpectrum(data);

        const currentTurn = turnStateRef.current;
        const forgeSpeakingNow =
          currentTurn === "forge_speaking" || currentTurn === "forge_thinking";

        if (mode === "handsfree" && forgeSpeakingNow) {
          if (echoSamplesRef.current.length < 14) {
            echoSamplesRef.current.push(nextLevel);
            const samples = echoSamplesRef.current;
            echoFloorRef.current =
              samples.reduce((a, b) => a + b, 0) / samples.length;
          }

          const rising =
            nextLevel >= Math.max(0.28, echoFloorRef.current * 3.2);
          sustainMsRef.current = rising ? sustainMsRef.current + dt : 0;

          if (
            !bargeFiredRef.current &&
            isConfirmedBargeInLevel({
              level: nextLevel,
              echoFloor: echoFloorRef.current,
              sustainedMs: sustainMsRef.current,
              modulation,
              speechBandRatio: speechRatio,
            })
          ) {
            bargeFiredRef.current = true;
            setUserSpeaking(true);
            setHandsFreeState((s) =>
              reduceHandsFreeState(s, { type: "BARGE_IN" })
            );
            onBargeInRef.current?.(nextLevel);
          }
          return requestNext(tick);
        }

        if (mode === "handsfree" && currentTurn === "listening") {
          // Learn ambient floor from quieter frames.
          if (nextLevel < 0.14 && ambientSamplesRef.current.length < 24) {
            ambientSamplesRef.current.push(nextLevel);
            const samples = ambientSamplesRef.current;
            ambientFloorRef.current =
              samples.reduce((a, b) => a + b, 0) / Math.max(1, samples.length);
          }

          const rising =
            nextLevel >=
            Math.max(0.2, ambientFloorRef.current * 2.8);
          sustainMsRef.current = rising ? sustainMsRef.current + dt : 0;

          const intentional = isIntentionalSpeechSignal({
            level: nextLevel,
            ambientFloor: ambientFloorRef.current,
            sustainedMs: sustainMsRef.current,
            modulation,
            speechBandRatio: speechRatio,
          });

          setUserSpeaking(intentional);

          if (!userTurnFiredRef.current && intentional) {
            userTurnFiredRef.current = true;
            setHandsFreeState((s) =>
              reduceHandsFreeState(s, { type: "USER_SPEECH_STARTED" })
            );
            onUserTurnRef.current?.(nextLevel);
          } else if (!intentional) {
            silenceMsRef.current += dt;
            if (silenceMsRef.current > 2400) {
              setHandsFreeState((s) =>
                reduceHandsFreeState(s, { type: "LONG_SILENCE" })
              );
            }
          } else {
            silenceMsRef.current = 0;
          }
          return requestNext(tick);
        }

        // user_speaking / interrupted — UI level only; server owns end-of-turn.
        const speaking = nextLevel > 0.12;
        setUserSpeaking(speaking);
        if (mode === "handsfree" && speaking) {
          silenceMsRef.current = 0;
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
