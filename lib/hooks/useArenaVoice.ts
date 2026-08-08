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
  isConfirmedTalkOverBargeIn,
  levelFromFrequencyBins,
} from "@/lib/ce/echo-reference";
import {
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
  /** Forge speaking → talk-over confirmed against remote playback. */
  onConfirmedBargeIn?: (level: number) => void;
  /** Listening → confirmed intentional user turn (opens outbound). */
  onConfirmedUserTurn?: (level: number) => void;
};

/**
 * Dual-engine mic logic for Live Arena.
 *
 * Critical Pro insight: Forge TTS plays via HTMLAudioElement, so browser AEC
 * often fails on speakerphone. Barge-in must compare mic vs remote playback
 * envelope — absolute "speech-like" mic energy alone will cancel Forge.
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
  const remoteAnalyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const silenceMsRef = useRef(0);
  const lastTickRef = useRef<number | null>(null);
  const ambientFloorRef = useRef(0.06);
  const ambientSamplesRef = useRef<number[]>([]);
  const micHistoryRef = useRef<number[]>([]);
  const remoteHistoryRef = useRef<number[]>([]);
  const sustainMsRef = useRef(0);
  const bargeFiredRef = useRef(false);
  const userTurnFiredRef = useRef(false);
  const turnStateRef = useRef(turnState);
  turnStateRef.current = turnState;
  const onBargeInRef = useRef(onConfirmedBargeIn);
  onBargeInRef.current = onConfirmedBargeIn;
  const onUserTurnRef = useRef(onConfirmedUserTurn);
  onUserTurnRef.current = onConfirmedUserTurn;
  const connectionRef = useRef(connection);
  connectionRef.current = connection;

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
      setMicLive(wantOutbound || (!handsFreeMuted && sessionActive));
      if (!handsFreeMuted) {
        startAnalyser(connection);
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
      startAnalyser(connection);
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
    if (turnState === "forge_speaking") {
      bargeFiredRef.current = false;
      sustainMsRef.current = 0;
    } else if (turnState === "listening") {
      bargeFiredRef.current = false;
      userTurnFiredRef.current = false;
      sustainMsRef.current = 0;
      ambientSamplesRef.current = [];
      micHistoryRef.current = [];
      remoteHistoryRef.current = [];
    } else if (turnState === "user_speaking" || turnState === "interrupted") {
      userTurnFiredRef.current = true;
    } else if (turnState === "forge_thinking") {
      // Never carry a barge latch from a prior turn into thinking.
      bargeFiredRef.current = false;
      sustainMsRef.current = 0;
    }
  }, [turnState]);

  useEffect(() => {
    return () => {
      holdingRef.current = false;
      stopAnalyser();
    };
  }, []);

  function ensureRemoteAnalyser(ctx: AudioContext, remoteAudio: HTMLAudioElement) {
    if (remoteAnalyserRef.current) return remoteAnalyserRef.current;
    const srcObject = remoteAudio.srcObject;
    if (!(srcObject instanceof MediaStream)) return null;
    try {
      const remoteSource = ctx.createMediaStreamSource(srcObject);
      const remoteAnalyser = ctx.createAnalyser();
      remoteAnalyser.fftSize = 256;
      remoteAnalyser.smoothingTimeConstant = 0.7;
      remoteSource.connect(remoteAnalyser);
      // Do not connect remote analyser to destination — playback stays on <audio>.
      remoteAnalyserRef.current = remoteAnalyser;
      return remoteAnalyser;
    } catch {
      return null;
    }
  }

  function startAnalyser(conn: RealtimeConnection) {
    if (analyserRef.current) return;
    try {
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(conn.localStream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.72;
      source.connect(analyser);
      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      silenceMsRef.current = 0;
      lastTickRef.current = null;

      const micData = new Uint8Array(analyser.frequencyBinCount);
      const remoteData = new Uint8Array(analyser.frequencyBinCount);

      const tick = (now: number) => {
        const node = analyserRef.current;
        if (!node) return;
        const last = lastTickRef.current ?? now;
        const dt = Math.min(100, now - last);
        lastTickRef.current = now;

        node.getByteFrequencyData(micData);
        const nextLevel = levelFromFrequencyBins(micData);
        setLevel(nextLevel);

        const micHistory = micHistoryRef.current;
        micHistory.push(nextLevel);
        if (micHistory.length > 20) micHistory.shift();
        const modulation = levelModulation(micHistory);
        const speechRatio = speechBandRatioFromSpectrum(micData);

        let remoteLevel = 0;
        const remoteEl = connectionRef.current?.remoteAudio ?? null;
        const remoteNode = remoteEl
          ? ensureRemoteAnalyser(ctx, remoteEl)
          : null;
        if (remoteNode && remoteEl && !remoteEl.muted) {
          const buf =
            remoteData.length === remoteNode.frequencyBinCount
              ? remoteData
              : new Uint8Array(remoteNode.frequencyBinCount);
          remoteNode.getByteFrequencyData(buf);
          remoteLevel = levelFromFrequencyBins(buf);
        }
        const remoteHistory = remoteHistoryRef.current;
        remoteHistory.push(remoteLevel);
        if (remoteHistory.length > 20) remoteHistory.shift();

        const currentTurn = turnStateRef.current;

        // --- Forge speaking: talk-over vs echo reference ---
        if (mode === "handsfree" && currentTurn === "forge_speaking") {
          // Sustain on near-field presence; confirmation uses correlation.
          const rising = nextLevel >= 0.34;
          sustainMsRef.current = rising ? sustainMsRef.current + dt : 0;

          if (
            !bargeFiredRef.current &&
            isConfirmedTalkOverBargeIn({
              micLevel: nextLevel,
              remoteLevel,
              sustainedMs: sustainMsRef.current,
              modulation,
              speechBandRatio: speechRatio,
              micHistory,
              remoteHistory,
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

        // --- Forge thinking: no remote reference yet. Ambient must not cancel
        // the pending response; clear intentional speech may. ---
        if (mode === "handsfree" && currentTurn === "forge_thinking") {
          const rising =
            nextLevel >= Math.max(0.28, ambientFloorRef.current * 3.4);
          sustainMsRef.current = rising ? sustainMsRef.current + dt : 0;
          const intentional = isIntentionalSpeechSignal({
            level: nextLevel,
            ambientFloor: ambientFloorRef.current,
            sustainedMs: sustainMsRef.current,
            modulation,
            speechBandRatio: speechRatio,
            absoluteFloor: 0.28,
            ambientMultiplier: 3.4,
            minSustainMs: 520,
          });
          setUserSpeaking(intentional);
          if (!bargeFiredRef.current && intentional) {
            bargeFiredRef.current = true;
            setHandsFreeState((s) =>
              reduceHandsFreeState(s, { type: "BARGE_IN" })
            );
            onBargeInRef.current?.(nextLevel);
          }
          return requestNext(tick);
        }

        // --- Listening: outbound stays muted until intentional speech ---
        if (mode === "handsfree" && currentTurn === "listening") {
          if (nextLevel < 0.14 && ambientSamplesRef.current.length < 24) {
            ambientSamplesRef.current.push(nextLevel);
            const samples = ambientSamplesRef.current;
            ambientFloorRef.current =
              samples.reduce((a, b) => a + b, 0) / Math.max(1, samples.length);
          }

          const rising =
            nextLevel >= Math.max(0.24, ambientFloorRef.current * 3.2);
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

        const speaking = nextLevel > 0.12;
        setUserSpeaking(speaking);
        if (mode === "handsfree" && speaking) silenceMsRef.current = 0;

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
    remoteAnalyserRef.current = null;
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
    startAnalyser(connection);
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
