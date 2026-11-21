Warning: truncated output (original token count: 34780)
Total output lines: 3623

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import PresenceRing from "@/app/components/arena/PresenceRing";
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
  type AssessmentSnapshot,
  type AssessmentLifecycleEffect,
  type AssessmentLifecycleState,
  type AssessmentSlotId,
} from "@/lib/ce/assessment-lifecycle";
import { resumeAssessmentLifecycle } from "@/lib/ce/assessment-resume";
import {
  applyOutputBudget,
  cancelForgeResponse,
  clearInputAudioBuffer,
  connectRealtime,
  deleteRealtimeConversationItem,
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
import { attachWakeLockReleaseListener } from "@/lib/ce/wake-lock";
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
  extractFinalizedFounderTranscript,
  extractLiveTranscriptDelta,
  type TranscriptTurn,
} from "@/lib/ce/transcript";
import {
  createVoiceSessionId,
  getActiveVoiceSessionId,
  getVoiceTranscript,
  saveVoiceTranscript,
  setActiveVoiceSessionId,
  type VoiceTranscriptRecord,
} from "@/lib/ce/transcript-store";
import { isCurrentVoiceLifecycle } from "@/lib/ce/voice-lifecycle";
import {
  canRecoverLivePeer,
  dataChannelNeedsRecovery,
  FORGE_INTERRUPT_DISCONNECT_GRACE_MS,
  FORGE_INTERRUPT_WATCHDOG_MS,
  forgeResponseNeedsRecovery,
  liveMicrophoneEnded,
  shouldReconnectAfterInterrupt,
} from "@/lib/ce/interrupt";
import {
  buildResumeBrief,
  loadEligibleVoiceResume,
} from "@/lib/ce/session-resume";
import {
  completeVoiceUsageTracking,
  reportVoiceUsageEvent,
  startVoiceUsageTracking,
} from "@/lib/ce/voice-usage-client";
import {
  admittedHandsFreeBargeLevel,
  HANDS_FREE_CONTINUATION_GRACE_MS,
  continuationGraceMsForUtterance,
  HANDS_FREE_PLAYBACK_DRAIN_FALLBACK_MS,
  isForgeOutputEventType,
  logTurnTransition,
  memberOwnsFloor,
  outboundMicOpenForState,
  reduceTurnState,
  shouldSurfaceRealtimeError,
  shouldWaitForHandsFreePlaybackDrain,
  thinkingHoldBlocksResponse,
  type TurnState,
} from "@/lib/ce/handsfree-turntaking";
import {
  decideTranscriptAdmission,
  HANDS_FREE_ADMISSION_HOLD_MS,
} from "@/lib/ce/transcript-admission";
import { persistSpeechAdmissionEvent } from "@/lib/speech/persistence";
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
  loadIncompletePracticeSession,
  persistActiveSession,
} from "@/lib/session";
import { getUser } from "@/lib/storage";
import type { PracticeSession } from "@/lib/types";
import {
  clampGuestPreviewDurationSeconds,
  formatGuestPreviewCountdown,
} from "@/lib/forge/guest-preview-duration";
import { previewClaimReturnPath } from "@/lib/forge/preview-claim";
import {
  GUEST_PREVIEW_COMPLETE_BODY,
  GUEST_PREVIEW_COMPLETE_HEADLINE,
  GUEST_PREVIEW_CREATE_ACCOUNT_CTA,
  GUEST_PREVIEW_DISMISSED_BODY,
  GUEST_PREVIEW_GET_STARTED_CTA,
  GUEST_PREVIEW_MAYBE_LATER_CTA,
  GUEST_PREVIEW_SIGN_IN_CTA,
} from "@/lib/forge/post-session-copy";
import { startSpeechRecorder, type SpeechRecorder } from "@/lib/ce/speech-capture";
import { hasRepeatedCoachTurn } from "@/lib/ce/coach-loop";

