"use client";

import { useEffect, useRef, useState } from "react";
import {
  setMicrophoneEnabled,
  type RealtimeConnection,
} from "@/lib/ce/realtime";

export type ArenaVoiceMode = "hold" | "handsfree";

type Options = {
  isProUser: boolean;
  connection: RealtimeConnection | null;
  /** When true, Pro hands-free may keep the mic live. */
  canListen: boolean;
  /** Mute local mic while Forge speaks (both tiers). */
  forgeSpeaking: boolean;
};

/**
 * Dual-engine mic logic for Live Arena.
 * - Free: Hold-to-Talk (manual enable while pressing)
 * - Pro: Hands-free — mic stays open while listening; AnalyserNode drives
 *   presence-ring energy + speech detection UI (client-side VAD levels).
 *
 * Uses the existing Realtime MediaStream (no second getUserMedia).
 */
export function useArenaVoice({
  isProUser,
  connection,
  canListen,
  forgeSpeaking,
}: Options) {
  const [micLive, setMicLive] = useState(false);
  const [userSpeaking, setUserSpeaking] = useState(false);
  const [level, setLevel] = useState(0);
  const [handsFreeMuted, setHandsFreeMuted] = useState(false);
  const holdingRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const mode: ArenaVoiceMode = isProUser ? "handsfree" : "hold";

  useEffect(() => {
    if (!connection || connection.usedSilentMicFallback) {
      stopAnalyser();
      setMicrophoneEnabled(connection, false);
      setMicLive(false);
      setUserSpeaking(false);
      setLevel(0);
      return;
    }

    const wantOpen =
      !forgeSpeaking &&
      canListen &&
      (mode === "handsfree" ? !handsFreeMuted : holdingRef.current);

    setMicrophoneEnabled(connection, wantOpen);
    setMicLive(wantOpen);

    if (wantOpen) {
      startAnalyser(connection.localStream);
    } else {
      stopAnalyser();
      setUserSpeaking(false);
      setLevel(0);
    }

  }, [connection, canListen, forgeSpeaking, mode, handsFreeMuted]);

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

      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        const node = analyserRef.current;
        if (!node) return;
        node.getByteFrequencyData(data);
        let sum = 0;
        for (let i = 0; i < data.length; i += 1) sum += data[i];
        const avg = sum / (data.length * 255);
        const nextLevel = Math.min(1, avg * 2.4);
        setLevel(nextLevel);
        // Client-side energy VAD — filters ambient noise for UI / cost cues.
        setUserSpeaking(nextLevel > 0.08);
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
  }

  function startHoldToTalk() {
    if (mode !== "hold" || !connection || connection.usedSilentMicFallback) {
      return;
    }
    if (forgeSpeaking || !canListen) return;
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

  return {
    mode,
    micLive,
    userSpeaking,
    level,
    handsFreeMuted,
    startHoldToTalk,
    stopHoldToTalk,
    toggleHandsFreeMute,
  };
}
