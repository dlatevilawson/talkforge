"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import PresenceRing, {
  type PresenceRingState,
} from "@/app/components/arena/PresenceRing";
import ArenaConversation from "@/app/components/arena/ArenaConversation";
import BecomeProMemberButton from "@/app/components/billing/BecomeProMemberButton";
import {
  createIdleAssessmentState,
  decideAssessmentAfterUserUtterance,
  decideAssessmentClosingStrategy,
  decideAssessmentResponseCreated,
  decideAssessmentResponseDone,
  decideAssessmentUserTurnEnd,
  decideAssessmentVadEvent,
  buildAssessmentSnapshot,
  forgeTextLooksLikeContentQuestion,
  looksLikeForgeAssessmentSoftClose,
  persistAssessmentSnapshotClient,
  reduceAssessmentLifecycle,
  resolveAssessmentTurnSlot,
  startAssessmentLifecycle,
  type AssessmentLifecycleEffect,
  type AssessmentLifecycleState,
  type AssessmentSlotId,
} from "@/lib/ce/assessment-lifecycle";
import {
  applyOutputBudget,
  cancelForgeResponse,
  clearInputAudioBuffer,
  connectRealtime,
  disconnectRealtime,
  duckRemoteForgeAudio,
  lockAssessmentAutoResponses,
  recoverMicrophone,
  requestAssessmentClosingSpeech,
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
  type CeSessionMode,
  type CeTrack,
} from "@/lib/ce/session-config";
import type { PresenceScores } from "@/lib/system1/assessment";
import {
  applyRealtimeTranscriptEvent,
  extractLiveTranscriptDelta,
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
  mode?: CeSessionMode;
  handoffSource?: string;
};