type WrapStage = "coaching" | "membership";

type VoiceArenaProps = {
  track?: CeTrack;
  eventTitle?: string;
  successCriteria?: string;
  openingContext?: string;
  autoStart?: boolean;
  mode?: CeSessionMode;
  drillId?: string;
  programId?: string;
  repeatDayId?: string;
  assessmentResumeSnapshot?: AssessmentSnapshot | null;
  assessmentDailyMinutes?: 5 | 10 | 15 | null;
  guestPreview?: {
    topicId: string;
    reconnectToken: string;
    version: number;
  };
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
  openingContext,
  autoStart = false,
  mode = "practice",
  drillId,
  programId,
  repeatDayId,
  assessmentResumeSnapshot = null,
  assessmentDailyMinutes = null,
  guestPreview,
}: VoiceArenaProps) {
  const router = useRouter();
  const isAssessment = mode === "assessment";
  const isGuestPreview = Boolean(guestPreview);
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
    isAssessment ? resumeAssessmentLifecycle(assessmentResumeSnapshot, assessmentDailyMinutes) : createIdleAssessmentState()
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
  const handsFreeResponseTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const handsFreePlaybackDrainTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const pendingForgeResponseDoneRef = useRef<{
    responseId?: string;
  } | null>(null);
  const sawForgeAudioRef = useRef(false);
  const forgePlaybackStoppedRef = useRef(false);
  const handsFreeLocalTurnConfirmedRef = useRef(false);
  const handsFreeTranscriptAdmittedRef = useRef(false);
  const handsFreeGraceElapsedRef = useRef(false);
  const handsFreeResponseRequestedRef = useRef(false);
  const thinkingHoldRef = useRef(false);
  const handsFreeSpeechStartedAtRef = useRef<number | null>(null);
  const handsFreeTurnTimingRef = useRef<{
    speechStoppedAt: number;
    vadWaitMs: number | null;
    graceMs: number;
    graceElapsedAt: number | null;
    responseCreatedAt: number | null;
    firstAudioAt: number | null;
    loggedAudio: boolean;
  } | null>(null);
  const lastHandsFreeFounderTextRef = useRef<string | null>(null);
  const pendingHandsFreeBargeLevelRef = useRef<number | null>(null);
  const pendingHandsFreeTranscriptRef = useRef<{
    event: Record<string, unknown>;
    text: string;
    itemId: string;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);
  const assessmentNavigatedRef = useRef(false);
  const speechRecorderRef = useRef<SpeechRecorder | null>(null);
  const speechAudioBlobRef = useRef<Blob | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const coachLoopHandledRef = useRef(false);

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
  const [wakeLockDenied, setWakeLockDenied] = useState(false);
  const [thinkingHold, setThinkingHold] = useState(false);
  const [turns, setTurns] = useState<TranscriptTurn[]>([]);
  const [liveForgeDraft, setLiveForgeDraft] = useState("");
  const [liveUserDraft, setLiveUserDraft] = useState("");
  /** Keep joining chrome visible briefly so autoStart never flashes Hold-to-speak. */
  const [joinGateHold, setJoinGateHold] = useState(false);
  const joinGateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const guestDurationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const guestCountdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );
  const guestStopStartedRef = useRef(false);
  const [guestSecondsRemaining, setGuestSecondsRemaining] = useState<
    number | null
  >(null);
  const [callInterrupted, setCallInterrupted] = useState(false);
  const callInterruptedRef = useRef(false);
  const peerStateRef = useRef<RTCPeerConnectionState | null>(null);
  const lastForgeActivityRef = useRef(Date.now());
  const interruptWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const interruptGraceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startingRef = useRef(false);
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
  const [guestAuthPrompt, setGuestAuthPrompt] = useState<
    "prompt" | "dismissed" | null
  >(null);
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
  const guestPreviewVersionRef = useRef(guestPreview?.version ?? 0);
  const guestReplayIdRef = useRef<string | null>(null);
  const guestCompletionIdRef = useRef<string | null>(null);
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
    const assessmentSnapshot = buildAssessmentSnapshot(life, {
      practiceSessionId,
      sufficient: outcome === "complete",
    });
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

    if (assessmentSnapshot) {
      try {
        const response = await fetch("/api/assessment/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          turns: snapshot,
          practiceSessionId,
          assessmentSnapshot,
        }),
        });
        if (!response.ok) throw new Error("Assessment snapshot was not saved.");
      } catch (err) {
        console.error("[voice] assessment snapshot persist failed", err);
        assessmentNavigatedRef.current = false;
        pushEvent("Assessment pause could not be saved. Please retry before leaving.");
        return;
      }
    }

    if (outcome === "cancelled") {
      pushEvent("Assessment cancelled · returning to Coach Forge");
      router.replace("/app?assessment=paused");
      return;
    }

    pushEvent("Assessment complete · results");
    router.replace("/app/assessment/results");
  }

  const showDevDiagnostics = process.env.NODE_ENV === "development";

  const sessionActive =
    micMode === "microphone" &&
    !callInterrupted &&
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
        // Event-handler timestamp; this path never runs during render.
        // eslint-disable-next-line react-hooks/purity
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
        // Never clear at the Forge→member handoff. The member can begin near
        // the playout boundary, and a clear here erases those opening words.
        // The preceding member turn was already committed before response.create.
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
      // A local acoustic signal alone is not enough to cancel Forge. Room
      // speech can diverge from the speaker reference and look like a person
      // talking over Forge. Wait for a finalized, admitted member transcript
      // before yielding the floor.
      handsFreeLocalTurnConfirmedRef.current = true;
      pendingHandsFreeBargeLevelRef.current = level;
      pushEvent(
        `Possible interruption · awaiting admitted transcript · level ${level.toFixed(2)}`
      );
    },
    onConfirmedUserTurn: (level) => {
      if (!handsFreeRef.current) return;
      clearHandsFreeResponseGrace();
      handsFreeLocalTurnConfirmedRef.current = true;
      flushPendingHandsFreeTranscript();
      // Listening audio is already streaming; local confirmation grants the
      // member logical floor ownership without clearing the captured prefix.
      const transition = applyTurn({
        type: "USER_SPEECH_STARTED",
        source: "local_energy",
      });
      if (transition.to === "user_speaking") {
        setPhase("listening");
        pushEvent(
          `Intentional speech · member floor · level ${level.toFixed(2)}`
        );
      }
    },
  });
  const voiceRef = useRef(voice);

  useEffect(() => {
    voiceRef.current = voice;
    handsFreeRef.current = handsFree;
    phaseRef.current = phase;
  }, [handsFree, phase, voice]);

  function clearHandsFreeResponseGrace() {
    if (!handsFreeResponseTimerRef.current) return;
    clearTimeout(handsFreeResponseTimerRef.current);
    handsFreeResponseTimerRef.current = null;
  }

  function resetHandsFreeTurnAdmission() {
    handsFreeLocalTurnConfirmedRef.current = false;
    handsFreeTranscriptAdmittedRef.current = false;
    handsFreeGraceElapsedRef.current = false;
    handsFreeResponseRequestedRef.current = false;
    pendingHandsFreeBargeLevelRef.current = null;
  }

  function installWakeLock(lock: WakeLockSentinel) {
    wakeLockRef.current = lock;
    setWakeLockDenied(false);
    attachWakeLockReleaseListener(lock, () => {
      if (wakeLockRef.current !== lock) return;
      wakeLockRef.current = null;
      const phaseNow = phaseRef.current;
      if (
        isGuestPreview ||
        phaseNow === "idle" ||
        phaseNow === "momentum" ||
        phaseNow === "error" ||
        phaseNow === "minting"
      ) {
        return;
      }
      const wakeLock = (navigator as Navigator & {
        wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinel> };
      }).wakeLock;
      void wakeLock?.request("screen")
        .then((next) => {
          if (next) installWakeLock(next);
        })
        .catch(() => setWakeLockDenied(true));
    });
  }

  function recordHandsFreeAdmission(
    decision: "held" | "admitted" | "dropped" | "control",
    reason: string,
    text: string,
    itemId?: string
  ) {
    const practice = practiceSessionRef.current;
    if (practice) {
      void persistSpeechAdmissionEvent({
        sessionId: practice.id,
        userId: practice.userId,
        itemId,
        transcriptText: text,
        decision,
        reason,
      }).catch((error) => {
        console.warn("[speech] failed to persist admission event", error);
      });
    }
  }

  function clearPendingHandsFreeTranscript(reason?: string) {
    const pending = pendingHandsFreeTranscriptRef.current;
    if (!pending) return;
    clearTimeout(pending.timer);
    pendingHandsFreeTranscriptRef.current = null;
    if (reason) {
      recordHandsFreeAdmission("dropped", reason, pending.text, pending.itemId);
    }
  }

  function flushPendingHandsFreeTranscript() {
    const pending = pendingHandsFreeTranscriptRef.current;
    if (!pending) return;
    clearTimeout(pending.timer);
    pendingHandsFreeTranscriptRef.current = null;
    handsFreeLocalTurnConfirmedRef.current = true;
    handleServerEvent(pending.event);
  }

  function toggleThinkingHold() {
    const next = !thinkingHoldRef.current;
    thinkingHoldRef.current = next;
    setThinkingHold(next);
    if (next) {
      clearHandsFreeResponseGrace();
      handsFreeGraceElapsedRef.current = false;
      pushEvent("Thinking hold · Forge waiting");
    } else {
      pushEvent("Thinking hold released");
    }
  }

  function requestAdmittedHandsFreeResponse(reason: string) {
    if (
      handsFreeResponseRequestedRef.current ||
      thinkingHoldBlocksResponse(thinkingHoldRef.current) ||
      !handsFreeTranscriptAdmittedRef.current ||
      !handsFreeGraceElapsedRef.current ||
      turnStateRef.current !== "listening"
    ) {
      return;
    }

    const ended = applyTurn({ type: "CONTINUATION_GRACE_ELAPSED" });
    if (ended.to !== "forge_thinking") return;
    handsFreeResponseRequestedRef.current = true;
    voiceRef.current.onUserSpeechStopped();
    const requested = requestHoldTurnResponse(connectionRef.current, {
      mode: "practice",
    });
    if (requested) {
      lastForgeActivityRef.current = Date.now();
      armSpeakingWatchdog();
    }
    pushEvent(
      requested
        ? `Hands-free turn · admitted response requested · ${reason}`
        : `Hands-free turn · admitted response request failed · ${reason}`
    );
    if (!requested) {
      applyTurn({ type: "FORGE_RESPONSE_DONE" });
      voiceRef.current.onForgeDone();
      resetHandsFreeTurnAdmission();
    }
  }

  function clearHandsFreePlaybackDrain() {
    if (handsFreePlaybackDrainTimerRef.current) {
      clearTimeout(handsFreePlaybackDrainTimerRef.current);
      handsFreePlaybackDrainTimerRef.current = null;
    }
    pendingForgeResponseDoneRef.current = null;
  }

  function completeForgeResponse(responseId?: string) {
    if (interruptWatchdogRef.current) {
      clearTimeout(interruptWatchdogRef.current);
      interruptWatchdogRef.current = null;
    }
    clearHandsFreePlaybackDrain();
    applyTurn({ type: "FORGE_RESPONSE_DONE", responseId });
    resetHandsFreeTurnAdmission();
    thinkingHoldRef.current = false;
    setThinkingHold(false);
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
      `Response done · ${responseId ?? "unknown"} · member mic ready`
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

  function waitForHandsFreePlaybackDrain(responseId?: string) {
    clearHandsFreePlaybackDrain();
    pendingForgeResponseDoneRef.current = { responseId };
    handsFreePlaybackDrainTimerRef.current = setTimeout(() => {
      handsFreePlaybackDrainTimerRef.current = null;
      const pending = pendingForgeResponseDoneRef.current;
      pendingForgeResponseDoneRef.current = null;
      if (!pending || !mountedRef.current) return;
      pushEvent("Forge playback drain · fallback elapsed");
      completeForgeResponse(pending.responseId);
    }, HANDS_FREE_PLAYBACK_DRAIN_FALLBACK_MS);
    pushEvent("Response generated · waiting for speaker playback to finish");
  }

  function armHandsFreeResponseGrace(reason: string, transcript?: string | null) {
    if (isAssessment || !handsFreeRef.current) return;
    clearHandsFreeResponseGrace();

    const paused = applyTurn({
      type: "USER_SPEECH_PAUSED",
      source: "server_vad",
    });
    if (paused.to !== "listening") return;

    const speechStoppedAt = Date.now();
    const graceMs = continuationGraceMsForUtterance(
      transcript ?? lastHandsFreeFounderTextRef.current
    );
    const speechStartedAt = handsFreeSpeechStartedAtRef.current;
    handsFreeTurnTimingRef.current = {
      speechStoppedAt,
      vadWaitMs: speechStartedAt != null ? speechStoppedAt - speechStartedAt : null,
      graceMs,
      graceElapsedAt: null,
      responseCreatedAt: null,
      firstAudioAt: null,
      loggedAudio: false,
    };
    handsFreeResponseTimerRef.current = setTimeout(() => {
      handsFreeResponseTimerRef.current = null;
      if (!mountedRef.current || isAssessment || !handsFreeRef.current) return;
      if (turnStateRef.current !== "listening") return;
      handsFreeGraceElapsedRef.current = true;
      const timing = handsFreeTurnTimingRef.current;
      if (timing) timing.graceElapsedAt = Date.now();
      if (!handsFreeTranscriptAdmittedRef.current) {
        pushEvent(
          `Hands-free turn · grace elapsed · awaiting admitted transcript · ${reason}`
        );
        return;
      }
      requestAdmittedHandsFreeResponse(
        `${graceMs}ms grace · ${reason}`
      );
    }, graceMs);
    pushEvent(`Speech pause · waiting ${graceMs}ms for continuation · ${reason}`);
  }

  function clearInterruptTimers() {
    if (interruptWatchdogRef.current) {
      clearTimeout(interruptWatchdogRef.current);
      interruptWatchdogRef.current = null;
    }
    if (interruptGraceRef.current) {
      clearTimeout(interruptGraceRef.current);
      interruptGraceRef.current = null;
    }
  }

  function noteCallInterrupted(reason: string) {
    if (isGuestPreview) return;
    if (callInterruptedRef.current) return;
    const phaseNow = phaseRef.current;
    if (
      phaseNow === "idle" ||
      phaseNow === "momentum" ||
      phaseNow === "error" ||
      phaseNow === "minting"
    ) {
      return;
    }
    callInterruptedRef.current = true;
    setCallInterrupted(true);
    clearHandsFreeResponseGrace();
    resetHandsFreeTurnAdmission();
    thinkingHoldRef.current = false;
    setThinkingHold(false);
    clearHandsFreePlaybackDrain();
    clearInterruptTimers();
    cancelForgeResponse(connectionRef.current);
    duckRemoteForgeAudio(connectionRef.current);
    setMicrophoneEnabled(connectionRef.current, false);
    setOutboundMicrophoneEnabled(connectionRef.current, false);
    turnStateRef.current = "listening";
    setTurnState("listening");
    setPhase((current) => (current === "speaking" ? "connected" : current));
    pushEvent(`Call interrupted · ${reason}`);
  }

  function armSpeakingWatchdog() {
    if (isGuestPreview) return;
    if (interruptWatchdogRef.current) {
      clearTimeout(interruptWatchdogRef.current);
    }
    interruptWatchdogRef.current = setTimeout(() => {
      interruptWatchdogRef.current = null;
      if (callInterruptedRef.current) return;
      const elapsed = Date.now() - lastForgeActivityRef.current;
      if (
        forgeResponseNeedsRecovery({
          turnState: turnStateRef.current,
          elapsedMs: elapsed,
        })
      ) {
        noteCallInterrupted("watchdog");
        return;
      }
      if (
        turnStateRef.current === "forge_thinking" ||
        turnStateRef.current === "forge_speaking"
      ) {
        armSpeakingWatchdog();
      }
    }, FORGE_INTERRUPT_WATCHDOG_MS);
  }

  useEffect(() => {
    mountedRef.current = true;
    const onPageHide = () => beaconIncompleteSessionRecovery();
    window.addEventListener("pagehide", onPageHide);
    return () => {
      mountedRef.current = false;
      beaconIncompleteSessionRecovery();
      window.removeEventListener("pagehide", onPageHide);
      if (joinGateTimerRef.current) {
        clearTimeout(joinGateTimerRef.current);
        joinGateTimerRef.current = null;
      }
      clearGuestDurationWatch();
      clearInterruptTimers();
      clearHandsFreeResponseGrace();
      clearPendingHandsFreeTranscript("session_unmounted_before_confirmation");
      resetHandsFreeTurnAdmission();
      clearHandsFreePlaybackDrain();
      void wakeLockRef.current?.release().catch(() => undefined);
      wakeLockRef.current = null;
      lifecycleGenerationRef.current += 1;
      const usageId = usageIdRef.current;
      usageIdRef.current = null;
      if (usageId) {
        void completeVoiceUsageTracking({ usageId });
      }
      disconnectRealtime(connectionRef.current);
      connectionRef.current = null;
      setLiveConnection(null);
    };
  }, [isGuestPreview, isAssessment]);

  useEffect(() => {
    if (isGuestPreview) return;
    const onForeground = () => {
      if (document.visibilityState && document.visibilityState !== "visible") {
        return;
      }
      const connection = connectionRef.current;
      if (!connection) return;
      const phaseNow = phaseRef.current;
      if (
        phaseNow === "idle" ||
        phaseNow === "momentum" ||
        phaseNow === "error" ||
        phaseNow === "minting"
      ) {
        return;
      }
      const peer = connection.pc.connectionState;
      const micDead = liveMicrophoneEnded(connection.localStream);
      if (
        micDead ||
        peer === "failed" ||
        peer === "closed" ||
        peer === "disconnected"
      ) {
        noteCallInterrupted("visibility");
        void handleContinueAfterInterrupt();
        return;
      }
      if (!wakeLockRef.current && typeof navigator !== "undefined" && "wakeLock" in navigator) {
        void (navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinel> } }).wakeLock?.request("screen")
          .then((lock) => { if (lock) installWakeLock(lock); })
          .catch(() => setWakeLockDenied(true));
      }
      void resumeRemoteAudio(connection);
      if (phaseNow === "speaking") armSpeakingWatchdog();
    };
    document.addEventListener("visibilitychange", onForeground);
    window.addEventListener("pageshow", onForeground);
    return () => {
      document.removeEventListener("visibilitychange", onForeground);
      window.removeEventListener("pageshow", onForeground);
    };
  }, [isGuestPreview]);

  useEffect(() => {
    if (isGuestPrevie…14780 tokens truncated…tSecondsRemaining != null
          ? `GUEST · ${formatGuestPreviewCountdown(guestSecondsRemaining)}`
          : "GUEST PREVIEW · HOLD TO SPEAK"
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
          {isGuestPreview && inSession ? (
            <button
              type="button"
              onClick={() => void handleStop()}
              className="justify-self-start text-[10px] font-semibold uppercase tracking-[0.22em] text-[#D4AF37]/70 transition hover:text-[#D4AF37]"
            >
              TalkForge Arena
            </button>
          ) : (
            <Link
              href={isGuestPreview ? "/coach" : "/app"}
              className="justify-self-start text-[10px] font-semibold uppercase tracking-[0.22em] text-[#D4AF37]/70 transition hover:text-[#D4AF37]"
            >
              TalkForge Arena
            </Link>
          )}
          <span className="justify-self-center rounded-full border border-[#D4AF37]/20 bg-[#D4AF37]/08 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#D4AF37]/90">
            {statusBadge}
          </span>
          {inSession ? (
            <button
              type="button"
              onClick={() => void handleStop()}
              className={
                isGuestPreview
                  ? "justify-self-end rounded-full border border-white/20 px-3 py-1.5 text-sm text-white/85 transition hover:border-white/40 hover:bg-white/10 hover:text-white"
                  : "justify-self-end text-sm text-white/40 transition hover:text-white/75"
              }
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
                    : isGuestPreview
                      ? "This is a short private preview. Hold to speak when you’re ready."
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
              {isGuestPreview && guestPreview && guestAuthPrompt ? (
                <div
                  role={guestAuthPrompt === "prompt" ? "dialog" : "region"}
                  aria-modal={guestAuthPrompt === "prompt" ? "true" : undefined}
                  aria-labelledby="guest-preview-complete-title"
                  className="flex w-full max-w-lg flex-1 flex-col items-center justify-center pb-8"
                >
                  <PresenceRing
                    state="wrap"
                    label={hasCapturedSpeech ? "Rep Complete" : "No speech captured"}
                  />
                  {guestAuthPrompt === "prompt" ? (
                    <>
                      <h1
                        id="guest-preview-complete-title"
                        className="mt-8 text-3xl font-semibold tracking-tight sm:text-4xl"
                      >
                        {GUEST_PREVIEW_COMPLETE_HEADLINE}
                      </h1>
                      <p className="mt-4 max-w-md text-base leading-7 text-white/60">
                        {GUEST_PREVIEW_COMPLETE_BODY}
                      </p>
                      <div className="mt-8 flex w-full max-w-sm flex-col gap-3">
                        <Link
                          href={`/signup?next=${encodeURIComponent(
                            previewClaimReturnPath(guestPreview.topicId)
                          )}`}
                          className="rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black transition hover:bg-white/90"
                        >
                          {GUEST_PREVIEW_CREATE_ACCOUNT_CTA}
                        </Link>
                        <Link
                          href={`/login?next=${encodeURIComponent(
                            previewClaimReturnPath(guestPreview.topicId)
                          )}`}
                          className="rounded-full border border-white/15 px-8 py-3.5 text-sm text-white/80 transition hover:bg-white/10"
                        >
                          {GUEST_PREVIEW_SIGN_IN_CTA}
                        </Link>
                        <button
                          type="button"
                          onClick={() => setGuestAuthPrompt("dismissed")}
                          className="px-8 py-2 text-sm text-white/50 transition hover:text-white/75"
                        >
                          {GUEST_PREVIEW_MAYBE_LATER_CTA}
                        </button>
                      </div>
                      {completionError ? (
                        <p className="mt-6 max-w-md text-sm text-red-300" role="alert">
                          {completionError}
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <>
                      <h1
                        id="guest-preview-complete-title"
                        className="mt-8 max-w-md text-2xl font-semibold leading-9"
                      >
                        {GUEST_PREVIEW_DISMISSED_BODY}
                      </h1>
                      <div className="mt-8 flex w-full max-w-sm flex-col gap-3">
                        <Link
                          href={`/signup?next=${encodeURIComponent(
                            previewClaimReturnPath(guestPreview.topicId)
                          )}`}
                          className="rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black transition hover:bg-white/90"
                        >
                          {GUEST_PREVIEW_GET_STARTED_CTA}
                        </Link>
                        <Link
                          href="/coach"
                          className="rounded-full border border-white/15 px-8 py-3.5 text-sm text-white/70 transition hover:bg-white/10"
                        >
                          Back to Coach
                        </Link>
                      </div>
                    </>
                  )}
                  <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    className="mt-8 w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4 text-sm text-white/30"
                  >
                    Practice input is closed for this completed preview.
                  </button>
                </div>
              ) : complimentaryComplete && wrapStage === "membership" ? (
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
                  <PresenceRing
                    state="wrap"
                    label={hasCapturedSpeech ? "Rep Complete" : "No speech captured"}
                  />
                  <h1 className="mt-10 max-w-xl text-3xl font-semibold tracking-tight sm:text-4xl">
                    {hasCapturedSpeech ? "Leave with momentum" : "Let’s fix the audio path"}
                  </h1>
                  <p className="mt-3 max-w-md text-base leading-7 text-white/50">
                    {hasCapturedSpeech
                      ? "One strength. One improvement. One thing to try in the real conversation."
                      : "Forge didn’t receive a spoken turn. Check your microphone or connection, then try again."}
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
                        href={isGuestPreview ? "/coach" : "/app"}
                        className="rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black transition hover:bg-white/90"
                      >
                        {isGuestPreview
                          ? "Done for now"
                          : "Return home and begin again"}
                      </Link>
                    )}
                    <Link
                      href={isGuestPreview ? "/coach" : "/app"}
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

                    {wakeLockDenied && !callInterrupted ? (
                      <p className="mx-auto mt-3 max-w-md text-xs text-amber-200/80">
                        Keep your screen on while you practice.
                      </p>
                    ) : null}

                    {remoteAudioBlocked && !callInterrupted ? (
                      <button
                        type="button"
                        onClick={() => void handleResumeRemoteAudio()}
                        className="mt-3 rounded-full border border-[#D4AF37]/30 px-5 py-2.5 text-sm text-[#e7d6b1] transition hover:bg-[#D4AF37]/10"
                      >
                        Hear Coach Forge
                      </button>
                    ) : null}

                    {callInterrupted ? (
                      <div className="mx-auto mt-3 max-w-md">
                        <p className="text-sm text-[#e7d6b1]">
                          Call interrupted. Tap to continue.
                        </p>
                        <button
                          type="button"
                          onClick={() => void handleContinueAfterInterrupt()}
                          disabled={micRecoveryPending}
                          className="mt-3 rounded-full border border-[#D4AF37]/30 px-5 py-2.5 text-sm text-[#e7d6b1] transition hover:bg-[#D4AF37]/10 disabled:opacity-50"
                        >
                          {micRecoveryPending ? "Continuing…" : "Continue"}
                        </button>
                      </div>
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
                              {thinkingHold ? "Holding — Forge is waiting" : "Hands-Free · Speak Naturally"}
                            </p>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={toggleThinkingHold}
                                disabled={!sessionReady || callInterrupted}
                                className={`rounded-full border px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] transition disabled:opacity-35 ${thinkingHold ? "border-[#D4AF37] bg-[#D4AF37]/15 text-[#f0d995]" : "border-[#D4AF37]/22 text-[#e8d5a3]/85 hover:bg-[#D4AF37]/08"}`}
                              >
                                {thinkingHold ? "Release hold" : "Still thinking"}
                              </button>
                              <button
                                type="button"
                                onClick={() => voice.toggleHandsFreeMute()}
                                disabled={
                                  !sessionReady ||
                                  micMode !== "microphone" ||
                                  assessmentTerminalUi ||
                                  callInterrupted
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
                                  assessmentTerminalUi ||
                                  callInterrupted
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
                            {!isProUser && !isGuestPreview ? (
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

