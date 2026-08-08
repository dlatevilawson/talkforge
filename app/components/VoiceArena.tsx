"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import PresenceRing, {
  type PresenceRingState,
} from "@/app/components/arena/PresenceRing";
import BecomeProMemberButton from "@/app/components/billing/BecomeProMemberButton";
import {
  applyOutputBudget,
  cancelForgeResponse,
  clearInputAudioBuffer,
  connectRealtime,
  disconnectRealtime,
  duckRemoteForgeAudio,
  recoverMicrophone,
  requestHoldTurnResponse,
  requestOpeningSpeech,
  resumeRemoteAudio,
  setMicrophoneEnabled,
  setOutboundMicrophoneEnabled,
  unduckRemoteForgeAudio,
  type MicFallbackReason,
  type RealtimeConnection,
} from "@/lib/ce/realtime";
import { outputBudgetForTurn } from "@/lib/ce/voice-economics";
import { useArenaVoice } from "@/lib/hooks/useArenaVoice";
import {
  CE_REALTIME_MODEL,
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
import {
  completeVoiceUsageTracking,
  reportVoiceUsageEvent,
  startVoiceUsageTracking,
} from "@/lib/ce/voice-usage-client";
import {
  isForgeOutputEventType,
  logTurnTransition,
  memberOwnsFloor,
  outboundMicOpenForState,
  reduceTurnState,
  shouldSurfaceRealtimeError,
  type TurnState,
} from "@/lib/ce/handsfree-turntaking";
import {
  type ArenaVoiceMode,
  resolveArenaVoiceMode,
} from "@/lib/ce/voice-mode";
import {
  COMPLIMENTARY_COMPLETE_BODY,
  COMPLIMENTARY_COMPLETE_HEADLINE,
  MAYBE_LATER_CTA,
  MEANINGFUL_PROGRESS_LINE,
} from "@/lib/billing/member-copy";
import { voiceTurnsToConversationTurns } from "@/lib/coach/report";
import {
  completePracticeSession,
  createPracticeSession,
  persistActiveSession,
} from "@/lib/session";
import { getUser } from "@/lib/storage";
import type { PracticeSession } from "@/lib/types";

type WrapStage = "coaching" | "membership";

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
  const [liveConnection, setLiveConnection] =
    useState<RealtimeConnection | null>(null);
  const [momentum, setMomentum] = useState<Momentum | null>(null);
  const [momentumLoading, setMomentumLoading] = useState(false);
  const [savedSessionId, setSavedSessionId] = useState<string | null>(null);
  const [sessionPersisted, setSessionPersisted] = useState(false);
  const [completionError, setCompletionError] = useState("");
  const [completionRetryPending, setCompletionRetryPending] = useState(false);
  const [welcomeLine, setWelcomeLine] = useState("");
  const [remoteAudioBlocked, setRemoteAudioBlocked] = useState(false);
  const [complimentaryComplete, setComplimentaryComplete] = useState(false);
  const [wrapStage, setWrapStage] = useState<WrapStage>("coaching");
  const [isProUser, setIsProUser] = useState(false);
  const [voiceMode, setVoiceMode] = useState<ArenaVoiceMode>("hold");
  const [repsRemaining, setRepsRemaining] = useState<number | null>(null);
  const usageIdRef = useRef<string | null>(null);
  const handsFreeRef = useRef(false);
  const phaseRef = useRef<Phase>("idle");
  /** After confirmed barge-in, ignore stale Forge audio events briefly. */
  const ignoreForgeAudioUntilRef = useRef(0);
  const turnStateRef = useRef<TurnState>("listening");
  const activeResponseIdRef = useRef<string | null>(null);
  const pendingBudgetRef = useRef<number | null>(null);
  const [turnState, setTurnState] = useState<TurnState>("listening");
  const handsFree = voiceMode === "handsfree";

  const showDevDiagnostics = process.env.NODE_ENV === "development";

  const sessionActive =
    micMode === "microphone" &&
    (phase === "speaking" ||
      phase === "listening" ||
      phase === "connected");

  function applyTurn(
    event: Parameters<typeof reduceTurnState>[1],
    extras?: { responseId?: string }
  ) {
    const transition = reduceTurnState(turnStateRef.current, event);
    logTurnTransition(transition);
    if (transition.from !== transition.to) {
      turnStateRef.current = transition.to;
      setTurnState(transition.to);
      pushEvent(
        `Turn ${transition.from}→${transition.to} · ${transition.reason}`
      );
    } else if (
      transition.reason.startsWith("ignore_") ||
      transition.cancelForge
    ) {
      pushEvent(`Turn hold · ${transition.reason}`);
    }

    // Hands-free floor ownership only. Hold-to-talk must not duck/cancel/mute
    // from this FSM — the hold button owns the mic exclusively.
    if (handsFreeRef.current) {
      if (transition.cancelForge) {
        // Natural yield — cancel + duck. Never surface as hitch/error.
        setError("");
        duckRemoteForgeAudio(connectionRef.current);
        cancelForgeResponse(connectionRef.current);
        activeResponseIdRef.current = null;
        ignoreForgeAudioUntilRef.current = Date.now() + 1200;
        pushEvent("Natural yield · Forge gave the floor");
      } else if (transition.duckForgeAudio) {
        duckRemoteForgeAudio(connectionRef.current);
      } else if (
        transition.to === "forge_speaking" ||
        transition.to === "forge_thinking"
      ) {
        unduckRemoteForgeAudio(connectionRef.current);
      }

      if (connectionRef.current) {
        const wantOutbound =
          transition.openOutboundMic && outboundMicOpenForState(transition.to);
        if (wantOutbound) {
          clearInputAudioBuffer(connectionRef.current);
        }
        setOutboundMicrophoneEnabled(connectionRef.current, wantOutbound);
      }
    }

    if (
      extras?.responseId &&
      event.type === "FORGE_RESPONSE_CREATED" &&
      transition.to === "forge_thinking"
    ) {
      activeResponseIdRef.current = extras.responseId;
    }
    if (
      event.type === "FORGE_RESPONSE_DONE" &&
      !memberOwnsFloor(transition.to)
    ) {
      activeResponseIdRef.current = null;
    }

    return transition;
  }

  const forgeLive =
    phase === "speaking" ||
    turnState === "forge_speaking" ||
    turnState === "forge_thinking";

  const voice = useArenaVoice({
    voiceMode,
    connection: liveConnection,
    sessionActive,
    turnState,
    forgeLive,
    onConfirmedBargeIn: (level) => {
      if (!handsFreeRef.current) return;
      applyTurn({ type: "CONFIRMED_BARGE_IN", level });
      trackUsage("barge_in");
      // Stay in-session listening chrome — never error/restart.
      setPhase("listening");
      voiceRef.current.onBargeIn();
    },
    onConfirmedUserTurn: (level) => {
      if (!handsFreeRef.current) return;
      // Listening → member turn only after local intentional-speech confirm.
      const transition = applyTurn({
        type: "USER_SPEECH_STARTED",
        source: "local_energy",
      });
      if (transition.to === "user_speaking") {
        setPhase("listening");
        pushEvent(
          `Intentional speech · open mic · level ${level.toFixed(2)}`
        );
      }
    },
  });
  const voiceRef = useRef(voice);
  voiceRef.current = voice;
  handsFreeRef.current = handsFree;
  phaseRef.current = phase;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      lifecycleGenerationRef.current += 1;
      const usageId = usageIdRef.current;
      usageIdRef.current = null;
      if (usageId) {
        void completeVoiceUsageTracking({ usageId });
      }
      disconnectRealtime(connectionRef.current);
      connectionRef.current = null;
      setLiveConnection(null);
      setActiveVoiceSessionId(null);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/billing/entitlement", { cache: "no-store" })
      .then((r) => r.json())
      .then(
        (data: {
          entitlement?: {
            plan?: string;
            reason?: string;
            sessionsRemaining?: number | null;
          };
        }) => {
          if (cancelled) return;
          const ent = data.entitlement;
          const pro =
            ent?.plan === "pro" ||
            ent?.reason === "pro" ||
            ent?.reason === "staff";
          setIsProUser(Boolean(pro));
          setVoiceMode(resolveArenaVoiceMode({ planIsPro: Boolean(pro) }));
          setRepsRemaining(
            typeof ent?.sessionsRemaining === "number"
              ? ent.sessionsRemaining
              : null
          );
        }
      )
      .catch(() => undefined);
    return () => {
      cancelled = true;
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

  function trackUsage(
    event: "assistant_turn" | "user_speech" | "barge_in" | "assistant_text",
    text?: string
  ) {
    const usageId = usageIdRef.current;
    if (!usageId) return;
    void reportVoiceUsageEvent({ usageId, event, text }).then((advice) => {
      if (!advice?.maxOutputTokens) return;
      // Defer session.update until Forge is not speaking — avoids mid-utterance churn.
      if (
        turnStateRef.current === "forge_speaking" ||
        turnStateRef.current === "forge_thinking"
      ) {
        pendingBudgetRef.current = advice.maxOutputTokens;
        return;
      }
      applyOutputBudget(connectionRef.current, advice.maxOutputTokens);
    });
  }

  function handleServerEvent(event: Record<string, unknown>) {
    const type = typeof event.type === "string" ? event.type : "event";

    // Only Forge OUTPUT events own the speaking phase — never input mic/"audio" events.
    if (
      isForgeOutputEventType(type) &&
      Date.now() >= ignoreForgeAudioUntilRef.current
    ) {
      // Hold-to-talk: mute immediately so speaker echo cannot cut Forge off.
      if (!handsFreeRef.current) {
        voiceRef.current.onForgeStarted();
        setMicrophoneEnabled(connectionRef.current, false);
        setOutboundMicrophoneEnabled(connectionRef.current, false);
        clearInputAudioBuffer(connectionRef.current);
      }
      setPhase((current) =>
        current === "connecting" ||
        current === "speaking" ||
        current === "listening" ||
        current === "connected"
          ? "speaking"
          : current
      );
    }

    if (type === "response.created") {
      if (Date.now() >= ignoreForgeAudioUntilRef.current) {
        const responseId =
          typeof event.response_id === "string"
            ? event.response_id
            : event.response &&
                typeof event.response === "object" &&
                typeof (event.response as { id?: unknown }).id === "string"
              ? ((event.response as { id: string }).id)
              : undefined;
        // Guard duplicate/recursive create for the same active response id.
        if (
          responseId &&
          activeResponseIdRef.current &&
          activeResponseIdRef.current === responseId
        ) {
          pushEvent(`Turn hold · duplicate_response_created_${responseId}`);
        } else {
          // Mute before any further turn work — Forge owns the floor now.
          if (!handsFreeRef.current) {
            voiceRef.current.onForgeStarted();
            setMicrophoneEnabled(connectionRef.current, false);
            setOutboundMicrophoneEnabled(connectionRef.current, false);
            clearInputAudioBuffer(connectionRef.current);
            pushEvent("Mic muted · Forge speaking");
          }
          applyTurn(
            { type: "FORGE_RESPONSE_CREATED", responseId },
            { responseId }
          );
          voiceRef.current.onForgeStarted();
          trackUsage("assistant_turn");
          pushEvent(
            `Response start · ${responseId ?? "unknown"} · reason=server_or_opening`
          );
        }
      }
    }

    if (
      type === "response.output_audio.delta" ||
      type === "response.audio.delta"
    ) {
      if (Date.now() >= ignoreForgeAudioUntilRef.current) {
        applyTurn({ type: "FORGE_AUDIO_DELTA" });
      }
    }

    if (type === "response.done") {
      const responseId =
        typeof event.response_id === "string" ? event.response_id : undefined;
      applyTurn({ type: "FORGE_RESPONSE_DONE", responseId });
      setPhase((current) =>
        current === "speaking"
          ? "listening"
          : current === "connecting"
            ? "connected"
            : current
      );
      voiceRef.current.onForgeDone();
      if (pendingBudgetRef.current != null) {
        applyOutputBudget(connectionRef.current, pendingBudgetRef.current);
        pendingBudgetRef.current = null;
      }
      pushEvent(
        `Response done · ${responseId ?? "unknown"} · no auto-restart`
      );
    }

    if (type === "input_audio_buffer.speech_started") {
      // Hold mode: any speech_started while Forge is live is echo — remute.
      if (
        !handsFreeRef.current &&
        (phaseRef.current === "speaking" ||
          turnStateRef.current === "forge_speaking" ||
          turnStateRef.current === "forge_thinking")
      ) {
        setMicrophoneEnabled(connectionRef.current, false);
        setOutboundMicrophoneEnabled(connectionRef.current, false);
        clearInputAudioBuffer(connectionRef.current);
        pushEvent("Ignored speech_started · mic muted while Forge speaks");
        return;
      }
      // Hold mode: speech while button is down — mark for reply-on-release.
      // Do NOT treat this as permission for Forge to talk (create_response off).
      if (!handsFreeRef.current) {
        voiceRef.current.noteHoldSpeech();
        pushEvent("Member speech · holding · Forge waits for release");
        return;
      }
      // CRITICAL: never response.cancel from bare server VAD — phone echo
      // falsely fires this while Forge TTS plays over the speaker.
      const transition = applyTurn({
        type: "USER_SPEECH_STARTED",
        source: "server_vad",
      });
      if (
        transition.to === "user_speaking" ||
        transition.to === "interrupted"
      ) {
        setPhase("listening");
        pushEvent("Member speech detected");
      } else {
        pushEvent("Ignored speech_started · not confirmed barge-in");
      }
    }

    if (type === "input_audio_buffer.speech_stopped") {
      // Hold mode: do not advance floor ownership from server VAD during Forge.
      if (
        !handsFreeRef.current &&
        (phaseRef.current === "speaking" ||
          turnStateRef.current === "forge_speaking" ||
          turnStateRef.current === "forge_thinking")
      ) {
        setMicrophoneEnabled(connectionRef.current, false);
        setOutboundMicrophoneEnabled(connectionRef.current, false);
        clearInputAudioBuffer(connectionRef.current);
        pushEvent("Ignored speech_stopped · Forge still owns the floor");
        return;
      }
      // Hold mode: pauses while holding are thinking time — wait for release.
      if (!handsFreeRef.current) {
        pushEvent("Speech pause · still holding · Forge waits");
        return;
      }
      applyTurn({ type: "USER_SPEECH_STOPPED", source: "server_vad" });
      voiceRef.current.onUserSpeechStopped();
    }

    if (type === "error") {
      // Realtime API errors (including response.cancel) are NOT connection
      // failures. Never show hitch copy here — peer `failed` owns recovery UI.
      pushEvent(`Server error: ${JSON.stringify(event).slice(0, 120)}`);
      const peer = connectionRef.current?.pc.connectionState ?? null;
      if (
        !shouldSurfaceRealtimeError(event, turnStateRef.current, peer)
      ) {
        return;
      }
      // Belt-and-suspenders: even if classifier changes, never hitch mid-session.
      return;
    }

    const { turns: next, added } = applyRealtimeTranscriptEvent(
      turnsRef.current,
      event
    );
    if (added) {
      turnsRef.current = next;
      setTurns(next);
      persistTurns(next);
      if (added.role === "forge") {
        trackUsage("assistant_text", added.text);
      } else if (added.role === "founder") {
        trackUsage("user_speech", added.text);
      }
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
    setLiveConnection(null);
    setEvents([]);
    setMomentum(null);
    setSavedSessionId(null);
    setSessionPersisted(false);
    setCompletionError("");
    setCompletionRetryPending(false);
    setRemoteAudioBlocked(false);
    setComplimentaryComplete(false);
    setWrapStage("coaching");
    practiceSessionRef.current = null;
    const priorUsage = usageIdRef.current;
    usageIdRef.current = null;
    if (priorUsage) {
      void completeVoiceUsageTracking({ usageId: priorUsage });
    }
    turnStateRef.current = "listening";
    setTurnState("listening");
    activeResponseIdRef.current = null;
    pendingBudgetRef.current = null;
    ignoreForgeAudioUntilRef.current = 0;
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
        model?: string;
        error?: string;
        voiceMode?: "handsfree" | "hold";
        entitlement?: {
          plan?: string;
          sessionsRemaining?: number | null;
          sessionsLimit?: number | null;
        };
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

      const planIsPro = tokenData.entitlement?.plan === "pro";
      const sessionVoiceMode: ArenaVoiceMode =
        tokenData.voiceMode === "handsfree" || tokenData.voiceMode === "hold"
          ? tokenData.voiceMode
          : resolveArenaVoiceMode({ planIsPro });
      setIsProUser(Boolean(planIsPro));
      setVoiceMode(sessionVoiceMode);
      if (typeof tokenData.entitlement?.sessionsRemaining === "number") {
        setRepsRemaining(tokenData.entitlement.sessionsRemaining);
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
      setLiveConnection(connection);
      pushEvent(
        `Voice build · minimal-coach-v1 · mode=${sessionVoiceMode}`
      );

      if (!connection.usedSilentMicFallback) {
        // Start muted; hold-to-talk opens only while the button is pressed.
        setMicrophoneEnabled(connection, false);
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

      usageIdRef.current = await startVoiceUsageTracking({
        practiceSessionId: practice.id,
        realtimeSessionId: realtimeSessionIdRef.current,
        plan: planIsPro ? "pro" : "free",
        voiceMode: sessionVoiceMode,
        model:
          typeof tokenData.model === "string"
            ? tokenData.model
            : CE_REALTIME_MODEL,
      });

      setPhase("speaking");
      const openingBudget = outputBudgetForTurn("opening", false);
      applyOutputBudget(connection, openingBudget);
      requestOpeningSpeech(connection.dc, welcomeHintRef.current, {
        eventTitle: eventTitle?.trim() || undefined,
        isReturning: Boolean(tokenData.memory?.isReturning),
      });
      pushEvent(
        tokenData.memory?.isReturning
          ? `Forge opening · returning member · budget ${openingBudget}`
          : `Forge opening · first session · budget ${openingBudget}`
      );
    } catch (err) {
      console.error(err);
      const usageId = usageIdRef.current;
      usageIdRef.current = null;
      if (usageId) {
        void completeVoiceUsageTracking({ usageId });
      }
      disconnectRealtime(connectionRef.current);
      connectionRef.current = null;
      setLiveConnection(null);
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
      pushEvent("Microphone ready");
      return;
    }
    pushEvent("Microphone still unavailable");
  }

  function handleSpeakDown() {
    // Forge talks uninterrupted until he finishes — then hold opens the mic.
    if (
      phase === "speaking" ||
      turnStateRef.current === "forge_speaking" ||
      turnStateRef.current === "forge_thinking"
    ) {
      pushEvent("Hold ignored · Forge still speaking");
      return;
    }
    voice.startHoldToTalk();
    if (phase === "connected" || phase === "listening") {
      setPhase("listening");
    }
  }

  function handleSpeakUp() {
    const { spoke } = voice.stopHoldToTalk();
    // Hold-to-talk: Forge responds only after release — never mid-pause.
    // create_response is false in session config for this reason.
    if (!spoke || !connectionRef.current) {
      if (!spoke) pushEvent("Hold released · no speech · waiting");
      return;
    }
    const requested = requestHoldTurnResponse(connectionRef.current);
    pushEvent(
      requested
        ? "Hold released · listen-first response requested"
        : "Hold released · response request failed"
    );
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
    voiceRef.current.onSessionEnd();
    const usageId = usageIdRef.current;
    usageIdRef.current = null;
    if (usageId) {
      void completeVoiceUsageTracking({
        usageId,
        practiceSessionId: practiceSessionRef.current?.id ?? null,
      });
    }
    lifecycleGenerationRef.current += 1;
    disconnectRealtime(connectionRef.current);
    connectionRef.current = null;
    setLiveConnection(null);
    setActiveVoiceSessionId(null);
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

    // After the final complimentary session, check entitlement only once the
    // wrap is ready — upgrade moment follows coaching, never a meter.
    try {
      const entRes = await fetch("/api/billing/entitlement", {
        cache: "no-store",
      });
      if (entRes.ok) {
        const entData = (await entRes.json()) as {
          entitlement?: {
            canStartPractice?: boolean;
            reason?: string;
          };
        };
        if (
          entData.entitlement?.canStartPractice === false &&
          entData.entitlement.reason === "free_limit_reached"
        ) {
          if (mountedRef.current) {
            setComplimentaryComplete(true);
            setWrapStage("coaching");
          }
        }
      }
    } catch {
      // Soft check — never block session wrap.
    }

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
  const micLive = voice.micLive;

  const ringState: PresenceRingState =
    phase === "momentum"
      ? "wrap"
      : handsFree &&
          (turnState === "forge_speaking" || turnState === "forge_thinking")
        ? "forge_speaking"
        : phase === "speaking"
          ? "forge_speaking"
          : phase === "listening" ||
              micLive ||
              voice.userSpeaking ||
              (handsFree &&
                (turnState === "user_speaking" || turnState === "interrupted"))
            ? "listening"
            : phase === "minting" || phase === "connecting"
              ? "connecting"
              : "idle";

  const presenceLabel =
    phase === "idle"
      ? undefined
      : phase === "minting" || phase === "connecting"
        ? "Connecting"
        : phase === "momentum"
          ? "Rep Complete"
          : phase === "error"
            ? "Connection lost"
            : handsFree
              ? voice.handsFreeMuted
                ? "Mic muted"
                : voice.handsFreeLabel ?? "Speak naturally"
              : phase === "speaking"
                ? "Forge speaking"
                : micLive
                  ? "Listening"
                  : "Your turn";

  const statusBadge = handsFree
    ? "PRO HANDS-FREE"
    : isProUser
      ? "PRO · HOLD TO SPEAK"
      : repsRemaining != null
        ? `${repsRemaining} REP${repsRemaining === 1 ? "" : "S"} LEFT`
        : "HOLD TO SPEAK";

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[#000000] text-white">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_28%,rgba(212,175,55,0.12),transparent_52%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_85%,rgba(13,13,14,0.9),#000000_70%)]"
        aria-hidden
      />

      <div className="relative mx-auto flex min-h-[100dvh] max-w-3xl flex-col px-5 pb-8 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-8">
        <header className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
          <Link
            href="/app"
            className="justify-self-start text-[10px] font-semibold uppercase tracking-[0.22em] text-[#D4AF37]/70 transition hover:text-[#D4AF37]"
          >
            TalkForge Arena
          </Link>
          <span className="justify-self-center rounded-full border border-[#D4AF37]/20 bg-[#D4AF37]/08 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#D4AF37]/90">
            {statusBadge}
          </span>
          {inSession ? (
            <button
              type="button"
              onClick={() => void handleStop()}
              className="justify-self-end text-sm text-white/40 transition hover:text-white/75"
            >
              End Session
            </button>
          ) : (
            <span className="justify-self-end text-sm text-white/25">
              {phase === "momentum" ? "Session wrap" : ""}
            </span>
          )}
        </header>

        <section className="flex flex-1 flex-col items-center pb-6 pt-10 text-center">
          {phase === "idle" ? (
            <>
              <PresenceRing state="idle" />
              <p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#D4AF37]/70">
                Coach Forge
              </p>
              <h1 className="mt-4 max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">
                {eventTitle?.trim() || "I’m ready when you are"}
              </h1>
              <p className="mt-5 max-w-md text-base leading-7 text-white/50">
                {handsFree
                  ? "Hands-free coaching is ready. Begin when you want an uninterrupted room."
                  : isProUser
                    ? "You don’t have to perform here. Hold to speak when you’re ready."
                    : "You don’t have to perform here. Hold to speak when you’re ready — or unlock Hands-Free with Pro."}
              </p>
              {welcomeLine ? (
                <p className="mt-3 max-w-md text-sm leading-6 text-[#d7b56a]/85">
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
              {complimentaryComplete && wrapStage === "membership" ? (
                <>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#c9a95f]">
                    Coach Forge
                  </p>
                  <h1 className="mt-6 max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
                    {COMPLIMENTARY_COMPLETE_HEADLINE}
                  </h1>
                  <div className="mt-5 max-w-md space-y-3 text-base leading-7 text-white/55">
                    {COMPLIMENTARY_COMPLETE_BODY.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>
                  <div className="mt-10 flex w-full max-w-sm flex-col gap-3">
                    <BecomeProMemberButton source="post_session_complimentary" />
                    <Link
                      href="/app"
                      className="rounded-full border border-white/10 px-8 py-3.5 text-sm text-white/55 transition hover:bg-white/10"
                    >
                      {MAYBE_LATER_CTA}
                    </Link>
                  </div>
                  {savedSessionId ? (
                    <Link
                      href={`/app/reflect/${savedSessionId}`}
                      className="mt-8 text-sm text-white/40 underline-offset-4 hover:underline"
                    >
                      Reflect on this session
                    </Link>
                  ) : null}
                </>
              ) : (
                <>
                  <PresenceRing state="wrap" label="Rep Complete" />
                  <h1 className="mt-10 max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
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
                      <div className="rounded-2xl border border-[#d7b56a]/30 bg-[#c9a95f]/10 px-5 py-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-[#d7b56a]/80">
                          What improved today
                        </p>
                        <p className="mt-2 text-base leading-7 text-white">
                          {momentum.strength}
                        </p>
                        {complimentaryComplete ? (
                          <p className="mt-3 text-sm leading-6 text-[#e0c07a]/90">
                            {MEANINGFUL_PROGRESS_LINE}
                          </p>
                        ) : null}
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-white/40">
                          Improve
                        </p>
                        <p className="mt-2 text-base leading-7 text-white/90">
                          {momentum.improve}
                        </p>
                      </div>
                      <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
                        <p className="text-xs uppercase tracking-[0.2em] text-white/40">
                          Try next
                        </p>
                        <p className="mt-2 text-base leading-7 text-white/90">
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
                          {completionRetryPending
                            ? "Saving…"
                            : "Try saving again"}
                        </button>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                    {complimentaryComplete && !momentumLoading ? (
                      <button
                        type="button"
                        onClick={() => setWrapStage("membership")}
                        className="rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black transition hover:bg-white/90"
                      >
                        Continue
                      </button>
                    ) : savedSessionId ? (
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
              )}
            </>
          ) : (
            <>
              <PresenceRing
                state={ringState}
                level={voice.level}
                label={presenceLabel}
              />

              {lastForge && phase !== "speaking" ? (
                <p className="mt-10 max-w-lg text-base leading-7 text-white/55 line-clamp-3">
                  {lastForge.text}
                </p>
              ) : null}

              {error && (
                <p className="mt-6 max-w-md text-sm text-red-300" role="alert">
                  {error}
                </p>
              )}

              {remoteAudioBlocked ? (
                <button
                  type="button"
                  onClick={() => void handleResumeRemoteAudio()}
                  className="mt-5 rounded-full border border-[#D4AF37]/30 px-5 py-2.5 text-sm text-[#e7d6b1] transition hover:bg-[#D4AF37]/10"
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

              <div className="mt-auto w-full max-w-lg pt-12">
                <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 px-4 py-4 backdrop-blur-lg sm:px-5">
                  {handsFree ? (
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-sm text-[#D4AF37]/90">
                        Hands-Free Active — Speak Naturally
                      </p>
                      <button
                        type="button"
                        onClick={() => voice.toggleHandsFreeMute()}
                        disabled={
                          !inSession ||
                          phase === "minting" ||
                          phase === "connecting" ||
                          micMode !== "microphone"
                        }
                        className="rounded-full border border-white/12 px-4 py-2 text-xs font-medium uppercase tracking-[0.12em] text-white/70 transition hover:bg-white/5 disabled:opacity-35"
                      >
                        {voice.handsFreeMuted ? "Unmute Mic" : "Mute Mic"}
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <button
                        type="button"
                        disabled={
                          !inSession ||
                          phase === "minting" ||
                          phase === "connecting" ||
                          phase === "speaking" ||
                          micMode !== "microphone"
                        }
                        onPointerDown={(event) => {
                          event.currentTarget.setPointerCapture(event.pointerId);
                          handleSpeakDown();
                        }}
                        onPointerUp={(event) => {
                          if (
                            event.currentTarget.hasPointerCapture(event.pointerId)
                          ) {
                            event.currentTarget.releasePointerCapture(
                              event.pointerId
                            );
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
                        className={`min-w-[12rem] rounded-full px-10 py-3.5 text-sm font-semibold transition disabled:opacity-35 ${
                          micLive
                            ? "bg-[#D4AF37] text-black"
                            : "bg-white text-black hover:bg-white/90"
                        }`}
                      >
                        {micLive ? "Listening" : "Hold to speak"}
                      </button>
                      {!isProUser ? (
                        <Link
                          href="/membership"
                          className="text-xs text-[#D4AF37]/75 transition hover:text-[#D4AF37]"
                        >
                          Unlock Hands-Free Streaming with Pro →
                        </Link>
                      ) : (
                        <p className="text-xs text-white/35">
                          Hold to speak — stable coaching mode
                        </p>
                      )}
                    </div>
                  )}

                  {/* Restart only when the realtime session truly cannot recover. */}
                  {phase === "error" ? (
                    <div className="mt-3 flex justify-center gap-3">
                      <button
                        type="button"
                        onClick={handleStart}
                        className="text-xs text-white/40 transition hover:text-white/70"
                      >
                        Restart
                      </button>
                      <Link
                        href="/app"
                        className="text-xs text-white/40 transition hover:text-white/70"
                      >
                        Back to home
                      </Link>
                    </div>
                  ) : null}
                </div>
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