type AssessmentWrap = {
  ready: boolean;
  profileSource: string | null;
  goals: string[];
  strengths: string[];
  challenges: string[];
  presenceScores: PresenceScores | null;
  corePattern: string | null;
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
  mode = "practice",
  handoffSource,
}: VoiceArenaProps) {
  const router = useRouter();
  const isAssessment = mode === "assessment";
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
  const assessmentLifecycleRef = useRef<AssessmentLifecycleState>(
    isAssessment ? startAssessmentLifecycle() : createIdleAssessmentState()
  );
  /** Closing speech was sent — next matching response.done navigates. */
  const assessmentClosingSentRef = useRef(false);
  /** Wait for in-flight done before sending the privileged closing. */
  const assessmentPendingClosingAfterDoneRef = useRef(false);
  /** Defer mid-turn create until founder transcript is reduced. */
  const assessmentAwaitingTranscriptTurnRef = useRef(false);
  const assessmentClosingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const assessmentTranscriptTurnTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const assessmentNavigatedRef = useRef(false);

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
  const [liveForgeDraft, setLiveForgeDraft] = useState("");
  const [liveUserDraft, setLiveUserDraft] = useState("");
  /** Keep joining chrome visible briefly so autoStart never flashes Hold-to-speak. */
  const [joinGateHold, setJoinGateHold] = useState(false);
  const joinGateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [liveConnection, setLiveConnection] =
    useState<RealtimeConnection | null>(null);
  const [momentum, setMomentum] = useState<Momentum | null>(null);
  const [momentumLoading, setMomentumLoading] = useState(false);
  const [assessmentWrap, setAssessmentWrap] = useState<AssessmentWrap | null>(
    null
  );
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
  const [assessmentStatusLabel, setAssessmentStatusLabel] = useState<
    AssessmentLifecycleState["assessmentStatus"] | null
  >(isAssessment ? "active" : null);
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

  function syncAssessmentLifecycle(next: AssessmentLifecycleState) {
    assessmentLifecycleRef.current = next;
    setAssessmentStatusLabel(next.assessmentMode ? next.assessmentStatus : null);
  }

  /** App-owned slot for the next Forge assessment mid-turn (Step 3). */
  function assessmentTurnSlot(): AssessmentSlotId | null {
    return resolveAssessmentTurnSlot(assessmentLifecycleRef.current);
  }

  function clearAssessmentTranscriptTurnTimer() {
    if (assessmentTranscriptTurnTimerRef.current) {
      clearTimeout(assessmentTranscriptTurnTimerRef.current);
      assessmentTranscriptTurnTimerRef.current = null;
    }
  }

  function muteAssessmentTerminalMic(reason: string) {
    setMicrophoneEnabled(connectionRef.current, false);
    setOutboundMicrophoneEnabled(connectionRef.current, false);
    clearInputAudioBuffer(connectionRef.current);
    pushEvent(`Assessment mic locked · ${reason}`);
  }

  function sendAssessmentClosingSpeech(reason: string) {
    if (assessmentClosingSentRef.current) return;
    const life = assessmentLifecycleRef.current;
    if (
      life.assessmentStatus !== "complete" ||
      !life.finalResponseRequested ||
      life.finalResponseDelivered
    ) {
      return;
    }
    lockAssessmentAutoResponses(connectionRef.current);
    muteAssessmentTerminalMic("closing");
    const sent = requestAssessmentClosingSpeech(connectionRef.current);
    assessmentClosingSentRef.current = sent;
    assessmentPendingClosingAfterDoneRef.current = false;
    pushEvent(
      sent
        ? `Assessment closing · ${reason}`
        : `Assessment closing failed · ${reason}`
    );
  }

  function requestAssessmentClosingOnce(reason: string) {
    if (assessmentClosingSentRef.current) return;
    if (assessmentClosingTimerRef.current) {
      clearTimeout(assessmentClosingTimerRef.current);
      assessmentClosingTimerRef.current = null;
    }
    clearAssessmentTranscriptTurnTimer();
    assessmentAwaitingTranscriptTurnRef.current = false;
    lockAssessmentAutoResponses(connectionRef.current);
    muteAssessmentTerminalMic(reason);

    const forgeBusy =
      turnStateRef.current === "forge_speaking" ||
      turnStateRef.current === "forge_thinking" ||
      activeResponseIdRef.current != null;

    const strategy = decideAssessmentClosingStrategy({
      closingSent: assessmentClosingSentRef.current,
      forgeBusy,
    });

    if (strategy === "queue_after_done") {
      // Do NOT cancel in-flight audio — avoids half-response + cancel hitch.
      assessmentPendingClosingAfterDoneRef.current = true;
      pushEvent(`Assessment closing queued · ${reason}`);
      assessmentClosingTimerRef.current = setTimeout(() => {
        assessmentClosingTimerRef.current = null;
        if (!mountedRef.current || assessmentClosingSentRef.current) return;
        sendAssessmentClosingSpeech(`${reason}_timeout`);
      }, 1200);
      return;
    }

    if (strategy === "send_now") {
      assessmentClosingTimerRef.current = setTimeout(() => {
        assessmentClosingTimerRef.current = null;
        if (!mountedRef.current) return;
        sendAssessmentClosingSpeech(reason);
      }, 40);
    }
  }

  function armAssessmentClientTurn(reason: string) {
    const decision = decideAssessmentUserTurnEnd(
      assessmentLifecycleRef.current,
      { closingSent: assessmentClosingSentRef.current }
    );
    if (decision.action === "ignore_terminal") {
      muteAssessmentTerminalMic(reason);
      pushEvent(`Assessment turn ignored · ${reason}`);
      return;
    }
    if (decision.action === "request_closing") {
      requestAssessmentClosingOnce(reason);
      return;
    }
    assessmentAwaitingTranscriptTurnRef.current = true;
    clearAssessmentTranscriptTurnTimer();
    // Transcript usually arrives quickly; fallback keeps session moving if not.
    assessmentTranscriptTurnTimerRef.current = setTimeout(() => {
      assessmentTranscriptTurnTimerRef.current = null;
      if (!mountedRef.current) return;
      if (!assessmentAwaitingTranscriptTurnRef.current) return;
      assessmentAwaitingTranscriptTurnRef.current = false;
      const life = assessmentLifecycleRef.current;
      const fallback = decideAssessmentAfterUserUtterance(
        life,
        { type: "NONE" },
        {
          awaitingTranscriptForTurn: true,
          closingSent: assessmentClosingSentRef.current,
        }
      );
      if (fallback.action === "request_mid_turn") {
        const slot = assessmentTurnSlot();
        const lastUserText =
          [...turnsRef.current].reverse().find((t) => t.role === "founder")
            ?.text ?? null;
        const requested = requestHoldTurnResponse(connectionRef.current, {
          mode: "assessment",
          allowAssessment: true,
          assessmentSlot: slot,
          lastUserText,
        });
        pushEvent(
          requested
            ? `Assessment mid-turn · transcript timeout · ${reason}${
                slot ? ` · slot=${slot}` : ""
              }`
            : `Assessment mid-turn failed · ${reason}`
        );
      }
    }, 2200);
    pushEvent(`Assessment awaiting transcript · ${reason}`);
  }

  function adoptInFlightClosing(reason: string) {
    clearAssessmentTranscriptTurnTimer();
    assessmentAwaitingTranscriptTurnRef.current = false;
    assessmentPendingClosingAfterDoneRef.current = false;
    if (assessmentClosingTimerRef.current) {
      clearTimeout(assessmentClosingTimerRef.current);
      assessmentClosingTimerRef.current = null;
    }
    // Forge already spoke a terminal line — do not create a second closing.
    assessmentClosingSentRef.current = true;
    lockAssessmentAutoResponses(connectionRef.current);
    muteAssessmentTerminalMic(reason);
    pushEvent(`Assessment adopted Forge soft-close · ${reason}`);

    const forgeStillSpeaking =
      turnStateRef.current === "forge_speaking" ||
      turnStateRef.current === "forge_thinking" ||
      activeResponseIdRef.current != null;
    if (!forgeStillSpeaking) {
      dispatchAssessmentEvent({ type: "FINAL_RESPONSE_DONE" });
    }
  }

  function handleAssessmentEffect(effect: AssessmentLifecycleEffect) {
    if (effect.type === "REQUEST_FINAL_RESPONSE") {
      requestAssessmentClosingOnce("structural_complete");
      return;
    }
    if (effect.type === "ADOPT_IN_FLIGHT_CLOSING") {
      adoptInFlightClosing("forge_soft_close");
      return;
    }
    if (effect.type === "NAVIGATE_RESULTS") {
      void finalizeAssessmentAndNavigate("complete");
      return;
    }
    if (effect.type === "EXIT_TO_COACH") {
      void finalizeAssessmentAndNavigate("cancelled");
    }
  }

  function dispatchAssessmentEvent(
    event: Parameters<typeof reduceAssessmentLifecycle>[1]
  ): AssessmentLifecycleEffect {
    if (!isAssessment) return { type: "NONE" };
    const { state, effect } = reduceAssessmentLifecycle(
      assessmentLifecycleRef.current,
      event
    );
    syncAssessmentLifecycle(state);
    handleAssessmentEffect(effect);
    return effect;
  }

  async function finalizeAssessmentAndNavigate(
    outcome: "complete" | "cancelled"
  ) {
    if (assessmentNavigatedRef.current) return;
    assessmentNavigatedRef.current = true;

    if (assessmentClosingTimerRef.current) {
      clearTimeout(assessmentClosingTimerRef.current);
      assessmentClosingTimerRef.current = null;
    }
    clearAssessmentTranscriptTurnTimer();
    assessmentAwaitingTranscriptTurnRef.current = false;

    const life = assessmentLifecycleRef.current;
    const practiceSessionId = practiceSessionRef.current?.id ?? null;
    const assessmentSnapshot =
      outcome === "complete"
        ? buildAssessmentSnapshot(life, {
            practiceSessionId,
            sufficient: true,
          })
        : null;
    if (assessmentSnapshot) {
      // Results UI + LP write share this snapshot (Steps 6–7).
      persistAssessmentSnapshotClient(assessmentSnapshot);
    }

    const snapshot = [...turnsRef.current];
    const id = voiceSessionIdRef.current;
    if (id && snapshot.length > 0) {
      saveVoiceTranscript({
        voiceSessionId: id,
        realtimeSessionId: realtimeSessionIdRef.current,
        track,
        eventTitle,
        createdAt: createdAtRef.current,
        turns: snapshot,
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

    if (outcome === "complete" && assessmentSnapshot) {
      void fetch("/api/assessment/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          turns: snapshot,
          practiceSessionId,
          assessmentSnapshot,
        }),
      }).catch((err) => {
        console.warn("[voice] assessment complete persist failed", err);
      });
    }

    if (outcome === "cancelled") {
      pushEvent("Assessment cancelled · returning to Coach Forge");
      router.replace("/app/practice?start=1");
      return;
    }

    pushEvent("Assessment complete · results");
    router.replace("/app/assessment/results");
  }

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
      if (joinGateTimerRef.current) {
        clearTimeout(joinGateTimerRef.current);
        joinGateTimerRef.current = null;
      }
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

    const live = extractLiveTranscriptDelta(event);
    if (live) {
      if (live.done) {
        if (live.role === "forge") setLiveForgeDraft("");
        else setLiveUserDraft("");
      } else if (live.role === "forge") {
        setLiveForgeDraft((prev) => prev + live.delta);
      } else {
        // Partial user transcripts may be cumulative snapshots or deltas.
        setLiveUserDraft((prev) =>
          live.delta.startsWith(prev) ? live.delta : prev + live.delta
        );
      }
    }

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

        if (isAssessment) {
          const createdDecision = decideAssessmentResponseCreated(
            assessmentLifecycleRef.current,
            {
              closingSent: assessmentClosingSentRef.current,
              pendingClosingAfterDone:
                assessmentPendingClosingAfterDoneRef.current,
            }
          );
          if (createdDecision.action === "cancel_stray") {
            cancelForgeResponse(connectionRef.current);
            muteAssessmentTerminalMic("stray_response_created");
            pushEvent(
              `Cancelled stray response · ${responseId ?? "unknown"} · assessment locked`
            );
            if (
              !assessmentClosingSentRef.current &&
              assessmentLifecycleRef.current.assessmentStatus === "complete"
            ) {
              requestAssessmentClosingOnce("after_stray_cancel");
            }
            return;
          }
        }

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

      if (isAssessment) {
        const doneDecision = decideAssessmentResponseDone(
          assessmentLifecycleRef.current,
          {
            closingSent: assessmentClosingSentRef.current,
            pendingClosingAfterDone:
              assessmentPendingClosingAfterDoneRef.current,
            navigated: assessmentNavigatedRef.current,
          }
        );
        if (doneDecision.action === "send_closing") {
          if (assessmentClosingTimerRef.current) {
            clearTimeout(assessmentClosingTimerRef.current);
            assessmentClosingTimerRef.current = null;
          }
          sendAssessmentClosingSpeech("after_in_flight_done");
          return;
        }
        if (doneDecision.action === "finalize") {
          dispatchAssessmentEvent({ type: "FINAL_RESPONSE_DONE" });
        }
      }
    }

    if (type === "input_audio_buffer.speech_started") {
      if (
        isAssessment &&
        decideAssessmentVadEvent(assessmentLifecycleRef.current) === "ignore"
      ) {
        muteAssessmentTerminalMic("speech_started");
        pushEvent("Ignored speech_started · assessment terminal");
        return;
      }
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
      if (
        isAssessment &&
        decideAssessmentVadEvent(assessmentLifecycleRef.current) === "ignore"
      ) {
        muteAssessmentTerminalMic("speech_stopped");
        pushEvent("Ignored speech_stopped · assessment terminal");
        return;
      }
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
      // Assessment + hands-free: client owns create_response (minted false).
      // Defer mid-turn until transcript so completion can win.
      if (isAssessment) {
        armAssessmentClientTurn("handsfree_speech_stopped");
      }
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
        setLiveForgeDraft("");
        trackUsage("assistant_text", added.text);
        if (isAssessment) {
          if (looksLikeForgeAssessmentSoftClose(added.text)) {
            dispatchAssessmentEvent({
              type: "FORGE_SOFT_CLOSE",
              text: added.text,
            });
          } else if (
            assessmentLifecycleRef.current.assessmentStatus === "active" &&
            assessmentLifecycleRef.current.consented &&
            forgeTextLooksLikeContentQuestion(added.text)
          ) {
            dispatchAssessmentEvent({ type: "FORGE_CONTENT_QUESTION_ASKED" });
          }
        }
      } else if (added.role === "founder") {
        setLiveUserDraft("");
        trackUsage("user_speech", added.text);
        if (isAssessment) {
          const awaiting = assessmentAwaitingTranscriptTurnRef.current;
          const effect = dispatchAssessmentEvent({
            type: "USER_UTTERANCE",
            text: added.text,
          });
          const after = decideAssessmentAfterUserUtterance(
            assessmentLifecycleRef.current,
            effect,
            {
              awaitingTranscriptForTurn: awaiting,
              closingSent: assessmentClosingSentRef.current,
            }
          );
          if (awaiting) {
            assessmentAwaitingTranscriptTurnRef.current = false;
            clearAssessmentTranscriptTurnTimer();
          }
          // REQUEST_FINAL_RESPONSE / exit already handled in dispatch effect.
          if (after.action === "request_mid_turn") {
            const slot = assessmentTurnSlot();
            const requested = requestHoldTurnResponse(connectionRef.current, {
              mode: "assessment",
              allowAssessment: true,
              assessmentSlot: slot,
              lastUserText: added.text,
            });
            pushEvent(
              requested
                ? `Assessment mid-turn · after transcript${
                    slot ? ` · slot=${slot}` : ""
                  }`
                : "Assessment mid-turn failed · after transcript"
            );
          } else if (after.action === "request_closing") {
            requestAssessmentClosingOnce("after_transcript_complete");
          }
        }
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
    setLiveForgeDraft("");
    setLiveUserDraft("");
    setJoinGateHold(true);
    if (joinGateTimerRef.current) {
      clearTimeout(joinGateTimerRef.current);
    }
    joinGateTimerRef.current = setTimeout(() => {
      joinGateTimerRef.current = null;
      setJoinGateHold(false);
    }, 900);
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
    assessmentClosingSentRef.current = false;
    assessmentPendingClosingAfterDoneRef.current = false;
    assessmentAwaitingTranscriptTurnRef.current = false;
    assessmentNavigatedRef.current = false;
    if (assessmentClosingTimerRef.current) {
      clearTimeout(assessmentClosingTimerRef.current);
      assessmentClosingTimerRef.current = null;
    }
    clearAssessmentTranscriptTurnTimer();
    if (isAssessment) {
      syncAssessmentLifecycle(startAssessmentLifecycle());
    } else {
      syncAssessmentLifecycle(createIdleAssessmentState());
    }
    setPhase("minting");
    pushEvent("Minting session…");

    const newVoiceId = createVoiceSessionId();
    voiceSessionIdRef.current = newVoiceId;
    createdAtRef.current = new Date().toISOString();

    try {
      disconnectRealtime(connectionRef.current);
      connectionRef.current = null;

      const scenarioTitle = isAssessment
        ? "Living Profile assessment"
        : eventTitle?.trim() ||
          CE_TRACK_TITLES[track] ||
          "Voice practice with Forge";

      const tokenRes = await fetch("/api/realtime/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          track,
          eventTitle: isAssessment ? undefined : eventTitle,
          successCriteria: isAssessment ? undefined : successCriteria,
          mode,
          source: isAssessment ? undefined : handoffSource,
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
        const titledStart = Boolean(eventTitle?.trim()) || handoffSource === "ac";
        setWelcomeLine(
          `Welcome back, ${tokenData.memory.firstName}${
            !titledStart && tokenData.memory.lastScenarioTitle
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
              "TalkForge Arena lost its connection. Restart when you’re ready."
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
        scenarioId: isAssessment ? "voice_assessment" : `voice_${track}`,
        scenarioTitle,
        missionPrompt: isAssessment
          ? "Short discovery interview so Forge can get a sense of you."
          : successCriteria?.trim() ||
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
        eventTitle: isAssessment
          ? undefined
          : eventTitle?.trim() || undefined,
        isReturning: isAssessment
          ? false
          : Boolean(tokenData.memory?.isReturning),
        mode,
        handoffSource: isAssessment ? undefined : handoffSource,
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

  function assessmentUiTerminal(): boolean {
    if (!isAssessment) return false;
    const life = assessmentLifecycleRef.current;
    return (
      life.responsesLocked ||
      life.assessmentStatus === "complete" ||
      life.assessmentStatus === "cancelled" ||
      assessmentClosingSentRef.current ||
      assessmentNavigatedRef.current
    );
  }

  function handleSpeakDown() {
    if (assessmentUiTerminal()) {
      pushEvent("Hold ignored · assessment terminal");
      return;
    }
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
    if (assessmentUiTerminal()) {
      voice.stopHoldToTalk();
      pushEvent("Hold released · assessment terminal · no model turn");
      return;
    }
    const { spoke } = voice.stopHoldToTalk();
    // Hold-to-talk: Forge responds only after release — never mid-pause.
    // create_response is false in session config for this reason.
    if (!spoke || !connectionRef.current) {
      if (!spoke) pushEvent("Hold released · no speech · waiting");
      return;
    }
    if (isAssessment) {
      // Defer create until transcript — completion must win over mid-turn.
      armAssessmentClientTurn("hold_release");
      return;
    }
    const requested = requestHoldTurnResponse(connectionRef.current, {
      mode,
    });
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
    // Assessment: never leave members on a practice-style wrap that offers a
    // Living Profile when the interview did not structurally complete.
    if (isAssessment) {
      if (assessmentNavigatedRef.current) return;
      const life = assessmentLifecycleRef.current;
      const structurallyDone =
        life.assessmentStatus === "complete" && life.finalResponseRequested;
      if (structurallyDone) {
        void finalizeAssessmentAndNavigate("complete");
        return;
      }
      const practiceSessionId = practiceSessionRef.current?.id ?? null;
      // Step 6+7: persist accepted slots only; same snapshot for LP incomplete write.
      const assessmentSnapshot = buildAssessmentSnapshot(life, {
        practiceSessionId,
        sufficient: false,
      });
      persistAssessmentSnapshotClient(assessmentSnapshot);
      const snapshot = [...turnsRef.current];
      void fetch("/api/assessment/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          turns: snapshot,
          practiceSessionId,
          assessmentSnapshot,
        }),
      }).catch((err) => {
        console.warn("[voice] assessment early-end persist failed", err);
      });
      assessmentNavigatedRef.current = true;
      clearAssessmentTranscriptTurnTimer();
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
      pushEvent("Assessment ended early · incomplete results");
      router.replace("/app/assessment/results?status=incomplete");
      return;
    }

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
    setAssessmentWrap(null);

    let wrap: Momentum = {
      strength:
        "You showed up and practiced — that already builds readiness.",
      improve:
        "Next time, say one full thought so we can coach something specific.",
      nextAction:
        "Try one clearer opening line in your next real conversation.",
    };

    {
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

  const isJoining =
    joinGateHold ||
    phase === "minting" ||
    phase === "connecting" ||
    (autoStart && phase === "idle" && !error);
  const sessionReady =
    phase === "speaking" ||
    phase === "listening" ||
    phase === "connected" ||
    phase === "error";
  const inSession =
    sessionReady || phase === "connecting" || phase === "minting";

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
            : phase === "minting" || phase === "connecting" || isJoining
              ? "connecting"
              : "idle";

  const assessmentTerminalUi =
    isAssessment &&
    (assessmentStatusLabel === "complete" ||
      assessmentStatusLabel === "cancelled");

  const presenceLabel =
    phase === "idle" && !isJoining
      ? undefined
      : isJoining
        ? "Joining Arena"
        : phase === "momentum"
          ? "Rep Complete"
          : phase === "error"
            ? "Connection lost"
            : assessmentTerminalUi
              ? assessmentStatusLabel === "cancelled"
                ? "Assessment ended"
                : "Finishing assessment"
              : handsFree
                ? voice.handsFreeMuted
                  ? "Mic muted"
                  : voice.handsFreeLabel ?? "Speak naturally"
                : phase === "speaking"
                  ? "Forge speaking"
                  : micLive
                    ? "Listening"
                    : "Your turn";

  // Assessment must never show practice "REPS LEFT" chrome.
  const statusBadge = isAssessment
    ? assessmentStatusLabel === "complete"
      ? "ASSESSMENT · COMPLETE"
      : assessmentStatusLabel === "cancelled"
        ? "ASSESSMENT · EXITED"
        : isJoining
          ? "JOINING"
          : "ASSESSMENT"
    : isJoining
      ? "JOINING"
      : handsFree
        ? "PRO HANDS-FREE"
        : isProUser
          ? "PRO · HOLD TO SPEAK"
          : repsRemaining != null
            ? `${repsRemaining} REP${repsRemaining === 1 ? "" : "S"} LEFT`
            : "HOLD TO SPEAK";

  return (
    <main className="relative h-[100dvh] max-h-[100dvh] overflow-hidden bg-[#000000] text-white">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_28%,rgba(212,175,55,0.12),transparent_52%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_85%,rgba(13,13,14,0.9),#000000_70%)]"
        aria-hidden
      />

      <div className="relative mx-auto flex h-[100dvh] max-h-[100dvh] w-full max-w-3xl flex-col overflow-hidden px-5 pt-[max(1.25rem,env(safe-area-inset-top))] sm:px-8">
        <header className="grid shrink-0 grid-cols-[1fr_auto_1fr] items-center gap-2">
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

        <section className="relative flex min-h-0 flex-1 flex-col items-center pt-4 text-center sm:pt-6">
          {isJoining ? (
            <>
              <div className="flex flex-1 flex-col items-center justify-center pb-16">
                <PresenceRing state="connecting" label={undefined} />
                <p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#D4AF37]/70">
                  Coach Forge
                </p>
                <p className="mt-4 max-w-md text-lg text-white/70 sm:text-xl">
                  {phase === "connecting"
                    ? "Connecting securely…"
                    : "Joining TalkForge Arena…"}
                </p>
                <p className="mt-3 max-w-sm text-sm leading-6 text-white/40">
                  {isAssessment
                    ? "Setting up your diagnostic conversation."
                    : "Preparing your coaching room."}
                </p>
              </div>
              {/* Keep Begin in the tree for autoStart click bootstrap. */}
              {phase === "idle" ? (
                <button
                  ref={beginButtonRef}
                  type="button"
                  onClick={handleStart}
                  className="sr-only"
                >
                  Begin
                </button>
              ) : null}
            </>
          ) : phase === "idle" ? (
            <>
              <PresenceRing state="idle" />
              <p className="mt-8 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#D4AF37]/70">
                Coach Forge
              </p>
              <h1 className="mt-4 max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">
                {isAssessment
                  ? "A few quick questions"
                  : eventTitle?.trim() || "I’m ready when you are"}
              </h1>
              <p className="mt-5 max-w-md text-base leading-7 text-white/50">
                {isAssessment
                  ? "Nothing formal — Forge just wants a sense of you before anything else."
                  : handsFree
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
              ) : isAssessment ? (
                <>
                  <PresenceRing
                    state="wrap"
                    label={
                      assessmentWrap?.ready ? "Profile captured" : "Almost there"
                    }
                  />
                  <h1 className="mt-10 max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
                    {assessmentWrap?.ready
                      ? "Here’s what Forge heard"
                      : "Not enough to write a full profile yet"}
                  </h1>
                  <p className="mt-3 max-w-md text-base leading-7 text-white/50">
                    {assessmentWrap?.ready
                      ? "A simple current-state summary — no roadmap, just what you shared."
                      : "If you left early or kept answers very short, Forge won’t force a profile."}
                  </p>

                  {momentumLoading ? (
                    <p className="mt-10 text-sm text-white/45">
                      Putting this together…
                    </p>
                  ) : assessmentWrap ? (
                    <div className="mt-10 w-full max-w-xl space-y-5 text-left">
                      {assessmentWrap.corePattern ? (
                        <div className="rounded-2xl border border-[#d7b56a]/30 bg-[#c9a95f]/10 px-5 py-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-[#d7b56a]/80">
                            Core pattern
                          </p>
                          <p className="mt-2 text-base leading-7 text-white">
                            {assessmentWrap.corePattern}
                          </p>
                        </div>
                      ) : null}
                      {assessmentWrap.goals.length > 0 ? (
                        <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-white/40">
                            Goals
                          </p>
                          <ul className="mt-2 list-disc space-y-1 pl-5 text-base leading-7 text-white/90">
                            {assessmentWrap.goals.map((g) => (
                              <li key={g}>{g}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      {assessmentWrap.challenges.length > 0 ? (
                        <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-white/40">
                            Challenges
                          </p>
                          <ul className="mt-2 list-disc space-y-1 pl-5 text-base leading-7 text-white/90">
                            {assessmentWrap.challenges.map((c) => (
                              <li key={c}>{c}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      {assessmentWrap.strengths.length > 0 ? (
                        <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-white/40">
                            Strengths
                          </p>
                          <ul className="mt-2 list-disc space-y-1 pl-5 text-base leading-7 text-white/90">
                            {assessmentWrap.strengths.map((s) => (
                              <li key={s}>{s}</li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                      {assessmentWrap.presenceScores ? (
                        <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4">
                          <p className="text-xs uppercase tracking-[0.2em] text-white/40">
                            Inferred presence (1–10)
                          </p>
                          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm text-white/85">
                            {Object.entries(assessmentWrap.presenceScores).map(
                              ([key, value]) => (
                                <div key={key}>
                                  <dt className="capitalize text-white/40">
                                    {key}
                                  </dt>
                                  <dd className="mt-0.5 text-lg font-semibold text-white">
                                    {value}
                                  </dd>
                                </div>
                              )
                            )}
                          </dl>
                          <p className="mt-3 text-xs leading-5 text-white/35">
                            Inferred from conversation only — not a self-rating.
                          </p>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  {assessmentWrap?.ready ? (
                    <Link
                      href="/app/profile"
                      className="mt-10 rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black transition hover:bg-white/90"
                    >
                      Open Living Profile
                    </Link>
                  ) : (
                    <div className="mt-10 flex w-full max-w-sm flex-col gap-3">
                      <Link
                        href="/app"
                        className="rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black transition hover:bg-white/90"
                      >
                        Back to home
                      </Link>
                      <Link
                        href="/app/practice?start=1&mode=assessment"
                        className="rounded-full border border-white/10 px-8 py-3.5 text-sm text-white/70 transition hover:bg-white/10"
                      >
                        Try assessment again
                      </Link>
                      <Link
                        href="/app/practice?start=1"
                        className="rounded-full border border-white/10 px-8 py-3.5 text-sm text-white/55 transition hover:bg-white/10"
                      >
                        Talk to Coach Forge
                      </Link>
                    </div>
                  )}
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
              {/* Conversation scrolls; speak dock is pinned to the Arena shell. */}
              <div className="flex min-h-0 w-full max-w-2xl flex-1 flex-col text-left pb-[11.5rem] sm:pb-[12.5rem]">
                <ArenaConversation
                  turns={turns}
                  liveForgeText={liveForgeDraft}
                  liveUserText={liveUserDraft}
                />
              </div>

              {/* Shell-pinned speak dock — never scrolls away with messages. */}
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30">
                <div className="pointer-events-auto mx-auto w-full max-w-3xl px-5 pb-[max(1.25rem,calc(env(safe-area-inset-bottom)+0.85rem))] sm:px-8">
                  <div className="border-t border-[#D4AF37]/10 bg-gradient-to-t from-black via-black/98 to-black/80 pt-3 text-center backdrop-blur-md">
                    <p className="text-center text-[11px] font-medium uppercase tracking-[0.18em] text-[#D4AF37]/80">
                      {presenceLabel}
                    </p>

                    {error && (
                      <p
                        className="mx-auto mt-3 max-w-md text-sm text-red-300"
                        role="alert"
                      >
                        {error}
                      </p>
                    )}

                    {remoteAudioBlocked ? (
                      <button
                        type="button"
                        onClick={() => void handleResumeRemoteAudio()}
                        className="mt-3 rounded-full border border-[#D4AF37]/30 px-5 py-2.5 text-sm text-[#e7d6b1] transition hover:bg-[#D4AF37]/10"
                      >
                        Hear Coach Forge
                      </button>
                    ) : null}

                    {micMode === "silent_fallback" && (
                      <div className="mx-auto mt-3 max-w-md">
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

                    <div className="mt-3 w-full">
                      <div className="rounded-[1.35rem] border border-[#D4AF37]/18 bg-[#0c0c0d]/95 px-3.5 py-3.5 shadow-[0_-12px_40px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:px-4">
                        {handsFree ? (
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#D4AF37]/90">
                              Hands-Free · Speak Naturally
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => voice.toggleHandsFreeMute()}
                                disabled={
                                  !sessionReady ||
                                  micMode !== "microphone" ||
                                  assessmentTerminalUi
                                }
                                className="rounded-full border border-[#D4AF37]/22 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#e8d5a3]/85 transition hover:border-[#D4AF37]/4 hover:bg-[#D4AF37]/08 disabled:opacity-35"
                              >
                                {voice.handsFreeMuted
                                  ? "Unmute Mic"
                                  : "Mute Mic"}
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleStop()}
                                className="rounded-full border border-white/12 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/55 transition hover:border-white/25 hover:bg-white/5 hover:text-white/80"
                              >
                                Stop
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-2.5">
                            <div className="flex w-full items-center gap-2.5">
                              <button
                                type="button"
                                disabled={
                                  !sessionReady ||
                                  phase === "speaking" ||
                                  micMode !== "microphone" ||
                                  assessmentTerminalUi
                                }
                                onPointerDown={(event) => {
                                  event.currentTarget.setPointerCapture(
                                    event.pointerId
                                  );
                                  handleSpeakDown();
                                }}
                                onPointerUp={(event) => {
                                  if (
                                    event.currentTarget.hasPointerCapture(
                                      event.pointerId
                                    )
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
                                  if (
                                    event.key === " " ||
                                    event.key === "Enter"
                                  ) {
                                    event.preventDefault();
                                    handleSpeakUp();
                                  }
                                }}
                                className={`relative flex min-h-[3.25rem] flex-1 items-center justify-center gap-2.5 rounded-full border px-5 py-3.5 text-[11px] font-semibold uppercase tracking-[0.2em] transition duration-200 select-none touch-none disabled:opacity-35 ${
                                  micLive
                                    ? "border-[#D4AF37] bg-[#D4AF37] text-black shadow-[0_0_36px_rgba(212,175,55,0.28)]"
                                    : "border-[#D4AF37]/32 bg-[linear-gradient(180deg,rgba(212,175,55,0.1),rgba(12,12,13,0.92))] text-[#e8d5a3] hover:border-[#D4AF37]/55 hover:bg-[#D4AF37]/12 active:scale-[0.99]"
                                }`}
                              >
                                <span
                                  className={`inline-flex h-2 w-2 shrink-0 rounded-full ${
                                    micLive
                                      ? "animate-pulse bg-black/70"
                                      : "bg-[#D4AF37]/75 shadow-[0_0_10px_rgba(212,175,55,0.55)]"
                                  }`}
                                  aria-hidden
                                />
                                {assessmentTerminalUi
                                  ? "Assessment ending"
                                  : micLive
                                    ? "Listening…"
                                    : "Hold to speak"}
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleStop()}
                                className="inline-flex min-h-[3.25rem] shrink-0 items-center justify-center rounded-full border border-white/12 px-4 py-3.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-white/50 transition hover:border-white/22 hover:bg-white/[0.04] hover:text-white/75"
                              >
                                Stop
                              </button>
                            </div>
                            {!isProUser ? (
                              <Link
                                href="/membership"
                                className="text-[10px] uppercase tracking-[0.14em] text-[#D4AF37]/55 transition hover:text-[#D4AF37]/85"
                              >
                                Unlock Hands-Free with Pro →
                              </Link>
                            ) : (
                              <p className="text-[10px] uppercase tracking-[0.14em] text-white/28">
                                Press and hold · release to send
                              </p>
                            )}
                          </div>
                        )}

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
                  </div>
                </div>
              </div>
            </>
          )}
        </section>

        {showDevDiagnostics && (
          <footer className="shrink-0 pb-2">
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
