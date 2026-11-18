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
  assessmentResumeSnapshot = null,
  assessmentDailyMinutes = null,
  guestPreview,
}: VoiceArenaProps) {
  const router = useRouter();
  const isAssem«ëŒ+Š×®º+º$zzb¥ç76ÖVçBÒÖöFRÓÓÒ&76W76ÖVçB#°¢6öç7B—4wVW7E&Wf–WrÒ&ööÆVâ†wVW7E&Wf–Wr“°¢6öç7B6öææV7F–öå&VbÒW6U&VcÅ&VÇF–ÖT6öææV7F–öâÂçVÆÃâ†çVÆÂ“°¢6öç7BGW&ç5&VbÒW6U&VcÅG&ç67&—EGW&åµÓâ…µÒ“°¢6öç7Bfö–6U6W76–öä–E&VbÒW6U&VcÇ7G&–ærÂçVÆÃâ†çVÆÂ“°¢6öç7B&VÇF–ÖU6W76–öä–E&VbÒW6U&VcÇ7G&–ærÂçVÆÃâ†çVÆÂ“°¢6öç7B7&VFVDE&VbÒW6U&VcÇ7G&–æsâ‚""“°¢6öç7B&7F–6U6W76–öå&VbÒW6U&VcÅ&7F–6U6W76–öâÂçVÆÃâ†çVÆÂ“°¢6öç7BvVÆ6öÖT†–çE&VbÒW6U&VcÇ7G&–æsâ‚""“°¢6öç7BÖ÷VçFVE&VbÒW6U&Vb‡G'VR“°¢6öç7BÆ–fV7–6ÆTvVæW&F–öå&VbÒW6U&Vbƒ“°¢6öç7BWFõ7F'DGFV×FVE&VbÒW6U&Vb†fÇ6R“°¢6öç7B&Vv–ä'WGFöå&VbÒW6U&VcÄ…DÔÄ'WGFöäVÆVÖVçCâ†çVÆÂ“°¢6öç7B76W76ÖVçDÆ–fV7–6ÆU&VbÒW6U&VcÄ76W76ÖVçDÆ–fV7–6ÆU7FFSâ€¢—476W76ÖVçBò&W7VÖT76W76ÖVçDÆ–fV7–6ÆR†76W76ÖVçE&W7VÖU6æ6†÷BÂ76W76ÖVçDF–Ç”Ö–çWFW2’¢7&VFT–FÆT76W76ÖVçE7FFR‚¢“°¢ò¢¢6Æ÷6–ær7VV6‚v26VçB(	BæW‡BÖF6†–ær&W7öç6RæFöæRæf–vFW2â¢ğ¢6öç7B76W76ÖVçD6Æ÷6–æu6VçE&VbÒW6U&Vb†fÇ6R“°¢ò¢¢v—Bf÷"–âÖfÆ–v‡BFöæR&Vf÷&R6VæF–ærF†R&—f–ÆVvVB6Æ÷6–ærâ¢ğ¢6öç7B76W76ÖVçEVæF–æt6Æ÷6–ætgFW$FöæU&VbÒW6U&Vb†fÇ6R“°¢ò¢¢FVfW"Ö–B×GW&â7&VFRVçF–Âf÷VæFW"G&ç67&—B—2&VGV6VBâ¢ğ¢6öç7B76W76ÖVçDv—F–æuG&ç67&—EGW&å&VbÒW6U&Vb†fÇ6R“°¢6öç7B76W76ÖVçD6Æ÷6–æuF–ÖW%&VbÒW6U&VcÅ&WGW&åG—SÇG—Vöb6WEF–ÖV÷WCâÂçVÆÃâ€¢çVÆÀ¢“°¢6öç7B76W76ÖVçEG&ç67&—EGW&åF–ÖW%&VbÒW6U&VcÅ&WGW&åG—SÀ¢G—Vöb6WEF–ÖV÷W@¢âÂçVÆÃâ†çVÆÂ“°¢6öç7B†æG4g&VU&W7öç6UF–ÖW%&VbÒW6U&VcÅ&WGW&åG—SÀ¢G—Vöb6WEF–ÖV÷W@¢âÂçVÆÃâ†çVÆÂ“°¢6öç7B†æG4g&VUÆ–&6´G&–åF–ÖW%&VbÒW6U&VcÅ&WGW&åG—SÀ¢G—Vöb6WEF–ÖV÷W@¢âÂçVÆÃâ†çVÆÂ“°¢6öç7BVæF–ætf÷&vU&W7öç6TFöæU&VbÒW6U&VcÇ°¢&W7öç6T–Có¢7G&–æs°¢ÒÂçVÆÃâ†çVÆÂ“°¢6öç7B6tf÷&vTVF–õ&VbÒW6U&Vb†fÇ6R“°¢6öç7Bf÷&vUÆ–&6µ7F÷VE&VbÒW6U&Vb†fÇ6R“°¢6öç7B†æG4g&VTÆö6ÅGW&ä6öæf—&ÖVE&VbÒW6U&Vb†fÇ6R“°¢6öç7B†æG4g&VUG&ç67&—DFÖ—GFVE&VbÒW6U&Vb†fÇ6R“°¢6öç7B†æG4g&VTw&6TVÆ6VE&VbÒW6U&Vb†fÇ6R“°¢6öç7B†æG4g&VU&W7öç6U&WVW7FVE&VbÒW6U&Vb†fÇ6R“°¢6öç7BF†–æ¶–æt†öÆE&VbÒW6U&Vb†fÇ6R“°¢6öç7B†æG4g&VU7VV6…7F'FVDE&VbÒW6U&VcÆçVÖ&W"ÂçVÆÃâ†çVÆÂ“°¢6öç7B†æG4g&VUGW&åF–Ö–æu&VbÒW6U&VcÇ°¢7VV6…7F÷VDC¢çVÖ&W#°¢fEv—D×3¢çVÖ&W"ÂçVÆÃ°¢w&6T×3¢çVÖ&W#°¢w&6TVÆ6VDC¢çVÖ&W"ÂçVÆÃ°¢&W7öç6T7&VFVDC¢çVÖ&W"ÂçVÆÃ°¢f—'7DVF–ôC¢çVÖ&W"ÂçVÆÃ°¢ÆövvVDVF–ó¢&ööÆVã°¢ÒÂçVÆÃâ†çVÆÂ“°¢6öç7BÆ7D†æG4g&VTf÷VæFW%FW‡E&VbÒW6U&VcÇ7G&–ærÂçVÆÃâ†çVÆÂ“°¢6öç7BVæF–æt†æG4g&VT&&vTÆWfVÅ&VbÒW6U&VcÆçVÖ&W"ÂçVÆÃâ†çVÆÂ“°¢6öç7BVæF–æt†æG4g&VUG&ç67&—E&VbÒW6U&VcÇ°¢WfVçC¢&V6÷&CÇ7G&–ærÂVæ¶æ÷vãã°¢FW‡C¢7G&–æs°¢—FVÔ–C¢7G&–æs°¢F–ÖW#¢&WGW&åG—SÇG—Vöb6WEF–ÖV÷WCã°¢ÒÂçVÆÃâ†çVÆÂ“°¢6öç7B76W76ÖVçDæf–vFVE&VbÒW6U&Vb†fÇ6R“°¢6öç7B7VV6…&V6÷&FW%&VbÒW6U&VcÅ7VV6…&V6÷&FW"ÂçVÆÃâ†çVÆÂ“°¢6öç7B7VV6„VF–ô&Æö%&VbÒW6U&VcÄ&Æö"ÂçVÆÃâ†çVÆÂ“°¢6öç7Bv¶TÆö6µ&VbÒW6U&VcÅv¶TÆö6µ6VçF–æVÂÂçVÆÃâ†çVÆÂ“°¢6öç7B6ö6„Æö÷†æFÆVE&VbÒW6U&Vb†fÇ6R“° ¢6öç7B·†6RÂ6WE†6UÒÒW6U7FFSÅ†6Sâ‚&–FÆR"“°¢6öç7B¶W'&÷"Â6WDW'&÷%ÒÒW6U7FFR‚""“°¢6öç7B¶WfVçG2Â6WDWfVçG5ÒÒW6U7FFSÇ7G&–æuµÓâ…µÒ“°¢6öç7B·6†÷tF–væ÷7F–72Â6WE6†÷tF–væ÷7F–75ÒÒW6U7FFR†fÇ6R“°¢6öç7B¶Ö–4ÖöFRÂ6WDÖ–4ÖöFUÒÒW6U7FFSÂ&Ö–7&÷†öæR"Â'6–ÆVçEöfÆÆ&6²"ÂçVÆÃâ€¢çVÆÀ¢“°¢6öç7B¶Ö–4fÆÆ&6µ&V6öâÂ6WDÖ–4fÆÆ&6µ&V6öåÒĞ¢W6U7FFSÄÖ–4fÆÆ&6µ&V6öâÂçVÆÃâ†çVÆÂ“°¢6öç7B¶Ö–5&V6÷fW'•VæF–ærÂ6WDÖ–5&V6÷fW'•VæF–æuÒÒW6U7FFR†fÇ6R“°¢6öç7B·v¶TÆö6´FVæ–VBÂ6WEv¶TÆö6´FVæ–VEÒÒW6U7FFR†fÇ6R“°¢6öç7B·F†–æ¶–æt†öÆBÂ6WEF†–æ¶–æt†öÆEÒÒW6U7FFR†fÇ6R“°¢6öç7B·GW&ç2Â6WEGW&ç5ÒÒW6U7FFSÅG&ç67&—EGW&åµÓâ…µÒ“°¢6öç7B¶Æ—fTf÷&vTG&gBÂ6WDÆ—fTf÷&vTG&gEÒÒW6U7FFR‚""“°¢6öç7B¶Æ—fUW6W$G&gBÂ6WDÆ—fUW6W$G&gEÒÒW6U7FFR‚""“°¢ò¢¢¶VW¦ö–æ–ær6‡&öÖRf—6–&ÆR'&–VfÇ’6òWFõ7F'BæWfW"fÆ6†W2†öÆB×Fò×7V²â¢ğ¢6öç7B¶¦ö–ävFT†öÆBÂ6WD¦ö–ävFT†öÆEÒÒW6U7FFR†fÇ6R“°¢6öç7B¦ö–ävFUF–ÖW%&VbÒW6U&VcÅ&WGW&åG—SÇG—Vöb6WEF–ÖV÷WCâÂçVÆÃâ†çVÆÂ“°¢6öç7BwVW7DGW&F–öåF–ÖW%&VbÒW6U&VcÅ&WGW&åG—SÇG—Vöb6WEF–ÖV÷WCâÂçVÆÃâ€¢çVÆÀ¢“°¢6öç7BwVW7D6÷VçFF÷vä–çFW'fÅ&VbÒW6U&VcÅ&WGW&åG—SÇG—Vöb6WD–çFW'fÃâÂçVÆÃâ€¢çVÆÀ¢“°¢6öç7BwVW7E7F÷7F'FVE&VbÒW6U&Vb†fÇ6R“°¢6öç7B¶wVW7E6V6öæG5&VÖ–æ–ærÂ6WDwVW7E6V6öæG5&VÖ–æ–æuÒÒW6U7FFSÀ¢çVÖ&W"ÂçVÆÀ¢â†çVÆÂ“°¢6öç7B¶6ÆÄ–çFW''WFVBÂ6WD6ÆÄ–çFW''WFVEÒÒW6U7FFR†fÇ6R“°¢6öç7B6ÆÄ–çFW''WFVE&VbÒW6U&Vb†fÇ6R“°¢6öç7BVW%7FFU&VbÒW6U&VcÅ%D5VW$6öææV7F–öå7FFRÂçVÆÃâ†çVÆÂ“°¢6öç7BÆ7Df÷&vT7F—f—G•&VbÒW6U&Vb„FFRææ÷r‚’“°¢6öç7B–çFW''WEvF6†Föu&VbÒW6U&VcÅ&WGW&åG—SÇG—Vöb6WEF–ÖV÷WCâÂçVÆÃâ€¢çVÆÀ¢“°¢6öç7B–çFW''WDw&6U&VbÒW6U&VcÅ&WGW&åG—SÇG—Vöb6WEF–ÖV÷WCâÂçVÆÃâ†çVÆÂ“°¢6öç7B7F'F–æu&VbÒW6U&Vb†fÇ6R“°¢6öç7B¶Æ—fT6öææV7F–öâÂ6WDÆ—fT6öææV7F–öåÒĞ¢W6U7FFSÅ&VÇF–ÖT6öææV7F–öâÂçVÆÃâ†çVÆÂ“°¢6öç7B¶ÖöÖVçGVÒÂ6WDÖöÖVçGVÕÒÒW6U7FFSÄÖöÖVçGVÒÂçVÆÃâ†çVÆÂ“°¢6öç7B¶ÖöÖVçGVÔÆöF–ærÂ6WDÖöÖVçGVÔÆöF–æuÒÒW6U7FFR†fÇ6R“°¢6öç7B¶76W76ÖVçEw&Â6WD76W76ÖVçEw&ÒÒW6U7FFSÄ76W76ÖVçEw&ÂçVÆÃâ€¢çVÆÀ¢“°¢6öç7B·6fVE6W76–öä–BÂ6WE6fVE6W76–öä–EÒÒW6U7FFSÇ7G&–ærÂçVÆÃâ†çVÆÂ“°¢6öç7B·6W76–öåW'6—7FVBÂ6WE6W76–öåW'6—7FVEÒÒW6U7FFR†fÇ6R“°¢6öç7B¶6ö×ÆWF–öäW'&÷"Â6WD6ö×ÆWF–öäW'&÷%ÒÒW6U7FFR‚""“°¢6öç7B¶6ö×ÆWF–öå&WG'•VæF–ærÂ6WD6ö×ÆWF–öå&WG'•VæF–æuÒÒW6U7FFR†fÇ6R“°¢6öç7B¶wVW7DWF…&ö×BÂ6WDwVW7DWF…&ö×EÒÒW6U7FFSÀ¢'&ö×B"Â&F—6Ö—76VB"ÂçVÆÀ¢â†çVÆÂ“°¢6öç7B·vVÆ6öÖTÆ–æRÂ6WEvVÆ6öÖTÆ–æUÒÒW6U7FFR‚""“°¢6öç7B·&VÖ÷FTVF–ô&Æö6¶VBÂ6WE&VÖ÷FTVF–ô&Æö6¶VEÒÒW6U7FFR†fÇ6R“°¢6öç7B¶6ö×Æ–ÖVçF'”6ö×ÆWFRÂ6WD6ö×Æ–ÖVçF'”6ö×ÆWFUÒÒW6U7FFR†fÇ6R“°¢6öç7B·w&7FvRÂ6WEw&7FvUÒÒW6U7FFSÅw&7FvSâ‚&6ö6†–ær"“°¢6öç7B¶—5&õW6W"Â6WD—5&õW6W%ÒÒW6U7FFR†fÇ6R“°¢6öç7B·fö–6TÖöFRÂ6WEfö–6TÖöFUÒÒW6U7FFSÄ&Væfö–6TÖöFSâ‚&†öÆB"“°¢6öç7B·&W5&VÖ–æ–ærÂ6WE&W5&VÖ–æ–æuÒÒW6U7FFSÆçVÖ&W"ÂçVÆÃâ†çVÆÂ“°¢6öç7B¶76W76ÖVçE7FGW4Æ&VÂÂ6WD76W76ÖVÚ±î¸Â¸­yêë¢°k¢G§¦*^ntStatusLabel] = useState<
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
    pushEvent(`Assessment mic locked Â· ${reason}`);
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
        ? `Assessment closing Â· ${reason}`
        : `Assessment closing failed Â· ${reason}`
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
      // Do NOT cancel in-flight audio â€” avoids half-response + cancel hitch.
      assessmentPendingClosingAfterDoneRef.current = true;
      pushEvent(`Assessment closing queued Â· ${reason}`);
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
      pushEvent(`Assessment turn ignored Â· ${reason}`);
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
            ? `Assessment mid-turn Â· transcript timeout Â· ${reason}${
                slot ? ` Â· slot=${slot}` : ""
              }`
            : `Assessment mid-turn failed Â· ${reason}`
        );
      }
    }, 2200);
    pushEvent(`Assessment awaiting transcript Â· ${reasom«ëŒ+Š×®º+º$zzb¥æçÖ“°¢Ğ ¢gVæ7F–öâF÷D–äfÆ–v‡D6Æ÷6–ær‡&V6öã¢7G&–ær’°¢6ÆV$76W76ÖVçEG&ç67&—EGW&åF–ÖW"‚“°¢76W76ÖVçDv—F–æuG&ç67&—EGW&å&Vbæ7W'&VçBÒfÇ6S°¢76W76ÖVçEVæF–æt6Æ÷6–ætgFW$FöæU&Vbæ7W'&VçBÒfÇ6S°¢–b†76W76ÖVçD6Æ÷6–æuF–ÖW%&Vbæ7W'&VçB’°¢6ÆV%F–ÖV÷WB†76W76ÖVçD6Æ÷6–æuF–ÖW%&Vbæ7W'&VçB“°¢76W76ÖVçD6Æ÷6–æuF–ÖW%&Vbæ7W'&VçBÒçVÆÃ°¢Ğ¢òòf÷&vRÇ&VG’7ö¶RFW&Ö–æÂÆ–æR(	BFòæ÷B7&VFR6V6öæB6Æ÷6–ærà¢76W76ÖVçD6Æ÷6–æu6VçE&Vbæ7W'&VçBÒG'VS°¢Æö6´76W76ÖVçDWFõ&W7öç6W2†6öææV7F–öå&Vbæ7W'&VçB“°¢×WFT76W76ÖVçEFW&Ö–æÄÖ–2‡&V6öâ“°¢W6„WfVçB†76W76ÖVçBF÷FVBf÷&vR6ögBÖ6Æ÷6R+rG·&V6öçÖ“° ¢6öç7Bf÷&vU7F–ÆÅ7V¶–ærĞ¢GW&å7FFU&Vbæ7W'&VçBÓÓÒ&f÷&vU÷7V¶–ær"ÇÀ¢GW&å7FFU&Vbæ7W'&VçBÓÓÒ&f÷&vU÷F†–æ¶–ær"ÇÀ¢7F—fU&W7öç6T–E&Vbæ7W'&VçBÒçVÆÃ°¢–b‚f÷&vU7F–ÆÅ7V¶–ær’°¢F—7F6„76W76ÖVçDWfVçB‡²G—S¢$d”äÅõ$U5ôå4UôDôäR"Ò“°¢Ğ¢Ğ ¢gVæ7F–öâ†æFÆT76W76ÖVçDVffV7B†VffV7C¢76W76ÖVçDÆ–fV7–6ÆTVffV7B’°¢–b†VffV7BçG—RÓÓÒ%$UTU5Eôd”äÅõ$U5ôå4R"’°¢&WVW7D76W76ÖVçD6Æ÷6–ætöæ6R‚'7G'V7GW&Åö6ö×ÆWFR"“°¢&WGW&ã°¢Ğ¢–b†VffV7BçG—RÓÓÒ$DõEô”åôdÄ”t…Eô4Äõ4”är"’°¢F÷D–äfÆ–v‡D6Æ÷6–ær‚&f÷&vU÷6ögEö6Æ÷6R"“°¢&WGW&ã°¢Ğ¢–b†VffV7BçG—RÓÓÒ$äd”tDUõ$U5TÅE2"’°¢fö–Bf–æÆ—¦T76W76ÖVçDæDæf–vFR‚&6ö×ÆWFR"“°¢&WGW&ã°¢Ğ¢–b†VffV7BçG—RÓÓÒ$U„•EõDõô4ô4‚"’°¢fö–Bf–æÆ—¦T76W76ÖVçDæDæf–vFR‚&6æ6VÆÆVB"“°¢Ğ¢Ğ ¢gVæ7F–öâF—7F6„76W76ÖVçDWfVçB€¢WfVçC¢&ÖWFW'3ÇG—Vöb&VGV6T76W76ÖVçDÆ–fV7–6ÆSå³Ğ¢“¢76W76ÖVçDÆ–fV7–6ÆTVffV7B°¢–b‚—476W76ÖVçB’&WGW&â²G—S¢$äôäR"Ó°¢6öç7B²7FFRÂVffV7BÒÒ&VGV6T76W76ÖVçDÆ–fV7–6ÆR€¢76W76ÖVçDÆ–fV7–6ÆU&Vbæ7W'&VçBÀ¢WfVç@¢“°¢7–æ476W76ÖVçDÆ–fV7–6ÆR‡7FFR“°¢†æFÆT76W76ÖVçDVffV7B†VffV7B“°¢&WGW&âVffV7C°¢Ğ ¢7–æ2gVæ7F–öâf–æÆ—¦T76W76ÖVçDæDæf–vFR€¢÷WF6öÖS¢&6ö×ÆWFR"Â&6æ6VÆÆVB ¢’°¢–b†76W76ÖVçDæf–vFVE&Vbæ7W'&VçB’&WGW&ã°¢76W76ÖVçDæf–vFVE&Vbæ7W'&VçBÒG'VS° ¢–b†76W76ÖVçD6Æ÷6–æuF–ÖW%&Vbæ7W'&VçB’°¢6ÆV%F–ÖV÷WB†76W76ÖVçD6Æ÷6–æuF–ÖW%&Vbæ7W'&VçB“°¢76W76ÖVçD6Æ÷6–æuF–ÖW%&Vbæ7W'&VçBÒçVÆÃ°¢Ğ¢6ÆV$76W76ÖVçEG&ç67&—EGW&åF–ÖW"‚“°¢76W76ÖVçDv—F–æuG&ç67&—EGW&å&Vbæ7W'&VçBÒfÇ6S° ¢6öç7BÆ–fRÒ76W76ÖVçDÆ–fV7–6ÆU&Vbæ7W'&VçC°¢6öç7B&7F–6U6W76–öä–BÒ&7F–6U6W76–öå&Vbæ7W'&VçCòæ–BóòçVÆÃ°¢6öç7B76W76ÖVçE6æ6†÷BÒ'V–ÆD76W76ÖVçE6æ6†÷B†Æ–fRÂ°¢&7F–6U6W76–öä–BÀ¢7Vff–6–VçC¢÷WF6öÖRÓÓÒ&6ö×ÆWFR"À¢Ò“°¢–b†76W76ÖVçE6æ6†÷B’°¢òò&W7VÇG2T’²Åw&—FR6†&RF†—26æ6†÷B…7FW2n(	3r’à¢W'6—7D76W76ÖVçE6æ6†÷D6Æ–VçB†76W76ÖVçE6æ6†÷B“°¢Ğ ¢6öç7B6æ6†÷BÒ²ââçGW&ç5&Vbæ7W'&VçEÓ°¢6öç7B–BÒfö–6U6W76–öä–E&Vbæ7W'&VçC°¢–b†–Bbb6æ6†÷BæÆVæwF‚â’°¢6fUfö–6UG&ç67&—B‡°¢fö–6U6W76–öä–C¢–BÀ¢&VÇF–ÖU6W76–öä–C¢&VÇF–ÖU6W76–öä–E&Vbæ7W'&VçBÀ¢G&6²À¢WfVçEF—FÆRÀ¢7&VFVDC¢7&VFVDE&Vbæ7W'&VçBÀ¢GW&ç3¢6æ6†÷BÀ¢Ò“°¢Ğ ¢fö–6U&Vbæ7W'&VçBæöå6W76–öäVæB‚“°¢6öç7BW6vT–BÒW6vT–E&Vbæ7W'&VçC°¢W6vT–E&Vbæ7W'&VçBÒçVÆÃ°¢–b‡W6vT–B’°¢fö–B6ö×ÆWFUfö–6UW6vUG&6¶–ær‡°¢W6vT–BÀ¢&7F–6U6W76–öä–C¢&7F–6U6W76–öå&Vbæ7W'&VçCòæ–BóòçVÆÂÀ¢Ò“°¢Ğ¢Æ–fV7–6ÆTvVæW&F–öå&Vbæ7W'&VçB³Ò°¢F—66öææV7E&VÇF–ÖR†6öææV7F–öå&Vbæ7W'&VçB“°¢6öææV7F–öå&Vbæ7W'&VçBÒçVÆÃ°¢6WDÆ—fT6öææV7F–öâ†çVÆÂ“°¢6WD7F—fUfö–6U6W76–öä–B†çVÆÂ“° ¢–b†76W76ÖVçE6æ6†÷B’°¢G'’°¢6öç7B&W7öç6RÒv—BfWF6‚‚"ö’ö76W76ÖVçBö6ö×ÆWFR"Â°¢ÖWF†öC¢%õ5B"À¢†VFW'3¢²$6öçFVçBÕG—R#¢&Æ–6F–öâö§6öâ"ÒÀ¢&öG“¢¥4ôâç7G&–æv–g’‡°¢GW&ç3¢6æ6†÷BÀ¢&7F–6U6W76–öä–BÀ¢76W76ÖVçE6æ6†÷BÀ¢Ò’À¢Ò“°¢–b‚&W7öç6Ræö²’F‡&÷ræWrW'&÷"‚$76W76ÖVçB6æ6†÷Bv2æ÷B6fVBâ"“°¢Ò6F6‚†W'"’°¢6öç6öÆRæW'&÷"‚%·fö–6UÒ76W76ÖVçB6æ6†÷BW'6—7Bf–ÆVB"ÂW'"“°¢76W76ÖVçDæf–vFVE&Vbæ7W'&VçBÒfÇ6S°¢W6„WfVçB‚$76W76ÖVçBW6R6÷VÆBæ÷B&R6fVBâÆV6R&WG'’&Vf÷&RÆVf–ærâ"“°¢&WGW&ã°¢Ğ¢Ğ ¢–b†÷WF6öÖRÓÓÒ&6æ6VÆÆVB"’°¢W6„WfVçB‚$76W76ÖVçB6æ6VÆÆVB+r&WGW&æ–ærFò6ö6‚f÷&vR"“°¢&÷WFW"ç&WÆ6R‚"öö76W76ÖVçC×W6VB"“°¢&WGW&ã°¢Ğ ¢W6„WfVçB‚$76W76ÖVçB6ö×ÆWFR+r&W7VÇG2"“°¢&÷WFW"ç&WÆ6R‚"öö76W76ÖVçB÷&W7VÇG2"“°¢Ğ ¢6öç7B6†÷tFWdF–væ÷7F–72Ò&ö6W72æVçbääôDUôTåbÓÓÒ&FWfVÆ÷ÖVçB#° ¢6öç7B6W76–öä7F—fRĞ¢Ö–4ÖöFRÓÓÒ&Ö–7&÷†öæR"b`¢6ÆÄ–çFW''WFVBb`¢‡†6RÓÓÒ'7V¶–ær"ÇÀ¢†6RÓÓÒ&Æ—7FVæ–ær"ÇÀ¢†6RÓÓÒ&6öææV7FVB"“° ¢gVæ7F–öâÇ•GW&â€¢WfVçC¢&ÖWFW'3ÇG—Vöb&VGV6UGW&å7FFSå³ÒÀ¢W‡G&3ó¢²&W7öç6T–Có¢7G&–ærĞ¢’°¢6öç7BG&ç6—F–öâÒ&VGV6UGW&å7FFR‡GW&å7FFU&Vbæ7W'&VçBÂWfVçB“°¢ÆöuGW&åG&ç6—F–öâ‡G&ç6—F–öâ“°¢–b‡G&ç6—F–öâæg&öÒÓÒG&ç6—F–öâçFò’°¢GW&å7FFU&Vbæ7W'&VçBÒG&ç6—F–öâçFó°¢6WEGW&å7FFR‡G&ç6—F–öâçFò“°¢W6„WfVçB€¢GW&âG·G&ç6—F–öâæg&ö×Ş(i"G·G&ç6—F–öâçF÷Ò+rG·G&ç6—F–öâç&V6öçÖ ¢“°¢ÒVÇ6R–b€¢G&ç6—F–öâç&V6öâç7F'G5v—F‚‚&–væ÷&Uò"’ÇÀ¢G&ç6—F–öâæ6æ6VÄf÷&vP¢’°¢W6„WfVçB†GW&â†öÆB+rG·G&ç6—F–öâç&V6öçÖ“°¢Ğ ¢òò†æG2Ög&VRfÆö÷"÷væW'6†—öæÇ’â†öÆB×Fò×FÆ²×W7Bæ÷BGV6²ö6æ6VÂö×WFP¢òòg&öÒF†—2e4Ò(	BF†R†öÆB'WGFöâ÷vç2F†RÖ–2W†6ÇW6—fVÇ’à¢–b††æG4g&VU&Vbæ7W'&VçB’°¢–b‡G&ç6—F–öâæ6æ6VÄf÷&vR’°¢òòæGW&Â––VÆB(	B6æ6VÂ²GV6²âæWfW"7W&f6R2†—F6‚öW'&÷"à¢6WDW'&÷"‚""“°¢GV6µ&VÖ÷FTf÷&vTVF–ò†6öææV7F–öå&Vbæ7W'&VçB“°¢6æ6VÄf÷&vU&W7öç6R†6öææV7F–öå&Vbæ7W'&VçB“°¢7F—fU&W7öç6T–E&Vbæ7W'&VçBÒçVÆÃ°¢òòWfVçBÖ†æFÆW"F–ÖW7F×²F†—2F‚æWfW"'Vç2GW&–ær&VæFW"à¢òòW6Æ–çBÖF—6&ÆRÖæW‡BÖÆ–æR&V7BÖ†öö·2÷W&—G¢–væ÷&Tf÷&vTVF–õVçF–Å&Vbæ7W'&VçBÒFFRææ÷r‚’²#°¢Ú±î¸Â¸­yêë¢°k¢G§¦*^ushEvent("Natural yield Â· Forge gave the floor");
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
        // Never clear at the Forgeâ†’member handoff. The member can begin near
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
        `Possible interruption Â· awaiting admitted transcript Â· level ${level.toFixed(2)}`
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
          `Intentional speech Â· member floor Â· level ${level.toFixed(2)}`
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
      pushEvent("Thinking hold Â· Forge waiting");
    } else {
      pushEvent("Thinking hold released");
    }
  }

  function requestAdmittedHandsFreeResponse(reason: string) {
    if (
      handsFreeResponseRequestedRef.current ||
      thinkingHoldBlocksResponse(thinkingHoldRef.current) ||
      !handsFreeTranscriptAdmittedRef.current ||
      !handsFreeGraceElapsedRef.m«ëŒ+Š×®º+º$zzb¥æ7W'&VçBÇÀ¢GW&å7FFU&Vbæ7W'&VçBÓÒ&Æ—7FVæ–ær ¢’°¢&WGW&ã°¢Ğ ¢6öç7BVæFVBÒÇ•GW&â‡²G—S¢$4ôåD”åTD”ôåôu$4UôTÄ4TB"Ò“°¢–b†VæFVBçFòÓÒ&f÷&vU÷F†–æ¶–ær"’&WGW&ã°¢†æG4g&VU&W7öç6U&WVW7FVE&Vbæ7W'&VçBÒG'VS°¢fö–6U&Vbæ7W'&VçBæöåW6W%7VV6…7F÷VB‚“°¢6öç7B&WVW7FVBÒ&WVW7D†öÆEGW&å&W7öç6R†6öææV7F–öå&Vbæ7W'&VçBÂ°¢ÖöFS¢'&7F–6R"À¢Ò“°¢–b‡&WVW7FVB’°¢Æ7Df÷&vT7F—f—G•&Vbæ7W'&VçBÒFFRææ÷r‚“°¢&Õ7V¶–æuvF6†För‚“°¢Ğ¢W6„WfVçB€¢&WVW7FV@¢ò†æG2Ög&VRGW&â+rFÖ—GFVB&W7öç6R&WVW7FVB+rG·&V6öçÖ ¢¢†æG2Ög&VRGW&â+rFÖ—GFVB&W7öç6R&WVW7Bf–ÆVB+rG·&V6öçÖ ¢“°¢–b‚&WVW7FVB’°¢Ç•GW&â‡²G—S¢$dõ$tUõ$U5ôå4UôDôäR"Ò“°¢fö–6U&Vbæ7W'&VçBæöäf÷&vTFöæR‚“°¢&W6WD†æG4g&VUGW&äFÖ—76–öâ‚“°¢Ğ¢Ğ ¢gVæ7F–öâ6ÆV$†æG4g&VUÆ–&6´G&–â‚’°¢–b††æG4g&VUÆ–&6´G&–åF–ÖW%&Vbæ7W'&VçB’°¢6ÆV%F–ÖV÷WB††æG4g&VUÆ–&6´G&–åF–ÖW%&Vbæ7W'&VçB“°¢†æG4g&VUÆ–&6´G&–åF–ÖW%&Vbæ7W'&VçBÒçVÆÃ°¢Ğ¢VæF–ætf÷&vU&W7öç6TFöæU&Vbæ7W'&VçBÒçVÆÃ°¢Ğ ¢gVæ7F–öâ6ö×ÆWFTf÷&vU&W7öç6R‡&W7öç6T–Có¢7G&–ær’°¢–b†–çFW''WEvF6†Föu&Vbæ7W'&VçB’°¢6ÆV%F–ÖV÷WB†–çFW''WEvF6†Föu&Vbæ7W'&VçB“°¢–çFW''WEvF6†Föu&Vbæ7W'&VçBÒçVÆÃ°¢Ğ¢6ÆV$†æG4g&VUÆ–&6´G&–â‚“°¢Ç•GW&â‡²G—S¢$dõ$tUõ$U5ôå4UôDôäR"Â&W7öç6T–BÒ“°¢&W6WD†æG4g&VUGW&äFÖ—76–öâ‚“°¢F†–æ¶–æt†öÆE&Vbæ7W'&VçBÒfÇ6S°¢6WEF†–æ¶–æt†öÆB†fÇ6R“°¢6WE†6R‚†7W'&VçB’Óà¢7W'&VçBÓÓÒ'7V¶–ær ¢ò&Æ—7FVæ–ær ¢¢7W'&VçBÓÓÒ&6öææV7F–ær ¢ò&6öææV7FVB ¢¢7W'&Vç@¢“°¢fö–6U&Vbæ7W'&VçBæöäf÷&vTFöæR‚“°¢–b‡VæF–æt'VFvWE&Vbæ7W'&VçBÒçVÆÂ’°¢Ç”÷WGWD'VFvWB†6öææV7F–öå&Vbæ7W'&VçBÂVæF–æt'VFvWE&Vbæ7W'&VçB“°¢VæF–æt'VFvWE&Vbæ7W'&VçBÒçVÆÃ°¢Ğ¢W6„WfVçB€¢&W7öç6RFöæR+rG·&W7öç6T–Bóò'Væ¶æ÷vâ'Ò+rÖVÖ&W"Ö–2&VG– ¢“° ¢–b†—476W76ÖVçB’°¢6öç7BFöæTFV6—6–öâÒFV6–FT76W76ÖVçE&W7öç6TFöæR€¢76W76ÖVçDÆ–fV7–6ÆU&Vbæ7W'&VçBÀ¢°¢6Æ÷6–æu6VçC¢76W76ÖVçD6Æ÷6–æu6VçE&Vbæ7W'&VçBÀ¢VæF–æt6Æ÷6–ætgFW$FöæS ¢76W76ÖVçEVæF–æt6Æ÷6–ætgFW$FöæU&Vbæ7W'&VçBÀ¢æf–vFVC¢76W76ÖVçDæf–vFVE&Vbæ7W'&VçBÀ¢Ğ¢“°¢–b†FöæTFV6—6–öâæ7F–öâÓÓÒ'6VæEö6Æ÷6–ær"’°¢–b†76W76ÖVçD6Æ÷6–æuF–ÖW%&Vbæ7W'&VçB’°¢6ÆV%F–ÖV÷WB†76W76ÖVçD6Æ÷6–æuF–ÖW%&Vbæ7W'&VçB“°¢76W76ÖVçD6Æ÷6–æuF–ÖW%&Vbæ7W'&VçBÒçVÆÃ°¢Ğ¢6VæD76W76ÖVçD6Æ÷6–æu7VV6‚‚&gFW%ö–åöfÆ–v‡EöFöæR"“°¢&WGW&ã°¢Ğ¢–b†FöæTFV6—6–öâæ7F–öâÓÓÒ&f–æÆ—¦R"’°¢F—7F6„76W76ÖVçDWfVçB‡²G—S¢$d”äÅõ$U5ôå4UôDôäR"Ò“°¢Ğ¢Ğ¢Ğ ¢gVæ7F–öâv—Df÷$†æG4g&VUÆ–&6´G&–â‡&W7öç6T–Có¢7G&–ær’°¢6ÆV$†æG4g&VUÆ–&6´G&–â‚“°¢VæF–ætf÷&vU&W7öç6TFöæU&Vbæ7W'&VçBÒ²&W7öç6T–BÓ°¢†æG4g&VUÆ–&6´G&–åF–ÖW%&Vbæ7W'&VçBÒ6WEF–ÖV÷WB‚‚’Óâ°¢†æG4g&VUÆ–&6´G&–åF–ÖW%&Vbæ7W'&VçBÒçVÆÃ°¢6öç7BVæF–ærÒVæF–ætf÷&vU&W7öç6TFöæU&Vbæ7W'&VçC°¢VæF–ætf÷&vU&W7öç6TFöæU&Vbæ7W'&VçBÒçVÆÃ°¢–b‚VæF–ærÇÂÖ÷VçFVE&Vbæ7W'&VçB’&WGW&ã°¢W6„WfVçB‚$f÷&vRÆ–&6²G&–â+rfÆÆ&6²VÆ6VB"“°¢6ö×ÆWFTf÷&vU&W7öç6R‡VæF–ærç&W7öç6T–B“°¢ÒÂ„äE5ôe$TUõÄ”$4µôE$”åôdÄÄ$4µôÕ2“°¢W6„WfVçB‚%&W7öç6RvVæW&FVB+rv—F–ærf÷"7V¶W"Æ–&6²Fòf–æ—6‚"“°¢Ğ ¢gVæ7F–öâ&Ô†æG4g&VU&W7öç6Tw&6R‡&V6öã¢7G&–ærÂG&ç67&—Có¢7G&–ærÂçVÆÂ’°¢–b†—476W76ÖVçBÇÂ†æG4g&VU&Vbæ7W'&VçB’&WGW&ã°¢6ÆV$†æG4g&VU&W7öç6Tw&6R‚“° ¢6öç7BW6VBÒÇ•GW&â‡°¢G—S¢%U4U%õ5TT4…õU4TB"À¢6÷W&6S¢'6W'fW%÷fB"À¢Ò“°¢–b‡W6VBçFòÓÒ&Æ—7FVæ–ær"’&WGW&ã° ¢6öç7B7VV6…7F÷VDBÒFFRææ÷r‚“°¢6öç7Bw&6T×2Ò6öçF–çVF–öäw&6T×4f÷%WGFW&æ6R€¢G&ç67&—BóòÆ7D†æG4g&VTf÷VæFW%FW‡E&Vbæ7W'&Vç@¢“°¢6öç7B7VV6…7F'FVDBÒ†æG4g&VU7VV6…7F'FVDE&Vbæ7W'&VçC°¢†æG4g&VUGW&åF–Ö–æu&Vbæ7W'&VçBÒ°¢7VV6…7F÷VDBÀ¢fEv—D×3¢7VV6…7F'FVDBÒçVÆÂò7VV6…7F÷VDBÒ7VV6…7F'FVDB¢çVÆÂÀ¢w&6T×2À¢w&6TVÆ6VDC¢çVÆÂÀ¢&W7öç6T7&VFVDC¢çVÆÂÀ¢f—'7DVF–ôC¢çVÆÂÀ¢ÆövvVDVF–ó¢fÇ6RÀ¢Ó°¢†æG4g&VU&W7öç6UF–ÖW%&Vbæ7W'&VçBÒ6WEF–ÖV÷WB‚‚’Óâ°¢†æG4g&VU&W7öç6UF–ÖW%&Vbæ7W'&VçBÒçVÆÃ°¢–b‚Ö÷VçFVE&Vbæ7W'&VçBÇÂ—476W76ÖVçBÇÂ†æG4g&VU&Vbæ7W'&VçB’&WGW&ã°¢–b‡GW&å7FFU&Vbæ7W'&VçBÓÒ&Æ—7FVæ–ær"’&WGW&ã°¢†æG4g&VTw&6TVÆ6VE&Vbæ7W'&VçBÒG'VS°¢6öç7BF–Ö–ærÒ†æG4g&VUGW&åF–Ö–æu&Vbæ7W'&VçC°¢–b‡F–Ö–ær’F–Ö–æræw&6TVÆ6VDBÒFFRææ÷r‚“°¢–b‚†æG4g&VUG&ç67&—DFÖ—GFVE&Vbæ7W'&VçB’°¢W6„WfVçB€¢†æG2Ög&VRGW&â+rw&6RVÆ6VB+rv—F–ærFÖ—GFVBG&ç67&—B+rG·&V6öçÖ ¢“°¢&WGW&ã°¢Ğ¢&WVW7DFÖ—GFVD†æG4g&VU&W7öç6R€¢G¶w&6T×7Ö×2w&6R+rG·&V6öçÖ ¢“°¢ÒÂw&6T×2“°¢W6„WfVçB†7VV6‚W6R+rv—F–ærG¶w&6T×7Ö×2f÷"6öçF–çVF–öâ+rG·&V6öçÖ“°¢Ğ ¢gVæ7F–öâ6ÆV$–çFW''WEF–ÖW'2‚’°¢–b†–çFW''WEvF6†Föu&Vbæ7W'&VçB’°¢6ÆV%F–ÖV÷WB†–çFW''WEvF6†Föu&Vbæ7W'&VçB“°¢–çFW''WEvF6†Föu&Vbæ7W'&VçBÒçVÆÃ°¢Ğ¢–b†–çFW''WDw&6U&Vbæ7W'&VçB’°¢6ÆV%F–ÖV÷WB†–çFW''WDw&6U&Vbæ7W'&VçB“°¢–çFW''WDw&6U&Vbæ7W'&VçBÒçVÆÃ°¢Ğ¢Ğ ¢gVæ7F–öâæ÷FT6ÆÄ–çFW''WFVB‡&V6öã¢7G&–ær’°¢–b†—4wVW7E&Wf–Wr’&WGW&ã°¢–b†6ÆÄ–çFW''WFVE&Vbæ7W'&VçB’&WGW&ã°¢6öç7B†6Tæ÷rÒ†6U&Vbæ7W'&VçC°¢–b€¢†6Tæ÷rÓÓÒ&–FÆR"ÇÀ¢†6Tæ÷rÓÓÒ&ÖöÖVçGVÒ"ÇÀ¢†6Tæ÷rÓÓÒ&W'&÷""ÇÀ¢†6Tæ÷rÓÓÒ&Ö–çF–ær ¢’°¢&WGW&ã°¢Ğ¢6ÆÄ–çFW''WFVE&Vbæ7W'&VçBÒG'VS°¢6WD6ÆÄ–çFW''WFVB‡G'VR“°¢6ÆV$†æG4g&VU&W7öç6Tw&6R‚“°¢&W6WD†æG4g&VUGW&äFÖ—76–öâ‚“°¢F†–æ¶–æt†öÆE&Vbæ7W'&VçBÒfÇ6S°¢6WEF†–æ¶–æt†öÆB†fÇ6R“°¢6ÆV$†æG4g&VUÆ–&6´G&–â‚“°¢6ÆV$–çFW''WEF–ÖW'2‚“°¢6æ6VÄf÷&vU&W7öç6R†6öææV7F–öå&Vbæ7W'&VçB“°¢GV6µ&VÖ÷FTfÚ±î¸Â¸­yêë¢°k¢G§¦*^orgeAudio(connectionRef.current);
    setMicrophoneEnabled(connectionRef.current, false);
    setOutboundMicrophoneEnabled(connectionRef.current, false);
    turnStateRef.current = "listening";
    setTurnState("listening");
    setPhase((current) => (current === "speaking" ? "connected" : current));
    pushEvent(`Call interrupted Â· ${reason}`);
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
    if (isGuestPreview) return;
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
  }, [isGuestPreview]);

  function pushEvent(label: string) {
    setEvents((prev) =>
      [`${new Date().toISOString().slice(11, 19)} ${label}`, ...prev].slice(
        0,
        16
      )
    );
  }

  function persistTurns(nextTurns: TranscriptTurn[]) {
    if (isGuestPreview) return;
    const id = voiceSessionIdRef.current;
    if (!id) return;
    saveVoiceTranscript({
      voiceSessionId: id,
      realtimeSessionId: realtimeSessionIdRef.current,
      practiceSessionId: practiceSessionRef.current?.id ?? null,
      track,
      eventTitle,
      createdAt: createdAtRef.current,
      turns: nextTurns,
    });
    setActiveVoiceSessionId(id);

    const practice = practiceSessionRef.current;
    // Do not upsert after End â€” late writes were clearing completed_at.
    if (practice && !practice.completedAt) {
      const conversation = voiceTurnsToConversationTurns(nextTurns);
      void persistActiveSession(practice, conversation)
        .then((updated) => {
          if (!practiceSessionRef.current?.completedAt) {
            practiceSessionRef.current = updated;
          }
        })
        .catch((err) => {
  m«ëŒ+Š×®º+º$zzb¥â6öç6öÆRçv&â‚%·fö–6UÒW'6—7B6W76–öâf–ÆVB"ÂW'"“°¢Ò“°¢Ğ¢Ğ ¢gVæ7F–öâ&V6öä–æ6ö×ÆWFU6W76–öå&V6÷fW'’‚’°¢–b†—4wVW7E&Wf–WrÇÂ—476W76ÖVçB’&WGW&ã°¢6öç7B&7F–6RÒ&7F–6U6W76–öå&Vbæ7W'&VçC°¢–b‚&7F–6RÇÂ&7F–6Ræ6ö×ÆWFVDBÇÂGW&ç5&Vbæ7W'&VçBæÆVæwF‚ÓÓÒ’&WGW&ã°¢6öç7B&öG’Ò¥4ôâç7G&–æv–g’‡²6W76–öä–C¢&7F–6Ræ–BÒ“°¢G'’°¢6öç7B&V6öâÒæWr&Æö"…¶&öG•ÒÂ²G—S¢&Æ–6F–öâö§6öâ"Ò“°¢–b‡G—Vöbæf–vF÷"ÓÒ'VæFVf–æVB"bbæf–vF÷"ç6VæD&V6öâ‚"ö’÷6W76–öâ÷&V6÷fW""Â&V6öâ’’°¢W6„WfVçB‚%6fVBGW&ç2+r&V6÷fW'’VWVVB"“°¢&WGW&ã°¢Ğ¢Ò6F6‚°¢òòfÆÂF‡&÷Vv‚Fò¶VWÆ—fR&WVW7Bv†W&R6VæD&V6öâ—2Væf–Æ&ÆRà¢Ğ¢fö–BfWF6‚‚"ö’÷6W76–öâ÷&V6÷fW""Â²ÖWF†öC¢%õ5B"Â†VFW'3¢²&6öçFVçB×G—R#¢&Æ–6F–öâö§6öâ"ÒÂ&öG’Â¶VWÆ—fS¢G'VRÒ’æ6F6‚‚‚’ÓâVæFVf–æVB“°¢Ğ ¢gVæ7F–öâG&6µW6vR€¢WfVçC¢&76—7FçE÷GW&â"Â'W6W%÷7VV6‚"Â&&&vUö–â"Â&76—7FçE÷FW‡B"À¢FW‡Có¢7G&–æp¢’°¢6öç7BW6vT–BÒW6vT–E&Vbæ7W'&VçC°¢–b‚W6vT–B’&WGW&ã°¢fö–B&W÷'Efö–6UW6vTWfVçB‡²W6vT–BÂWfVçBÂFW‡BÒ’çF†Vâ‚†Gf–6R’Óâ°¢–b‚Gf–6SòæÖ„÷WGWEFö¶Vç2’&WGW&ã°¢òòFVfW"6W76–öâçWFFRVçF–Âf÷&vR—2æ÷B7V¶–ær(	Bfö–G2Ö–B×WGFW&æ6R6‡W&âà¢–b€¢GW&å7FFU&Vbæ7W'&VçBÓÓÒ&f÷&vU÷7V¶–ær"ÇÀ¢GW&å7FFU&Vbæ7W'&VçBÓÓÒ&f÷&vU÷F†–æ¶–ær ¢’°¢VæF–æt'VFvWE&Vbæ7W'&VçBÒGf–6RæÖ„÷WGWEFö¶Vç3°¢&WGW&ã°¢Ğ¢Ç”÷WGWD'VFvWB†6öææV7F–öå&Vbæ7W'&VçBÂGf–6RæÖ„÷WGWEFö¶Vç2“°¢Ò“°¢Ğ ¢gVæ7F–öâ†æFÆU6W'fW$WfVçB†WfVçC¢&V6÷&CÇ7G&–ærÂVæ¶æ÷vãâ’°¢6öç7BG—RÒG—VöbWfVçBçG—RÓÓÒ'7G&–ær"òWfVçBçG—R¢&WfVçB#°¢–b†—4f÷&vT÷WGWDWfVçEG—R‡G—R’’°¢Æ7Df÷&vT7F—f—G•&Vbæ7W'&VçBÒFFRææ÷r‚“°¢Ğ ¢6öç7Bf–æÆ—¦VDf÷VæFW"ÒW‡G&7Df–æÆ—¦VDf÷VæFW%G&ç67&—B†WfVçB“°¢–b†f–æÆ—¦VDf÷VæFW"bb†æG4g&VU&Vbæ7W'&VçBbb—476W76ÖVçB’°¢6öç7BF†–æ¶–æu‡&6RÒõâƒó¦v—fRÖR6V6öæGÇ7F–ÆÂF†–æ¶–æwÆöæR6V2ƒó¦öæB“÷Æ†öÆBöâ•²âòÒ¢Bö’çFW7B†f–æÆ—¦VDf÷VæFW"çFW‡BçG&–Ò‚’“°¢–b‡F†–æ¶–æu‡&6R’°¢F†–æ¶–æt†öÆE&Vbæ7W'&VçBÒG'VS°¢6WEF†–æ¶–æt†öÆB‡G'VR“°¢6ÆV$†æG4g&VU&W7öç6Tw&6R‚“°¢†æG4g&VTw&6TVÆ6VE&Vbæ7W'&VçBÒfÇ6S°¢&V6÷&D†æG4g&VTFÖ—76–öâ€¢&6öçG&öÂ"À¢&W‡Æ–6—E÷F†–æ¶–æuö†öÆB"À¢f–æÆ—¦VDf÷VæFW"çFW‡BÀ¢f–æÆ—¦VDf÷VæFW"æ—FVÔ–@¢“°¢FVÆWFU&VÇF–ÖT6öçfW'6F–öä—FVÒ†6öææV7F–öå&Vbæ7W'&VçBÂf–æÆ—¦VDf÷VæFW"æ—FVÔ–B“°¢6WDÆ—fUW6W$G&gB‚""“°¢W6„WfVçB‚%F†–æ¶–ær†öÆB+rf÷&vRv—F–ær"“°¢&WGW&ã°¢Ğ¢–b‡F†–æ¶–æt†öÆE&Vbæ7W'&VçB’°¢F†–æ¶–æt†öÆE&Vbæ7W'&VçBÒfÇ6S°¢6WEF†–æ¶–æt†öÆB†fÇ6R“°¢†æG4g&VTw&6TVÆ6VE&Vbæ7W'&VçBÒfÇ6S°¢W6„WfVçB‚%F†–æ¶–ær†öÆB&VÆV6VB'’7VV6‚"“°¢Ğ¢Æ7D†æG4g&VTf÷VæFW%FW‡E&Vbæ7W'&VçBÒf–æÆ—¦VDf÷VæFW"çFW‡C°¢6öç7BFV6—6–öâÒFV6–FUG&ç67&—DFÖ—76–öâ‡°¢FW‡C¢f–æÆ—¦VDf÷VæFW"çFW‡BÀ¢Æö6ÆÇ”6öæf—&ÖVC¢†æG4g&VTÆö6ÅGW&ä6öæf—&ÖVE&Vbæ7W'&VçBÀ¢Ò“°¢–b†FV6—6–öâÓÓÒ&†öÆB"’°¢6ÆV$†æG4g&VU&W7öç6Tw&6R‚“°¢6öç7BW†—7F–ærÒVæF–æt†æG4g&VUG&ç67&—E&Vbæ7W'&VçC°¢–b†W†—7F–ær’6ÆV%VæF–æt†æG4g&VUG&ç67&—B‚'7WW'6VFVEö'•öæWu÷G&ç67&—B"“°¢&V6÷&D†æG4g&VTFÖ—76–öâ€¢&†VÆB"À¢&v—F–æuöÆö6Åö6öæf—&ÖF–öâ"À¢f–æÆ—¦VDf÷VæFW"çFW‡BÀ¢f–æÆ—¦VDf÷VæFW"æ—FVÔ–@¢“°¢6öç7BF–ÖW"Ò6WEF–ÖV÷WB‚‚’Óâ°¢6öç7BVæF–ærÒVæF–æt†æG4g&VUG&ç67&—E&Vbæ7W'&VçC°¢–b‚VæF–ærÇÂVæF–æræ—FVÔ–BÓÒf–æÆ—¦VDf÷VæFW"æ—FVÔ–B’&WGW&ã°¢VæF–æt†æG4g&VUG&ç67&—E&Vbæ7W'&VçBÒçVÆÃ°¢&V6÷&D†æG4g&VTFÖ—76–öâ€¢&G&÷VB"À¢&Æö6Åö6öæf—&ÖF–öå÷F–ÖV÷WB"À¢f–æÆ—¦VDf÷VæFW"çFW‡BÀ¢f–æÆ—¦VDf÷VæFW"æ—FVÔ–@¢“°¢FVÆWFU&VÇF–ÖT6öçfW'6F–öä—FVÒ€¢6öææV7F–öå&Vbæ7W'&VçBÀ¢f–æÆ—¦VDf÷VæFW"æ—FVÔ–@¢“°¢W6„WfVçB€¢†V&B'WBæ÷B6öæf—&ÖVC¢"G¶f–æÆ—¦VDf÷VæFW"çFW‡Bç6Æ–6RƒÂC‚—ÒG°¢f–æÆ—¦VDf÷VæFW"çFW‡BæÆVæwF‚âC‚ò.(
b"¢" ¢Ò& ¢“°¢ÒÂ„äE5ôe$TUôDÔ•54”ôåô„ôÄEôÕ2“°¢VæF–æt†æG4g&VUG&ç67&—E&Vbæ7W'&VçBÒ°¢WfVçBÀ¢FW‡C¢f–æÆ—¦VDf÷VæFW"çFW‡BÀ¢—FVÔ–C¢f–æÆ—¦VDf÷VæFW"æ—FVÔ–Bóò""À¢F–ÖW"À¢Ó°¢W6„WfVçB€¢†V&B'WBæ÷B6öæf—&ÖVC¢"G¶f–æÆ—¦VDf÷VæFW"çFW‡Bç6Æ–6RƒÂC‚—ÒG°¢f–æÆ—¦VDf÷VæFW"çFW‡BæÆVæwF‚âC‚ò.(
b"¢" ¢Ò& ¢“°¢&WGW&ã°¢Ğ¢–b†FV6—6–öâÓÓÒ&G&÷"’°¢6ÆV$†æG4g&VU&W7öç6Tw&6R‚“°¢&W6WD†æG4g&VUGW&äFÖ—76–öâ‚“°¢6WDÆ—fUW6W$G&gB‚""“°¢FVÆWFU&VÇF–ÖT6öçfW'6F–öä—FVÒ€¢6öææV7F–öå&Vbæ7W'&VçBÀ¢f–æÆ—¦VDf÷VæFW"æ—FVÔ–@¢“°¢–b€¢GW&å7FFU&Vbæ7W'&VçBÓÓÒ'W6W%÷7V¶–ær"ÇÀ¢GW&å7FFU&Vbæ7W'&VçBÓÓÒ&–çFW''WFVB ¢’°¢Ç•GW&â‡²G—S¢%U4U%õ5TT4…õU4TB"Â6÷W&6S¢'6W'fW%÷fB"Ò“°¢Ğ¢&V6÷&D†æG4g&VTFÖ—76–öâ€¢&G&÷VB"À¢&æöå÷7V'7FçF—fU÷v—F†÷WEöÆö6Åö6öæf—&ÖF–öâ"À¢f–æÆ—¦VDf÷VæFW"çFW‡BÀ¢f–æÆ—¦VDf÷VæFW"æ—FVÔ–@¢“°¢W6„WfVçB†–væ÷&VBVæ6öæf—&ÖVBæöâ×7V'7FçF—fRG&ç67&—B+r"G¶f–æÆ—¦VDf÷VæFW"çFW‡Bç6Æ–6RƒÂ3"—ÒG°¢f–æÆ—¦VDf÷VæFW"çFW‡BæÆVæwF‚â3"ò.(
b"¢" ¢Ò&“°¢&WGW&ã°¢Ğ¢&V6÷&D†æG4g&VTFÖ—76–öâ€¢&FÖ—GFVB"À¢&Æö6Åö6öæf—&ÖF–öåö&Vf÷&U÷G&ç67&—B"À¢f–æÆ—¦VDf÷VæFW"çFW‡BÀ¢f–æÆ—¦VDf÷VæFW"æ—FVÔ–@¢“°¢†æG4g&VUG&ç67&—DFÖ—GFVE&Vbæ7W'&VçBÒG'VS°¢6öç7BVæF–æt&&vTÆWfVÂÒFÖ—GFVD†æG4g&VT&&vTÆWfVÂ‡°¢7FFS¢GW&å7FFU&Vbæ7W'&VçBÀ¢VæF–ætÆWfVÃ¢VæF–æt†æG4g&VT&&vTÆWfVÅ&Vbæ7W'&VçBÀ¢G&ç67&—DFÖ—GFVC¢G'VRÀ¢Ò“°¢–b‡VæF–æt&&vTÆWfVÂÒçVÆÂ’°¢Ú±î¸Â¸­yêë¢°k¢G§¦*^ pendingHandsFreeBargeLevelRef.current = null;
        const yielded = applyTurn({
          type: "CONFIRMED_BARGE_IN",
          level: pendingBargeLevel,
        });
        if (yielded.to === "interrupted") {
          trackUsage("barge_in");
          setPhase("listening");
          voiceRef.current.onBargeIn();
          armHandsFreeResponseGrace("admitted_barge_in_transcript");
        }
      }
      if (handsFreeGraceElapsedRef.current) {
        requestAdmittedHandsFreeResponse("transcript admitted after grace");
      } else if (thinkingHoldRef.current === false) {
        // Re-arm with the admitted utterance so a clearly finished answer can
        // yield sooner, while fragmentary speech keeps the full hold.
        armHandsFreeResponseGrace(
          handsFreeResponseTimerRef.current
            ? "admitted transcript refinement"
            : "member speech after thinking hold",
          finalizedFounder.text
        );
      }
    }

    const live = extractLiveTranscriptDelta(event);
    if (live) {
      if (live.done) {
        if (live.role === "forge") setLiveForgeDraft("");
        else setLiveUserDraft("");
      } else if (live.role === "forge") {
        setLiveForgeDraft((prev) => prev + live.delta);
      } else {
        if (
          handsFreeRef.current &&
          !isAssessment &&
          !handsFreeLocalTurnConfirmedRef.current
        ) {
          return;
        }
        // Partial user transcripts may be cumulative snapshots or deltas.
        setLiveUserDraft((prev) =>
          live.delta.startsWith(prev) ? live.delta : prev + live.delta
        );
      }
    }

    // Only Forge OUTPUT events own the speaking phase â€” never input mic/"audio" events.
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
        clearHandsFreeResponseGrace();
        clearHandsFreePlaybackDrain();
        sawForgeAudioRef.current = false;
        forgePlaybackStoppedRef.current = false;
        const responseId =
          typeof event.response_id === "string"
            ? event.response_id
            : event.response &&
                typeof event.response === "object" &&
                typeof (event.response as { id?: unknown }).id === "string"
              ? ((event.response as { id: string }).id)
              : undefined;

        const timing = handsFreeTurnTimingRef.current;
        if (timing && handsFreeRef.current && !isAssessment) {
          timing.responseCreatedAt = Date.now();
          console.info("[voice-turn-timing] response-created", {
            vadWaitMs: timing.vadWaitMs,
            continuationGraceMs: timing.graceMs,
            modelLatencyMs:
              timing.graceElapsedAt == null
                ? null
                : timing.responseCreatedAt - timing.graceElapsedAt,
          });
        }

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
              `Cancelled stray response Â· ${responseId ?? "unknown"} Â· assessment locked`
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
          pushEvent(`Turn hold Â· duplicate_response_created_${responseId}`);
        } else {
          // Mute before any further turn work â€” Forge owns the floor now.
          if (!handsFreeRef.current) {
            voiceRef.current.onForgeStarted();
            setMicrophoneEnabled(connectionRef.current, false);
            setOutboundMicrophoneEnabled(connectionRef.current, false);
            clearInputAudioBuffer(connectionRef.current);
            pushEvent("Mic muted Â· Forge speaking");
          }
          applyTurn(
            { type: "FORGE_RESPONSE_CREATED", responseId },
            { responseId }
          );
          voiceRef.current.onForgeStarted();
          trackUsage("assistant_turn");
          pushEvent(
            `Response start Â· ${responseId ?? "unknown"} Â· reason=server_or_opening`
          );
        }
      }
    }

    if (
      type === "response.output_audio.delta" ||
      type === "response.audio.delta"
    ) {
      if (Date.now() >= ignoreForgeAudioUntilRef.current) {
        sawForgeAudioRef.current = true;
        const timing = handsFreeTurnTimingRef.current;
        if (timing && !timing.loggedAudio && timing.responseCreatedAt != null) {
          timing.firstAudioAt = Date.now();
          timing.loggedAudio = true;
          consolm«ëŒ+Š×®º+º$zzb¥æRæ–æfò‚%·fö–6R×GW&â×F–Ö–æuÒf—'7BÖVF–ò"Â°¢fEv—D×3¢F–Ö–ærçfEv—D×2À¢6öçF–çVF–öäw&6T×3¢F–Ö–æræw&6T×2À¢ÖöFVÄÆFVæ7”×3 ¢F–Ö–æræw&6TVÆ6VDBÓÒçVÆÀ¢òçVÆÀ¢¢F–Ö–ærç&W7öç6T7&VFVDBÒF–Ö–æræw&6TVÆ6VDBÀ¢GG4ÆFVæ7”×3¢F–Ö–æræf—'7DVF–ôBÒF–Ö–ærç&W7öç6T7&VFVDBÀ¢F÷FÅ6–ÆVæ6T×3¢F–Ö–æræf—'7DVF–ôBÒF–Ö–ærç7VV6…7F÷VDBÀ¢Ò“°¢Ğ¢Ç•GW&â‡²G—S¢$dõ$tUôTD”õôDTÅD"Ò“°¢Ğ¢Ğ ¢–b‡G—RÓÓÒ&÷WGWEöVF–õö'VffW"ç7F÷VB"’°¢f÷&vUÆ–&6µ7F÷VE&Vbæ7W'&VçBÒG'VS°¢6öç7BVæF–ærÒVæF–ætf÷&vU&W7öç6TFöæU&Vbæ7W'&VçC°¢–b‡VæF–ær’°¢W6„WfVçB‚$f÷&vRÆ–&6²G&–â+r7V¶W"7F÷VB"“°¢6ö×ÆWFTf÷&vU&W7öç6R‡VæF–ærç&W7öç6T–B“°¢Ğ¢Ğ ¢–b‡G—RÓÓÒ'&W7öç6RæFöæR"’°¢6öç7B&W7öç6T–BĞ¢G—VöbWfVçBç&W7öç6Uö–BÓÓÒ'7G&–ær"òWfVçBç&W7öç6Uö–B¢VæFVf–æVC°¢6öç7B6†÷VÆDG&–åÆ–&6²Ò6†÷VÆEv—Df÷$†æG4g&VUÆ–&6´G&–â‡°¢†æG4g&VS¢†æG4g&VU&Vbæ7W'&VçBÀ¢—476W76ÖVçBÀ¢6tf÷&vTVF–ó¢6tf÷&vTVF–õ&Vbæ7W'&VçBÀ¢Æ–&6µ7F÷VC¢f÷&vUÆ–&6µ7F÷VE&Vbæ7W'&VçBÀ¢7FFS¢GW&å7FFU&Vbæ7W'&VçBÀ¢Ò“°¢–b‡6†÷VÆDG&–åÆ–&6²’°¢v—Df÷$†æG4g&VUÆ–&6´G&–â‡&W7öç6T–B“°¢ÒVÇ6R°¢6ö×ÆWFTf÷&vU&W7öç6R‡&W7öç6T–B“°¢Ğ¢Ğ ¢–b‡G—RÓÓÒ&–çWEöVF–õö'VffW"ç7VV6…÷7F'FVB"’°¢–b€¢—476W76ÖVçBb`¢FV6–FT76W76ÖVçEfDWfVçB†76W76ÖVçDÆ–fV7–6ÆU&Vbæ7W'&VçB’ÓÓÒ&–væ÷&R ¢’°¢×WFT76W76ÖVçEFW&Ö–æÄÖ–2‚'7VV6…÷7F'FVB"“°¢W6„WfVçB‚$–væ÷&VB7VV6…÷7F'FVB+r76W76ÖVçBFW&Ö–æÂ"“°¢&WGW&ã°¢Ğ¢òò†öÆBÖöFS¢ç’7VV6…÷7F'FVBv†–ÆRf÷&vR—2Æ—fR—2V6†ò(	B&V×WFRà¢–b€¢†æG4g&VU&Vbæ7W'&VçBb`¢‡†6U&Vbæ7W'&VçBÓÓÒ'7V¶–ær"ÇÀ¢GW&å7FFU&Vbæ7W'&VçBÓÓÒ&f÷&vU÷7V¶–ær"ÇÀ¢GW&å7FFU&Vbæ7W'&VçBÓÓÒ&f÷&vU÷F†–æ¶–ær"¢’°¢6WDÖ–7&÷†öæTVæ&ÆVB†6öææV7F–öå&Vbæ7W'&VçBÂfÇ6R“°¢6WD÷WF&÷VæDÖ–7&÷†öæTVæ&ÆVB†6öææV7F–öå&Vbæ7W'&VçBÂfÇ6R“°¢6ÆV$–çWDVF–ô'VffW"†6öææV7F–öå&Vbæ7W'&VçB“°¢W6„WfVçB‚$–væ÷&VB7VV6…÷7F'FVB+rÖ–2×WFVBv†–ÆRf÷&vR7V·2"“°¢&WGW&ã°¢Ğ¢òò†öÆBÖöFS¢7VV6‚v†–ÆR'WGFöâ—2F÷vâ(	BÖ&²f÷"&WÇ’Ööâ×&VÆV6Rà¢òòFòäõBG&VBF†—22W&Ö—76–öâf÷"f÷&vRFòFÆ²†7&VFU÷&W7öç6Röfb’à¢–b‚†æG4g&VU&Vbæ7W'&VçB’°¢fö–6U&Vbæ7W'&VçBææ÷FT†öÆE7VV6‚‚“°¢W6„WfVçB‚$ÖVÖ&W"7VV6‚+r†öÆF–ær+rf÷&vRv—G2f÷"&VÆV6R"“°¢&WGW&ã°¢Ğ¢òò&&R6W'fW"dBWfVçBæWfW"÷vç2F†RfÆö÷"Â'WB—B6â'&—fRv†–ÆP¢òòF†RÆö6ÂæÇ—6W"—26öæf—&Ö–ær6öçF–çVF–öââF†RÆö6ÂÖVæW&w¢òò6ÆÆ&6²6æ6VÇ2F†Rw&6RöæÇ’gFW"–çFVçF–öæÂ7VV6‚—26öæf—&ÖVBà¢òò5$•D”4Ã¢æWfW"&W7öç6Ræ6æ6VÂg&öÒ&&R6W'fW"dB(	B†öæRV6†ğ¢òòfÇ6VÇ’f—&W2F†—2v†–ÆRf÷&vREE2Æ—2÷fW"F†R7V¶W"à¢6öç7BG&ç6—F–öâÒÇ•GW&â‡°¢G—S¢%U4U%õ5TT4…õ5D%DTB"À¢6÷W&6S¢'6W'fW%÷fB"À¢Ò“°¢–b††æG4g&VU&Vbæ7W'&VçB’°¢†æG4g&VU7VV6…7F'FVDE&Vbæ7W'&VçBÒFFRææ÷r‚“°¢Ğ¢–b€¢G&ç6—F–öâçFòÓÓÒ'W6W%÷7V¶–ær"ÇÀ¢G&ç6—F–öâçFòÓÓÒ&–çFW''WFVB ¢’°¢6WE†6R‚&Æ—7FVæ–ær"“°¢W6„WfVçB‚$ÖVÖ&W"7VV6‚FWFV7FVB"“°¢ÒVÇ6R°¢W6„WfVçB‚$–væ÷&VB7VV6…÷7F'FVB+ræ÷B6öæf—&ÖVB&&vRÖ–â"“°¢Ğ¢Ğ ¢–b‡G—RÓÓÒ&–çWEöVF–õö'VffW"ç7VV6…÷7F÷VB"’°¢–b€¢—476W76ÖVçBb`¢FV6–FT76W76ÖVçEfDWfVçB†76W76ÖVçDÆ–fV7–6ÆU&Vbæ7W'&VçB’ÓÓÒ&–væ÷&R ¢’°¢×WFT76W76ÖVçEFW&Ö–æÄÖ–2‚'7VV6…÷7F÷VB"“°¢W6„WfVçB‚$–væ÷&VB7VV6…÷7F÷VB+r76W76ÖVçBFW&Ö–æÂ"“°¢&WGW&ã°¢Ğ¢òò†öÆBÖöFS¢Fòæ÷BGfæ6RfÆö÷"÷væW'6†—g&öÒ6W'fW"dBGW&–ærf÷&vRà¢–b€¢†æG4g&VU&Vbæ7W'&VçBb`¢‡†6U&Vbæ7W'&VçBÓÓÒ'7V¶–ær"ÇÀ¢GW&å7FFU&Vbæ7W'&VçBÓÓÒ&f÷&vU÷7V¶–ær"ÇÀ¢GW&å7FFU&Vbæ7W'&VçBÓÓÒ&f÷&vU÷F†–æ¶–ær"¢’°¢6WDÖ–7&÷†öæTVæ&ÆVB†6öææV7F–öå&Vbæ7W'&VçBÂfÇ6R“°¢6WD÷WF&÷VæDÖ–7&÷†öæTVæ&ÆVB†6öææV7F–öå&Vbæ7W'&VçBÂfÇ6R“°¢6ÆV$–çWDVF–ô'VffW"†6öææV7F–öå&Vbæ7W'&VçB“°¢W6„WfVçB‚$–væ÷&VB7VV6…÷7F÷VB+rf÷&vR7F–ÆÂ÷vç2F†RfÆö÷""“°¢&WGW&ã°¢Ğ¢òò†öÆBÖöFS¢W6W2v†–ÆR†öÆF–ær&RF†–æ¶–ærF–ÖR(	Bv—Bf÷"&VÆV6Rà¢–b‚†æG4g&VU&Vbæ7W'&VçB’°¢W6„WfVçB‚%7VV6‚W6R+r7F–ÆÂ†öÆF–ær+rf÷&vRv—G2"“°¢&WGW&ã°¢Ğ¢òò76W76ÖVçB²†æG2Ög&VS¢6Æ–VçB÷vç27&VFU÷&W7öç6R†Ö–çFVBfÇ6R’à¢òòFVfW"Ö–B×GW&âVçF–ÂG&ç67&—B6ò6ö×ÆWF–öâ6âv–âà¢–b†—476W76ÖVçB’°¢Ç•GW&â‡²G—S¢%U4U%õ5TT4…õ5DõTB"Â6÷W&6S¢'6W'fW%÷fB"Ò“°¢fö–6U&Vbæ7W'&VçBæöåW6W%7VV6…7F÷VB‚“°¢&Ô76W76ÖVçD6Æ–VçEGW&â‚&†æG6g&VU÷7VV6…÷7F÷VB"“°¢&WGW&ã°¢Ğ¢–b‚†æG4g&VTÆö6ÅGW&ä6öæf—&ÖVE&Vbæ7W'&VçB’°¢W6„WfVçB‚$–væ÷&VB7VV6…÷7F÷VB+ræòÆö6ÂæV"Öf–VÆB6öæf—&ÖF–öâ"“°¢&WGW&ã°¢Ğ¢&Ô†æG4g&VU&W7öç6Tw&6R‚'6W'fW%÷fE÷7VV6…÷7F÷VB"“°¢Ğ ¢–b‡G—RÓÓÒ&W'&÷""’°¢òò&VÇF–ÖR’W'&÷'2†–æ6ÇVF–ær&W7öç6Ræ6æ6VÂ’&RäõB6öææV7F–öà¢òòf–ÇW&W2âæWfW"6†÷r†—F6‚6÷’†W&R(	BVW"f–ÆVF÷vç2&V6÷fW'’T’à¢W6„WfVçB†6W'fW"W'&÷#¢G´¥4ôâç7G&–æv–g’†WfVçB’ç6Æ–6RƒÂ#—Ö“°¢6öç7BVW"Ò6öææV7F–öå&Vbæ7W'&VçCòç2æ6öææV7F–öå7FFRóòçVÆÃ°¢–b€¢6†÷VÆE7W&f6U&VÇF–ÖTW'&÷"†WfVçBÂGW&å7FFU&Vbæ7W'&VçBÂVW"¢’°¢&WGW&ã°¢Ğ¢òò&VÇBÖæB×7W7VæFW'3¢WfVâ–b6Æ76–f–W"6†ævW2ÂæWfW"†—F6‚Ö–B×6W76–öâà¢&WGW&ã°¢Ğ ¢6öç7B²GW&ç3¢æW‡BÂFFVBÒÒÇ•&VÇF–ÖUG&ç67&—DWfVçB€¢GW&ç5&Vbæ7W'&VçBÀ¢WfVçBÀ¢²6W76–öå7F'FVDC¢7&VFVDE&Vbæ7W'&VçBĞ¢“°¢–b†FFVB’°¢GW&ç5&Vbæ7W'&VçBÒæW‡C°¢6WEGW&ç2†Ú±î¸Â¸­yêë¢°k¢G§¦*^next);
      persistTurns(next);
      if (added.role === "forge") {
        setLiveForgeDraft("");
        trackUsage("assistant_text", added.text);
        if (!coachLoopHandledRef.current && hasRepeatedCoachTurn(next)) {
          coachLoopHandledRef.current = true;
          pushEvent("Coach loop detected Â· wrap offered");
          void handleStop("coach_loop");
          return;
        }
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
                ? `Assessment mid-turn Â· after transcript${
                    slot ? ` Â· slot=${slot}` : ""
                  }`
                : "Assessment mid-turn failed Â· after transcript"
            );
          } else if (after.action === "request_closing") {
            requestAssessmentClosingOnce("after_transcript_complete");
          }
        }
      }
      pushEvent(
        `Transcript Â· ${added.role} #${added.turnIndex}: "${added.text.slice(0, 48)}${
          added.text.length > 48 ? "â€¦" : ""
        }"`
      );
    }
  }

  function clearGuestDurationWatch() {
    if (guestDurationTimerRef.current) {
      clearTimeout(guestDurationTimerRef.current);
      guestDurationTimerRef.current = null;
    }
    if (guestCountdownIntervalRef.current) {
      clearInterval(guestCountdownIntervalRef.current);
      guestCountdownIntervalRef.current = null;
    }
  }

  function startGuestDurationWatch(durationSeconds: number) {
    clearGuestDurationWatch();
    setGuestSecondsRemaining(durationSeconds);
    guestDurationTimerRef.current = setTimeout(() => {
      guestDurationTimerRef.current = null;
      pushEvent(`Guest preview limit reached Â· ${durationSeconds}s`);
      void handleStop();
    }, durationSeconds * 1_000);
    guestCountdownIntervalRef.current = setInterval(() => {
      setGuestSecondsRemaining((prev) => {
        if (prev == null) return prev;
        if (prev <= 1) {
          if (guestCountdownIntervalRef.current) {
            clearInterval(guestCountdownIntervalRef.current);
            guestCountdownIntervalRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1_000);
  }

  function guestStartWasAborted(startGeneration: number) {
    return (
      !mountedRef.current ||
      lifecycleGenerationRef.current !== startGeneration ||
      (isGuestPreview && guestStopStartedRef.current)
    );
  }

  async function handleStart() {
    const resumeReconnect = callInterruptedRef.current;
    if (startingRef.current) return;
    if (
      !resumeReconnect &&
      (phase === "minting" || phase === "connecting" || phase === "speaking")
    ) {
      return;
    }
    startingRef.current = true;
    clearHandsFreeResponseGrace();
    clearPendingHandsFreeTranscript("session_ended_before_confirmation");
    resetHandsFreeTurnAdmission();
    clearHandsFreePlaybackDrain();
    setMicRecoveryPending(false);
    const resumeRecord: VoiceTranscriptRecord | null =
      !isGuestPreview && !isAssessment
        ? loadEligibleVoiceResume<VoiceTranscriptRecord>({
            getActiveId: getActiveVoiceSessionId,
            getRecord: getVoiceTranscript,
            track,
            eventTitle,
          })
        : null;
    const resuming = Boolean(resumeRecord);
    lifecycleGenerationRef.current += 1;
    const startGeneration = lifecycleGenerationRef.current;

    setError("");
    setMicMode(null);
    setMicFallbackReason(null);
    setMicRecoveryPending(false);
    setCallInterrupted(false);
    callInterruptedRef.current = false;
    clearInterruptTimers();
    if (!resuming) {
      setTurns([]);
      turnsRef.current = [];
    } else if (resumeRecord) {
      const resumedTurns: TranscriptTurn[] = resumeRecord.turns;
      setTurns(resumedTurns);
      turnsRef.current = resumedTurns;
    }
    setLiveForgeDraft("");
    setLiveUserDraft("");
    setJoinGateHold(true);
    if (joinGateTimerRef.current) {
      clearTimeout(joinGateTimerRef.current);
    }
    clearGuestDurationWatch();
    setGuestSecondsRemaining(null);
    guestStopStartedRef.current = false;
    setGuestAuthPrompt(null);
    joinGateTimerRef.current = setTimeout(() => {
      joinGateTimerRef.current = null;
      setJoinGateHold(false);
    }, 900);
    setLiveConnectionm«ëŒ+Š×®º+º$zzb¥â†çVÆÂ“°¢6WDWfVçG2…µÒ“°¢6WDÖöÖVçGVÒ†çVÆÂ“°¢6WE6fVE6W76–öä–B†çVÆÂ“°¢6WE6W76–öåW'6—7FVB†fÇ6R“°¢6WD6ö×ÆWF–öäW'&÷"‚""“°¢6WD6ö×ÆWF–öå&WG'•VæF–ær†fÇ6R“°¢6WE&VÖ÷FTVF–ô&Æö6¶VB†fÇ6R“°¢6WD6ö×Æ–ÖVçF'”6ö×ÆWFR†fÇ6R“°¢6WEw&7FvR‚&6ö6†–ær"“°¢–b‚&W7VÖ–ær’°¢&7F–6U6W76–öå&Vbæ7W'&VçBÒçVÆÃ°¢Ğ¢6öç7B&–÷%W6vRÒW6vT–E&Vbæ7W'&VçC°¢W6vT–E&Vbæ7W'&VçBÒçVÆÃ°¢–b‡&–÷%W6vR’°¢fö–B6ö×ÆWFUfö–6UW6vUG&6¶–ær‡²W6vT–C¢&–÷%W6vRÒ“°¢Ğ¢GW&å7FFU&Vbæ7W'&VçBÒ&Æ—7FVæ–ær#°¢6WEGW&å7FFR‚&Æ—7FVæ–ær"“°¢7F—fU&W7öç6T–E&Vbæ7W'&VçBÒçVÆÃ°¢VæF–æt'VFvWE&Vbæ7W'&VçBÒçVÆÃ°¢–væ÷&Tf÷&vTVF–õVçF–Å&Vbæ7W'&VçBÒ°¢76W76ÖVçD6Æ÷6–æu6VçE&Vbæ7W'&VçBÒfÇ6S°¢76W76ÖVçEVæF–æt6Æ÷6–ætgFW$FöæU&Vbæ7W'&VçBÒfÇ6S°¢76W76ÖVçDv—F–æuG&ç67&—EGW&å&Vbæ7W'&VçBÒfÇ6S°¢76W76ÖVçDæf–vFVE&Vbæ7W'&VçBÒfÇ6S°¢–b†76W76ÖVçD6Æ÷6–æuF–ÖW%&Vbæ7W'&VçB’°¢6ÆV%F–ÖV÷WB†76W76ÖVçD6Æ÷6–æuF–ÖW%&Vbæ7W'&VçB“°¢76W76ÖVçD6Æ÷6–æuF–ÖW%&Vbæ7W'&VçBÒçVÆÃ°¢Ğ¢6ÆV$76W76ÖVçEG&ç67&—EGW&åF–ÖW"‚“°¢–b†—476W76ÖVçB’°¢7–æ476W76ÖVçDÆ–fV7–6ÆR‡&W7VÖT76W76ÖVçDÆ–fV7–6ÆR†76W76ÖVçE&W7VÖU6æ6†÷BÂ76W76ÖVçDF–Ç”Ö–çWFW2’“°¢ÒVÇ6R°¢7–æ476W76ÖVçDÆ–fV7–6ÆR†7&VFT–FÆT76W76ÖVçE7FFR‚’“°¢Ğ¢6WE†6R‚&Ö–çF–ær"“°¢W6„WfVçB‡&W7VÖ–ærò%&W7VÖ–ær6W76–öî(
b"¢$Ö–çF–ær6W76–öî(
b"“° ¢–b‡&W7VÖ–ærbb&W7VÖU&V6÷&B’°¢fö–6U6W76–öä–E&Vbæ7W'&VçBÒ&W7VÖU&V6÷&Bçfö–6U6W76–öä–C°¢7&VFVDE&Vbæ7W'&VçBÒ&W7VÖU&V6÷&Bæ7&VFVDC°¢6WD7F—fUfö–6U6W76–öä–B‡&W7VÖU&V6÷&Bçfö–6U6W76–öä–B“°¢ÒVÇ6R°¢6öç7BæWufö–6T–BÒ7&VFUfö–6U6W76–öä–B‚“°¢fö–6U6W76–öä–E&Vbæ7W'&VçBÒæWufö–6T–C°¢7&VFVDE&Vbæ7W'&VçBÒæWrFFR‚’çFô•4õ7G&–ær‚“°¢Ğ ¢G'’°¢F—66öææV7E&VÇF–ÖR†6öææV7F–öå&Vbæ7W'&VçB“°¢6öææV7F–öå&Vbæ7W'&VçBÒçVÆÃ° ¢6öç7B66Væ&–õF—FÆRÒ—476W76ÖVç@¢ò$Æ—f–ær&öf–ÆR76W76ÖVçB ¢¢WfVçEF—FÆSòçG&–Ò‚’ÇÀ¢4UõE$4µõD•DÄU5·G&6µÒÇÀ¢%fö–6R&7F–6Rv—F‚f÷&vR#° ¢6öç7BFö¶Vå&W2Òv—BfWF6‚‚"ö’÷&VÇF–ÖR÷6W76–öâ"Â°¢ÖWF†öC¢%õ5B"À¢†VFW'3¢²$6öçFVçBÕG—R#¢&Æ–6F–öâö§6öâ"ÒÀ¢&öG“¢¥4ôâç7G&–æv–g’‡°¢G&6²À¢WfVçEF—FÆS¢—476W76ÖVçBòVæFVf–æVB¢WfVçEF—FÆRÀ¢7V66W747&—FW&–¢—476W76ÖVçBòVæFVf–æVB¢7V66W747&—FW&–À¢÷Væ–æt6öçFW‡C¢—476W76ÖVçBòVæFVf–æVB¢÷Væ–æt6öçFW‡BÀ¢ÖöFS¢—4wVW7E&Wf–Wrò&wVW7E÷&Wf–Wr"¢ÖöFRÀ¢6÷W&6S¢—4wVW7E&Wf–Wp¢ò&6ö6…öwVW7E÷&Wf–Wr ¢¢VæFVf–æVBÀ¢F÷–3¢—4wVW7E&Wf–WròwVW7E&Wf–WsòçF÷–4–B¢VæFVf–æVBÀ¢&V6öææV7EFö¶Vã¢—4wVW7E&Wf–Wp¢òwVW7E&Wf–Wsòç&V6öææV7EFö¶Và¢¢VæFVf–æVBÀ¢&Wf–WufW'6–öã¢—4wVW7E&Wf–Wp¢òwVW7E&Wf–WufW'6–öå&Vbæ7W'&Vç@¢¢VæFVf–æVBÀ¢Ò’À¢Ò“°¢6öç7BFö¶VäFFÒ†v—BFö¶Vå&W2æ§6öâ‚’’2°¢fÇVSó¢7G&–æs°¢6W76–öåö–Có¢7G&–ærÂçVÆÃ°¢ÖöFVÃó¢7G&–æs°¢W'&÷#ó¢7G&–æs°¢fö–6TÖöFSó¢&†æG6g&VR"Â&†öÆB#°¢VçF—FÆVÖVçCó¢°¢Æãó¢7G&–æs°¢6W76–öç5&VÖ–æ–æsó¢çVÖ&W"ÂçVÆÃ°¢6W76–öç4Æ–Ö—Có¢çVÖ&W"ÂçVÆÃ°¢Ó°¢ÖVÖ÷'“ó¢°¢f—'7DæÖSó¢7G&–æs°¢—5&WGW&æ–æsó¢&ööÆVã°¢vVÆ6öÖT†–çCó¢7G&–æs°¢Æ7E66Væ&–õF—FÆSó¢7G&–æs°¢Ó°¢&Wf–Wsó¢²fW'6–öãó¢çVÖ&W"Ó°¢÷Væ–æt6öçFW‡Có¢7G&–æs°¢Ö„GW&F–öå6V6öæG3ó¢çVÖ&W#°¢Ó° ¢–b‚Fö¶Vå&W2æö²ÇÂFö¶VäFFçfÇVR’°¢F‡&÷ræWrW'&÷"‡Fö¶VäFFæW'&÷"ÇÂ$6÷VÆBæ÷B7F'B6W76–öââ"“°¢Ğ¢–b†wVW7E7F'Ev4&÷'FVB‡7F'DvVæW&F–öâ’’°¢&WGW&ã°¢Ğ ¢6öç7BÆä—5&òÒFö¶VäFFæVçF—FÆVÖVçCòçÆâÓÓÒ'&ò#°¢6öç7B6W76–öåfö–6TÖöFS¢&Væfö–6TÖöFRĞ¢Fö¶VäFFçfö–6TÖöFRÓÓÒ&†æG6g&VR"ÇÂFö¶VäFFçfö–6TÖöFRÓÓÒ&†öÆB ¢òFö¶VäFFçfö–6TÖöFP¢¢&W6öÇfT&Væfö–6TÖöFR‡²Æä—5&òÒ“°¢6WD—5&õW6W"„&ööÆVâ‡Æä—5&ò’“°¢6WEfö–6TÖöFR‡6W76–öåfö–6TÖöFR“°¢–b‡G—VöbFö¶VäFFæVçF—FÆVÖVçCòç6W76–öç5&VÖ–æ–ærÓÓÒ&çVÖ&W""’°¢6WE&W5&VÖ–æ–ær‡Fö¶VäFFæVçF—FÆVÖVçBç6W76–öç5&VÖ–æ–ær“°¢Ğ¢–b€¢—4wVW7E&Wf–Wrb`¢G—VöbFö¶VäFFç&Wf–WsòçfW'6–öâÓÓÒ&çVÖ&W" ¢’°¢wVW7E&Wf–WufW'6–öå&Vbæ7W'&VçBÒFö¶VäFFç&Wf–WrçfW'6–öã°¢Ğ ¢&VÇF–ÖU6W76–öä–E&Vbæ7W'&VçBÒFö¶VäFFç6W76–öåö–BóòçVÆÃ°¢vVÆ6öÖT†–çE&Vbæ7W'&VçBÒFö¶VäFFæÖVÖ÷'“òçvVÆ6öÖT†–çCòçG&–Ò‚’ÇÂ"#°¢–b‡Fö¶VäFFæÖVÖ÷'“òæ—5&WGW&æ–ærbbFö¶VäFFæÖVÖ÷'’æf—'7DæÖR’°¢6öç7BF—FÆVE7F'BÒ&ööÆVâ†WfVçEF—FÆSòçG&–Ò‚’“°¢6WEvVÆ6öÖTÆ–æR€¢vVÆ6öÖR&6²ÂG·Fö¶VäFFæÖVÖ÷'’æf—'7DæÖWÒG°¢F—FÆVE7F'BbbFö¶VäFFæÖVÖ÷'’æÆ7E66Væ&–õF—FÆP¢ò+rÆ7C¢G·Fö¶VäFFæÖVÖ÷'’æÆ7E66Væ&–õF—FÆWÖ ¢¢" ¢Ö ¢“°¢ÒVÇ6R°¢6WEvVÆ6öÖTÆ–æR‚""“°¢Ğ¢6WE†6R‚&6öææV7F–ær"“°¢W6„WfVçB‚$6öææV7F–æ~(
b"“° ¢6öç7B6öææV7F–öâÒv—B6öææV7E&VÇF–ÖR‡°¢W†VÖW&Ä¶W“¢Fö¶VäFFçfÇVRÀ¢öäÖ–4ÖöFS¢†ÖöFRÂ&V6öâ’Óâ°¢6WDÖ–4ÖöFR†ÖöFR“°¢6WDÖ–4fÆÆ&6µ&V6öâ‡&V6öâ“°¢W6„WfVçB€¢ÖöFRÓÓÒ&Ö–7&÷†öæR"ò$Ö–7&÷†öæR&VG’"¢$æòÖ–2(	BÆ—7FVâöæÇ’ ¢“°¢ÒÀ¢öå&VÖ÷FUG&6³¢‚’Óâ°¢W6„WfVçB‚$f÷&vRVF–ò6öææV7FVB"“°¢Æ7Df÷&vT7F—f—G•&Vbæ7W'&VçBÒFFRææ÷r‚“°¢6WE†6R‚†7W'&VçB’Óà¢7W'&VçBÓÓÒ&6öææV7F–ær"ÇÂ7W'&VçBÓÓÒ'7V¶–ær ¢ò'7V¶–ær ¢¢7W'&Vç@¢“°¢ÒÀ¢öå&VÖ÷FUÆ–&6³¢‡7FFR’Óâ°¢6WE&VÖ÷FTVF–ô&Æö6¶VB‡7FFRÓÓÒ&&Æö6¶VB"“°¢W6„WfVçB€¢7FFRÓÓÒ&&Æö6¶VB ¢ò$f÷&vRVF–òæVVG2F ¢¢$f÷&vRVF–òÆ––ær ¢“°¢ÒÀ¢öä6öææV7F–öå7FFS¢‡7FFR’Óâ°¢Ú±î¸Â¸­yêë¢°k¢G§¦*^     peerStateRef.current = state;
          pushEvent(`Peer: ${state}`);
          if (isGuestPreview) {
            if (state === "failed") {
              setError(
                "TalkForge Arena lost its connection. Restart when youâ€™re ready."
              );
              setPhase("error");
            }
            return;
          }
          if (state === "failed" || state === "closed") {
            noteCallInterrupted(state);
            return;
          }
          if (state === "disconnected") {
            if (interruptGraceRef.current) {
              clearTimeout(interruptGraceRef.current);
            }
            interruptGraceRef.current = setTimeout(() => {
              interruptGraceRef.current = null;
              if (
                peerStateRef.current === "disconnected" ||
                peerStateRef.current === "failed"
              ) {
                noteCallInterrupted("disconnected");
              }
            }, FORGE_INTERRUPT_DISCONNECT_GRACE_MS);
            return;
          }
          if (state === "connected" && interruptGraceRef.current) {
            clearTimeout(interruptGraceRef.current);
            interruptGraceRef.current = null;
          }
        },
        onDataChannelState: (state, channel) => {
          pushEvent(`Realtime channel: ${state}`);
          const current = connectionRef.current;
          if (
            !isGuestPreview &&
            current &&
            current.dc === channel &&
            dataChannelNeedsRecovery(state)
          ) {
            noteCallInterrupted(`data_channel_${state}`);
          }
        },
        onMicTrackEnded: () => {
          noteCallInterrupted("mic_ended");
        },
        onServerEvent: handleServerEvent,
      });

      if (guestStartWasAborted(startGeneration)) {
        disconnectRealtime(connection);
        return;
      }

      connectionRef.current = connection;
      setLiveConnection(connection);
      if (!isGuestPreview && !isAssessment) {
        speechRecorderRef.current = startSpeechRecorder(connection.recordingStream);
      }
      if (!isAssessment) {
        const wakeLock = (navigator as Navigator & { wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinel> } }).wakeLock;
        if (wakeLock) {
          void wakeLock.request("screen").then((lock) => {
            installWakeLock(lock);
          }).catch(() => setWakeLockDenied(true));
        } else {
          setWakeLockDenied(true);
        }
      }
      pushEvent(
        `Voice build Â· minimal-coach-v1 Â· mode=${sessionVoiceMode}`
      );

      if (!connection.usedSilentMicFallback) {
        // Start muted; Free opens on hold, Pro hands-free opens on listening.
        setMicrophoneEnabled(connection, false);
      }

      if (!isGuestPreview) {
        // Do not create permanent history until Realtime is connected.
        let practice = practiceSessionRef.current;
        if (resuming && resumeRecord?.practiceSessionId) {
          const existing = await loadIncompletePracticeSession(
            resumeRecord.practiceSessionId
          );
          if (existing) {
            practice = await persistActiveSession(
              existing,
              voiceTurnsToConversationTurns(turnsRef.current)
            );
          }
        }
        if (!practice) {
          practice = await createPracticeSession({
            scenarioId: isAssessment ? "voice_assessment" : `voice_${track}`,
            scenarioTitle,
            missionPrompt: isAssessment
              ? "Short discovery interview so Forge can get a sense of you."
              : successCriteria?.trim() ||
                "Practice clear, warm, confident communication out loud with Forge.",
            modality: "voice",
            drillId,
            programId,
            purpose: drillId ? "drill" : isAssessment ? "diagnostic" : "free_practice",
          });
        }
        practiceSessionRef.current = practice;
        coachLoopHandledRef.current = false;
        setSavedSessionId(practice.id);
        if (!isAssessment && voiceSessionIdRef.current) {
          saveVoiceTranscript({
            voiceSessionId: voiceSessionIdRef.current,
            realtimeSessionId: realtimeSessionIdRef.current,
            practiceSessionId: practice.id,
            track,
            eventTitle,
            createdAt: createdAtRef.current,
            turns: turnsRef.current,
          });
          setActiveVoiceSessionId(voiceSessionIdRef.current);
        }
        pushEvent(
          resuming
            ? `Session resumed Â· ${practice.id.slice(0, 8)}`
            : `Session saved Â· ${practice.id.slice(0, 8)}`
        );

        usageIdRef.current = await startVoiceUsageTracking({
          practiceSessionId: practice.id,
          realtimeSessionId: realtimeSessionIdRef.current,
          voiceMode: sessionVoiceMode,
          model:
            typeof tokenData.model === "string"
              ? tokenData.model
              : CE_REALTIME_MODEL,
        });
      }

      if (guestStartWasAborted(startGeneration)) {
        disconnectRealtime(connection);
        connectionRef.current = null;
        setLiveConnection(null);
        return;
      }

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
        guestOpeningContext: isGuestPreview
          ? tokenData.openingContext
          : undefined,
        resumeContext:
          !isGuestPreview && !isAssessment && resuming
            ? buildResumeBrief(turnsRef.current) || undefined
            : undefined,
        openingContext: openingContext?.trim() || undefined,
 m«ëŒ+Š×®º+º$zzb¥âÒ“°¢W6„WfVçB€¢&W7VÖ–æp¢òf÷&vR÷Væ–ær+r&W7VÖR+r'VFvWBG¶÷Væ–æt'VFvWGÖ ¢¢Fö¶VäFFæÖVÖ÷'“òæ—5&WGW&æ–æp¢òf÷&vR÷Væ–ær+r&WGW&æ–ærÖVÖ&W"+r'VFvWBG¶÷Væ–æt'VFvWGÖ ¢¢f÷&vR÷Væ–ær+rf—'7B6W76–öâ+r'VFvWBG¶÷Væ–æt'VFvWGÖ ¢“°¢–b†—4wVW7E&Wf–Wr’°¢7F'DwVW7DGW&F–öåvF6‚€¢6Æ×wVW7E&Wf–WtGW&F–öå6V6öæG2‡Fö¶VäFFæÖ„GW&F–öå6V6öæG2¢“°¢Ğ¢Ò6F6‚†W'"’°¢–b†wVW7E7F'Ev4&÷'FVB‡7F'DvVæW&F–öâ’’°¢F—66öææV7E&VÇF–ÖR†6öææV7F–öå&Vbæ7W'&VçB“°¢6öææV7F–öå&Vbæ7W'&VçBÒçVÆÃ°¢6WDÆ—fT6öææV7F–öâ†çVÆÂ“°¢&WGW&ã°¢Ğ¢6öç6öÆRæW'&÷"†W'"“°¢6öç7BW6vT–BÒW6vT–E&Vbæ7W'&VçC°¢W6vT–E&Vbæ7W'&VçBÒçVÆÃ°¢–b‡W6vT–B’°¢fö–B6ö×ÆWFUfö–6UW6vUG&6¶–ær‡²W6vT–BÒ“°¢Ğ¢F—66öææV7E&VÇF–ÖR†6öææV7F–öå&Vbæ7W'&VçB“°¢6öææV7F–öå&Vbæ7W'&VçBÒçVÆÃ°¢6WDÆ—fT6öææV7F–öâ†çVÆÂ“°¢6WE†6R‚&W'&÷""“°¢6WDW'&÷"€¢W'"–ç7Fæ6VöbW'&÷"òW'"æÖW76vR¢$6÷VÆBæ÷B7F'BâG'’v–ââ ¢“°¢W6„WfVçB‚$d”ÄTB"“°¢Òf–æÆÇ’°¢7F'F–æu&Vbæ7W'&VçBÒfÇ6S°¢6WDÖ–5&V6÷fW'•VæF–ær†fÇ6R“°¢Ğ¢Ğ ¢W6TVffV7B‚‚’Óâ°¢–b‚WFõ7F'BÇÂWFõ7F'DGFV×FVE&Vbæ7W'&VçB’&WGW&ã°¢WFõ7F'DGFV×FVE&Vbæ7W'&VçBÒG'VS°¢&Vv–ä'WGFöå&Vbæ7W'&VçCòæ6Æ–6²‚“°¢ÒÂ¶WFõ7F'EÒ“° ¢7–æ2gVæ7F–öâ†æFÆU&W7VÖU&VÖ÷FTVF–ò‚’°¢6öç7B6öææV7F–öâÒ6öææV7F–öå&Vbæ7W'&VçC°¢–b‚6öææV7F–öâ’&WGW&ã°¢6öç7B&W7VÖVBÒv—B&W7VÖU&VÖ÷FTVF–ò†6öææV7F–öâ“°¢6WE&VÖ÷FTVF–ô&Æö6¶VB‚&W7VÖVB“°¢–b‚&W7VÖVB’°¢6WDW'&÷"€¢$6ö6‚f÷&vRVF–ò—27F–ÆÂ&Æö6¶VBâ6†V6²F†—26—F^(	—26÷VæB6WGF–æræBG'’v–ââ ¢“°¢Ğ¢Ğ ¢7–æ2gVæ7F–öâ†æFÆU&V6÷fW$Ö–7&÷†öæR‚’°¢6öç7B6öææV7F–öâÒ6öææV7F–öå&Vbæ7W'&VçC°¢–b‚6öææV7F–öâÇÂ6öææV7F–öâçW6VE6–ÆVçDÖ–4fÆÆ&6²ÇÂÖ–5&V6÷fW'•VæF–ær’°¢&WGW&ã°¢Ğ¢6öç7B&V6÷fW'”vVæW&F–öâÒÆ–fV7–6ÆTvVæW&F–öå&Vbæ7W'&VçC°¢6öç7B—47W'&VçE&V6÷fW'’Ò‚’Óà¢—47W'&VçEfö–6TÆ–fV7–6ÆR€¢Ö÷VçFVE&Vbæ7W'&VçBÀ¢6öææV7F–öå&Vbæ7W'&VçBÀ¢6öææV7F–öâÀ¢Æ–fV7–6ÆTvVæW&F–öå&Vbæ7W'&VçBÀ¢&V6÷fW'”vVæW&F–öà¢“° ¢6WDÖ–5&V6÷fW'•VæF–ær‡G'VR“°¢6WDW'&÷"‚""“°¢W6„WfVçB‚$6†V6¶–ærÖ–7&÷†öæ^(
b"“°¢6öç7B&W7VÇBÒv—B&V6÷fW$Ö–7&÷†öæR€¢6öææV7F–öâÀ¢—47W'&VçE&V6÷fW'’À¢‚’Óâæ÷FT6ÆÄ–çFW''WFVB‚&Ö–5öVæFVB"’À¢÷WF&÷VæDÖ–4÷Väf÷%7FFR‡GW&å7FFU&Vbæ7W'&VçB¢“°¢–b‚—47W'&VçE&V6÷fW'’‚’’&WGW&ã°¢6WDÖ–5&V6÷fW'•VæF–ær†fÇ6R“°¢6WDÖ–4fÆÆ&6µ&V6öâ‡&W7VÇBç&V6öâ“°¢–b‡&W7VÇBç&V6÷fW&VB’°¢6öç7B6†÷VÆD÷VâÒ÷WF&÷VæDÖ–4÷Väf÷%7FFR‡GW&å7FFU&Vbæ7W'&VçB“°¢6öç7B&Vf÷&RÒ6öææV7F–öâæ÷WF&÷VæDVF–õG&6·3òå³ÓòæVæ&ÆVBóòfÇ6S°¢6WD÷WF&÷VæDÖ–7&÷†öæTVæ&ÆVB†6öææV7F–öâÂ6†÷VÆD÷Vâ“°¢6WDÖ–4ÖöFR‚&Ö–7&÷†öæR"“°¢W6„WfVçB†Ö–2&V6÷fW&VB+r÷WF&÷VæBG¶&Vf÷&Rò&öâ"¢&öfb'Ò(i"G·6†÷VÆD÷Vâò&öâ"¢&öfb'Ö“°¢W6„WfVçB‡6†÷VÆD÷Vâò$Ö–2&V6÷fW&VB(	BÆ—7FVæ–ær"¢$Ö–2&V6÷fW&VB"“°¢&WGW&ã°¢Ğ¢W6„WfVçB‚$Ö–7&÷†öæR7F–ÆÂVæf–Æ&ÆR"“°¢Ğ ¢7–æ2gVæ7F–öâ†æFÆT6öçF–çVTgFW$–çFW''WB‚’°¢–b†—4wVW7E&Wf–WrÇÂÖ–5&V6÷fW'•VæF–ærÇÂ7F'F–æu&Vbæ7W'&VçB’&WGW&ã°¢6öç7B6öææV7F–öâÒ6öææV7F–öå&Vbæ7W'&VçC°¢6öç7BVW"Ò6öææV7F–öãòç2æ6öææV7F–öå7FFRóòVW%7FFU&Vbæ7W'&VçC°¢6WDÖ–5&V6÷fW'•VæF–ær‡G'VR“°¢6WDW'&÷"‚""“°¢W6„WfVçB‚$6öçF–çV–ærgFW"–çFW''WN(
b"“° ¢–b€¢6öææV7F–öâb`¢6å&V6÷fW$Æ—fUVW"‡VW"’b`¢6†÷VÆE&V6öææV7DgFW$–çFW''WB‡VW"¢’°¢6öç7B&V6÷fW'”vVæW&F–öâÒÆ–fV7–6ÆTvVæW&F–öå&Vbæ7W'&VçC°¢6öç7B—47W'&VçE&V6÷fW'’Ò‚’Óà¢—47W'&VçEfö–6TÆ–fV7–6ÆR€¢Ö÷VçFVE&Vbæ7W'&VçBÀ¢6öææV7F–öå&Vbæ7W'&VçBÀ¢6öææV7F–öâÀ¢Æ–fV7–6ÆTvVæW&F–öå&Vbæ7W'&VçBÀ¢&V6÷fW'”vVæW&F–öà¢“°¢6öç7B&W7VÇBÒv—B&V6÷fW$Ö–7&÷†öæR€¢6öææV7F–öâÀ¢—47W'&VçE&V6÷fW'’À¢‚’Óâæ÷FT6ÆÄ–çFW''WFVB‚&Ö–5öVæFVB"’À¢÷WF&÷VæDÖ–4÷Väf÷%7FFR‡GW&å7FFU&Vbæ7W'&VçB¢“°¢–b‚—47W'&VçE&V6÷fW'’‚’’&WGW&ã°¢6öç7B&W7VÖVBÒv—B&W7VÖU&VÖ÷FTVF–ò†6öææV7F–öâ“°¢6öç7BVW$æ÷rÒ6öææV7F–öâç2æ6öææV7F–öå7FFS°¢6WDÖ–4fÆÆ&6µ&V6öâ‡&W7VÇBç&V6öâ“°¢–b€¢&W7VÇBç&V6÷fW&VBb`¢6å&V6÷fW$Æ—fUVW"‡VW$æ÷r’b`¢6†÷VÆE&V6öææV7DgFW$–çFW''WB‡VW$æ÷r¢’°¢6öç7B6†÷VÆD÷VâÒ÷WF&÷VæDÖ–4÷Väf÷%7FFR‡GW&å7FFU&Vbæ7W'&VçB“°¢6öç7B&Vf÷&RÒ6öææV7F–öâæ÷WF&÷VæDVF–õG&6·3òå³ÓòæVæ&ÆVBóòfÇ6S°¢6WD÷WF&÷VæDÖ–7&÷†öæTVæ&ÆVB†6öææV7F–öâÂ6†÷VÆD÷Vâ“°¢VæGV6µ&VÖ÷FTf÷&vTVF–ò†6öææV7F–öâ“°¢6ÆÄ–çFW''WFVE&Vbæ7W'&VçBÒfÇ6S°¢6WD6ÆÄ–çFW''WFVB†fÇ6R“°¢6WDÖ–4ÖöFR‚&Ö–7&÷†öæR"“°¢6WE&VÖ÷FTVF–ô&Æö6¶VB‚&W7VÖVB“°¢GW&å7FFU&Vbæ7W'&VçBÒ&Æ—7FVæ–ær#°¢6WEGW&å7FFR‚&Æ—7FVæ–ær"“°¢6WE†6R‚&Æ—7FVæ–ær"“°¢6WDÖ–5&V6÷fW'•VæF–ær†fÇ6R“°¢W6„WfVçB†Ö–2&V6÷fW&VB+r÷WF&÷VæBG¶&Vf÷&Rò&öâ"¢&öfb'Ò(i"G·6†÷VÆD÷Vâò&öâ"¢&öfb'Ö“°¢W6„WfVçB‡6†÷VÆD÷Vâò$Ö–2&V6÷fW&VB(	BÆ—7FVæ–ær"¢$6öçF–çVVBgFW"–çFW''WB"“°¢&WGW&ã°¢Ğ¢–b€¢6å&V6÷fW$Æ—fUVW"‡VW$æ÷r’b`¢VW$æ÷rÓÒ&F—66öææV7FVB"b`¢6†÷VÆE&V6öææV7DgFW$–çFW''WB‡VW$æ÷r¢’°¢6WDÖ–5&V6÷fW'•VæF–ær†fÇ6R“°¢W6„WfVçB‚$Ö–7&÷†öæR7F–ÆÂVæf–Æ&ÆRgFW"–çFW''WB"“°¢&WGW&ã°¢Ğ¢Ğ ¢6WDÖ–5&V6÷fW'•VæF–ær†fÇ6R“°¢fö–B†æFÆU7F'B‚“°¢Ğ ¢gVæ7F–öâ76W76ÖVçEV•FW&Ö–æÂ‚“¢&ööÆVâ°¢–b‚—476W76ÖVçB’&WGW&âfÇ6S°¢6öç7BÆ–fRÒ76W76ÖVçDÆ–fV7–6ÆU&Vbæ7W'&VçC°¢&WGW&â€¢Æ–fRç&W7öç6W4Æö6¶VBÇÀ¢Æ–fRæ76W76ÖVçE7FGW2ÓÓÒ&6ö×ÆWFR"ÇÀ¢Æ–fRæ76W76ÖVçE7FGW2ÓÓÒ&6æ6VÆÆVB"ÇÀ¢76W76ÖVçD6Æ÷6–æu6VçE&Vbæ7W'&VçBÇÀ¢76W76ÖVçDæf–vFVE&Vbæ7W'&Vç@¢“°¢Ğ ¢gVæ7F–öâ†æFÆU7V´F÷vâ‚’°¢–b†6ÆÄ–çFÚ±î¸Â¸­yêë¢°k¢G§¦*^errupted) return;
    if (assessmentUiTerminal()) {
      pushEvent("Hold ignored Â· assessment terminal");
      return;
    }
    // Forge talks uninterrupted until he finishes â€” then hold opens the mic.
    if (
      phase === "speaking" ||
      turnStateRef.current === "forge_speaking" ||
      turnStateRef.current === "forge_thinking"
    ) {
      pushEvent("Hold ignored Â· Forge still speaking");
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
      pushEvent("Hold released Â· assessment terminal Â· no model turn");
      return;
    }
    const { spoke } = voice.stopHoldToTalk();
    // Hold-to-talk: Forge responds only after release â€” never mid-pause.
    // create_response is false in session config for this reason.
    if (!spoke || !connectionRef.current) {
      if (!spoke) pushEvent("Hold released Â· no speech Â· waiting");
      return;
    }
    if (isAssessment) {
      // Defer create until transcript â€” completion must win over mid-turn.
      armAssessmentClientTurn("hold_release");
      return;
    }
    const requested = requestHoldTurnResponse(connectionRef.current, {
      mode,
    });
    pushEvent(
      requested
        ? "Hold released Â· listen-first response requested"
        : "Hold released Â· response request failed"
    );
  }

  async function persistCompletedVoiceSession(
    snapshot: TranscriptTurn[],
    wrap: Momentum
  ) {
    if (isGuestPreview && guestPreview) {
      setCompletionRetryPending(true);
      setCompletionError("");
      try {
        guestReplayIdRef.current ??= crypto.randomUUID();
        guestCompletionIdRef.current ??= crypto.randomUUID();
        const boundedTurns = snapshot.slice(0, 40).map((turn) => ({
          role: turn.role,
          turnIndex: turn.turnIndex,
          text: turn.text.slice(0, 2_000),
        }));
        const transcriptResponse = await fetch(
          "/api/forge/preview/transcript",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              topic: guestPreview.topicId,
              reconnectToken: guestPreview.reconnectToken,
              version: guestPreviewVersionRef.current,
              replayId: guestReplayIdRef.current,
              turns: boundedTurns,
            }),
          }
        );
        const transcriptData = (await transcriptResponse.json()) as {
          preview?: { version?: number };
          error?: string;
        };
        if (!transcriptResponse.ok) {
          throw new Error(
            transcriptData.error || "Could not save preview transcript."
          );
        }
        if (typeof transcriptData.preview?.version === "number") {
          guestPreviewVersionRef.current = transcriptData.preview.version;
        }
        const completionResponse = await fetch(
          "/api/forge/preview/complete",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              topic: guestPreview.topicId,
              reconnectToken: guestPreview.reconnectToken,
              version: guestPreviewVersionRef.current,
              completionId: guestCompletionIdRef.current,
            }),
          }
        );
        const completionData = (await completionResponse.json()) as {
          preview?: { version?: number };
          error?: string;
        };
        if (!completionResponse.ok) {
          throw new Error(
            completionData.error || "Could not complete preview."
          );
        }
        if (typeof completionData.preview?.version === "number") {
          guestPreviewVersionRef.current = completionData.preview.version;
        }
        setSessionPersisted(true);
        setGuestAuthPrompt("prompt");
        pushEvent("Guest preview secured Â· complete");
      } catch (error) {
        console.warn("[voice] guest preview completion failed", error);
        setCompletionError(
          "Your wrap is ready. Create an account to keep this preview."
        );
      } finally {
        setCompletionRetryPending(false);
      }
      return;
    }

    const practice = practiceSessionRef.current;
    if (!practice) {
      setCompletionError(
        "This session could not be linked to your history. Return home and begin a new rep."
      );
      return;
    }

    setCompletionRetryPending(true);
    setCompletionError("");
    // Expose the durable session id before the first save attempt so a
    // transient failure still renders a reachable retry action.
    setSavedSessionId(practice.id);
    try {
      const user = await getUser().catch(() => null);
      const conversation = voiceTurnsToConversationTurns(snapshot);
      const completed = await completePracticeSession(practice, conversation, {
        modality: "voice",
        momentum: wrap,
        displayName: user?.displayName,
        speechCapture: {
          audioBlob: speechAudioBlobRef.current,
          turns: snapshot,
        },
      });
      practiceSessionRef.current = completed;
      setSavedSessionId(completed.id);
      setSessionPersisted(true);
      pushEvent("History saved Â· session report");
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

  async function handleStop(reason = "member_end") {
    if (phaseRef.current === "momentum") return;
    thinkingHoldRef.current = false;
    setThinkingHold(false);
    void wakeLockRef.current?.release().catch(() => undefined);
    wakeLockRef.current = null;
    clearHandsFrem«ëŒ+Š×®º+º$zzb¥æU&W7öç6Tw&6R‚“°¢6ÆV%VæF–æt†æG4g&VUG&ç67&—B‚'6W76–öåöVæFVEö&Vf÷&Uö6öæf—&ÖF–öâ"“°¢&W6WD†æG4g&VUGW&äFÖ—76–öâ‚“°¢6ÆV$†æG4g&VUÆ–&6´G&–â‚“°¢6ÆV$wVW7DGW&F–öåvF6‚‚“°¢–b†¦ö–ävFUF–ÖW%&Vbæ7W'&VçB’°¢6ÆV%F–ÖV÷WB†¦ö–ävFUF–ÖW%&Vbæ7W'&VçB“°¢¦ö–ävFUF–ÖW%&Vbæ7W'&VçBÒçVÆÃ°¢Ğ¢6WD¦ö–ävFT†öÆB†fÇ6R“°¢–b†—4wVW7E&Wf–Wr’°¢–b†wVW7E7F÷7F'FVE&Vbæ7W'&VçB’&WGW&ã°¢wVW7E7F÷7F'FVE&Vbæ7W'&VçBÒG'VS°¢6WDwVW7DWF…&ö×B‚'&ö×B"“°¢Ğ¢òò76W76ÖVçC¢æWfW"ÆVfRÖVÖ&W'2öâ&7F–6R×7G–ÆRw&F†BöffW'2¢òòÆ—f–ær&öf–ÆRv†VâF†R–çFW'f–WrF–Bæ÷B7G'V7GW&ÆÇ’6ö×ÆWFRà¢–b†—476W76ÖVçB’°¢–b†76W76ÖVçDæf–vFVE&Vbæ7W'&VçB’&WGW&ã°¢6öç7BÆ–fRÒ76W76ÖVçDÆ–fV7–6ÆU&Vbæ7W'&VçC°¢6öç7B7G'V7GW&ÆÇ”FöæRĞ¢Æ–fRæ76W76ÖVçE7FGW2ÓÓÒ&6ö×ÆWFR"bbÆ–fRæf–æÅ&W7öç6U&WVW7FVC°¢–b‡7G'V7GW&ÆÇ”FöæR’°¢fö–Bf–æÆ—¦T76W76ÖVçDæDæf–vFR‚&6ö×ÆWFR"“°¢&WGW&ã°¢Ğ¢6öç7B&7F–6U6W76–öä–BÒ&7F–6U6W76–öå&Vbæ7W'&VçCòæ–BóòçVÆÃ°¢òò7FWb³s¢W'6—7B66WFVB6Æ÷G2öæÇ“²6ÖR6æ6†÷Bf÷"Å–æ6ö×ÆWFRw&—FRà¢6öç7B76W76ÖVçE6æ6†÷BÒ'V–ÆD76W76ÖVçE6æ6†÷B†Æ–fRÂ°¢&7F–6U6W76–öä–BÀ¢7Vff–6–VçC¢fÇ6RÀ¢Ò“°¢W'6—7D76W76ÖVçE6æ6†÷D6Æ–VçB†76W76ÖVçE6æ6†÷B“°¢6öç7B6æ6†÷BÒ²ââçGW&ç5&Vbæ7W'&VçEÓ°¢G'’°¢6öç7B&W7öç6RÒv—BfWF6‚‚"ö’ö76W76ÖVçBö6ö×ÆWFR"Â°¢ÖWF†öC¢%õ5B"À¢†VFW'3¢²$6öçFVçBÕG—R#¢&Æ–6F–öâö§6öâ"ÒÀ¢&öG“¢¥4ôâç7G&–æv–g’‡°¢GW&ç3¢6æ6†÷BÀ¢&7F–6U6W76–öä–BÀ¢76W76ÖVçE6æ6†÷BÀ¢Ò’À¢Ò“°¢–b‚&W7öç6Ræö²’F‡&÷ræWrW'&÷"‚$76W76ÖVçB6æ6†÷Bv2æ÷B6fVBâ"“°¢Ò6F6‚†W'"’°¢6öç6öÆRæW'&÷"‚%·fö–6UÒ76W76ÖVçBV&Ç’ÖVæBW'6—7Bf–ÆVB"ÂW'"“°¢76W76ÖVçDæf–vFVE&Vbæ7W'&VçBÒfÇ6S°¢W6„WfVçB‚$76W76ÖVçBW6R6÷VÆBæ÷B&R6fVBâÆV6R&WG'’&Vf÷&RÆVf–ærâ"“°¢&WGW&ã°¢Ğ¢76W76ÖVçDæf–vFVE&Vbæ7W'&VçBÒG'VS°¢6ÆV$76W76ÖVçEG&ç67&—EGW&åF–ÖW"‚“°¢fö–6U&Vbæ7W'&VçBæöå6W76–öäVæB‚“°¢6öç7BW6vT–BÒW6vT–E&Vbæ7W'&VçC°¢W6vT–E&Vbæ7W'&VçBÒçVÆÃ°¢–b‡W6vT–B’°¢fö–B6ö×ÆWFUfö–6UW6vUG&6¶–ær‡°¢W6vT–BÀ¢&7F–6U6W76–öä–C¢&7F–6U6W76–öå&Vbæ7W'&VçCòæ–BóòçVÆÂÀ¢Ò“°¢Ğ¢Æ–fV7–6ÆTvVæW&F–öå&Vbæ7W'&VçB³Ò°¢F—66öææV7E&VÇF–ÖR†6öææV7F–öå&Vbæ7W'&VçB“°¢6öææV7F–öå&Vbæ7W'&VçBÒçVÆÃ°¢6WDÆ—fT6öææV7F–öâ†çVÆÂ“°¢6WD7F—fUfö–6U6W76–öä–B†çVÆÂ“°¢W6„WfVçB‚$76W76ÖVçBVæFVBV&Ç’+r–æ6ö×ÆWFR&W7VÇG2"“°¢&÷WFW"ç&WÆ6R‚"öö76W76ÖVçB÷&W7VÇG3÷7FGW3Ö–æ6ö×ÆWFRgW6VCÓ"“°¢&WGW&ã°¢Ğ ¢òò6æ6†÷BG&ç67&—BÆö6ÆÇ’öæÇ’(	BFòæ÷B&6R6ö×ÆWFU&7F–6U6W76–öà¢òòv—F‚â–âÖfÆ–v‡BW'6—7D7F—fU6W76–öâW6W'Bà¢6öç7B–BÒfö–6U6W76–öä–E&Vbæ7W'&VçC°¢–b‚—4wVW7E&Wf–Wrbb–BbbGW&ç5&Vbæ7W'&VçBæÆVæwF‚â’°¢6fUfö–6UG&ç67&—B‡°¢fö–6U6W76–öä–C¢–BÀ¢&VÇF–ÖU6W76–öä–C¢&VÇF–ÖU6W76–öä–E&Vbæ7W'&VçBÀ¢&7F–6U6W76–öä–C¢&7F–6U6W76–öå&Vbæ7W'&VçCòæ–BóòçVÆÂÀ¢G&6²À¢WfVçEF—FÆRÀ¢7&VFVDC¢7&VFVDE&Vbæ7W'&VçBÀ¢GW&ç3¢GW&ç5&Vbæ7W'&VçBÀ¢Ò“°¢Ğ¢–b‡7VV6…&V6÷&FW%&Vbæ7W'&VçB’°¢7VV6„VF–ô&Æö%&Vbæ7W'&VçBÒv—B7VV6…&V6÷&FW%&Vbæ7W'&VçBç7F÷‚“°¢7VV6…&V6÷&FW%&Vbæ7W'&VçBÒçVÆÃ°¢Ğ¢fö–6U&Vbæ7W'&VçBæöå6W76–öäVæB‚“°¢6öç7BW6vT–BÒW6vT–E&Vbæ7W'&VçC°¢W6vT–E&Vbæ7W'&VçBÒçVÆÃ°¢–b‡W6vT–B’°¢fö–B6ö×ÆWFUfö–6UW6vUG&6¶–ær‡°¢W6vT–BÀ¢&7F–6U6W76–öä–C¢&7F–6U6W76–öå&Vbæ7W'&VçCòæ–BóòçVÆÂÀ¢Ò“°¢Ğ¢Æ–fV7–6ÆTvVæW&F–öå&Vbæ7W'&VçB³Ò°¢F—66öææV7E&VÇF–ÖR†6öææV7F–öå&Vbæ7W'&VçB“°¢6öææV7F–öå&Vbæ7W'&VçBÒçVÆÃ°¢6WDÆ—fT6öææV7F–öâ†çVÆÂ“°¢–b‚—4wVW7E&Wf–Wr’6WD7F—fUfö–6U6W76–öä–B†çVÆÂ“°¢6ÆÄ–çFW''WFVE&Vbæ7W'&VçBÒfÇ6S°¢6WD6ÆÄ–çFW''WFVB†fÇ6R“°¢6ÆV$–çFW''WEF–ÖW'2‚“°¢W6„WfVçB‡&V6öâÓÓÒ&6ö6…öÆö÷"ò$VæFVB+r&WVFVB6ö6‚GW&â"¢$VæFVB"“° ¢6öç7B6æ6†÷BÒ²ââçGW&ç5&Vbæ7W'&VçEÓ°¢6WE†6R‚&ÖöÖVçGVÒ"“°¢6WDÖöÖVçGVÔÆöF–ær‡G'VR“°¢6WDÖöÖVçGVÒ†çVÆÂ“°¢6WD76W76ÖVçEw&†çVÆÂ“° ¢ÆWBw&¢ÖöÖVçGVÒÒ°¢7G&VæwFƒ ¢%vRF–Fî(	—B6GW&R7ö¶VâF†÷Vv‡B–âF†—26W76–öââ"À¢–×&÷fS ¢$æW‡BF–ÖRÂ6’öæRgVÆÂF†÷Vv‡B6òvR6â6ö6‚6öÖWF†–ær7V6–f–2â"À¢æW‡D7F–öã ¢%G'’öæR6ÆV&W"÷Væ–ærÆ–æR–â–÷W"æW‡B&VÂ6öçfW'6F–öââ"À¢Ó° ¢–b‚—4wVW7E&Wf–Wr’°¢G'’°¢6öç7BÖöÖVçGVÔ6öçG&öÆÆW"ÒæWr&÷'D6öçG&öÆÆW"‚“°¢6öç7BÖöÖVçGVÕF–ÖV÷WBÒv–æF÷rç6WEF–ÖV÷WB‚‚’ÓâÖöÖVçGVÔ6öçG&öÆÆW"æ&÷'B‚’ÂS“°¢6öç7B&W2Òv—BfWF6‚‚"ö’÷6W76–öâÖÖöÖVçGVÒ"Â°¢ÖWF†öC¢%õ5B"À¢†VFW'3¢²$6öçFVçBÕG—R#¢&Æ–6F–öâö§6öâ"ÒÀ¢6–væÃ¢ÖöÖVçGVÔ6öçG&öÆÆW"ç6–væÂÀ¢&öG“¢¥4ôâç7G&–æv–g’‡°¢GW&ç3¢6æ6†÷BÀ¢WfVçEF—FÆRÀ¢Ò’À¢Ò“°¢v–æF÷ræ6ÆV%F–ÖV÷WB†ÖöÖVçGVÕF–ÖV÷WB“°¢–b‚&W2æö²’F‡&÷ræWrW'&÷"‚&ÖöÖVçGVÕöf–ÆVB"“°¢6öç7BFFÒ†v—B&W2æ§6öâ‚’’2ÖöÖVçGVÓ°¢w&Ò°¢7G&VæwFƒ ¢FFç7G&VæwF‚ÇÀ¢%vRF–Fî(	—B6GW&R7ö¶VâF†÷Vv‡B–âF†—26W76–öââ"À¢–×&÷fS ¢FFæ–×&÷fRÇÀ¢$æW‡BF–ÖRÂ6’öæRgVÆÂF†÷Vv‡B6òvR6â6ö6‚6öÖWF†–ær7V6–f–2â"À¢æW‡D7F–öã ¢FFææW‡D7F–öâÇÀ¢%G'’öæR6ÆV&W"÷Væ–ærÆ–æR–â–÷W"æW‡B&VÂ6öçfW'6F–öââ"À¢'&V·F‡&÷Vvƒ¢FFæ'&V·F‡&÷Vv‚À¢&–vvW7EvV¶æW73¢FFæ&–vvW7EvV¶æW72À¢†öÖWv÷&³¢FFæ†öÖWv÷&²À¢6ö6…7VÖÖ'“¢FFæ6ö6…7VÖÖ'’À¢÷fW&ÆÅ66÷&S¢FFæ÷fW&ÆÅ66÷&RÀ¢6öæf–FVæ6S¢FFæ6öæf–FVæ6RÀ¢V×F‡“¢FFæV×F‡’À¢Æ—7FVæ–æs¢FFæÆ—7FVæ–ærÀ¢6Æ&—G“¢FFæ6Æ&—G’À¢Ó°¢6WDÖöÖVçGVÒ†Ú±î¸Â¸­yêë¢°k¢G§¦*^wrap);
      } catch {
        setMomentum(wrap);
      }
    } else {
      setMomentum(wrap);
    }

    await persistCompletedVoiceSession(snapshot, wrap);

    // After the final complimentary session, check entitlement only once the
    // wrap is ready â€” upgrade moment follows coaching, never a meter.
    if (!isGuestPreview) try {
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
      // Soft check â€” never block session wrap.
    }

    setMomentumLoading(false);
  }

  const isJoining =
    phase !== "momentum" &&
    (joinGateHold ||
      phase === "minting" ||
      phase === "connecting" ||
      (autoStart && phase === "idle" && !error));
  const sessionReady =
    phase === "speaking" ||
    phase === "listening" ||
    phase === "connected" ||
    phase === "error";
  const inSession =
    sessionReady || phase === "connecting" || phase === "minting";

  const micLive = voice.micLive;
  const hasCapturedSpeech = turns.some(
    (turn) => turn.role === "founder" && turn.text.trim().length > 0
  );

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
          ? hasCapturedSpeech
            ? "Rep Complete"
            : "No speech captured"
          : phase === "error"
            ? "Connection lost"
            : assessmentTerminalUi
              ? assessmentStatusLabel === "cancelled"
                ? "Assessment ended"
                : "Finishing assessment"
              : handsFree
                ? handsFreeResponseTimerRef.current || turnState === "forge_thinking"
                  ? "Forge is thinkingâ€¦"
                  : voice.handsFreeMuted
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
      ? "ASSESSMENT Â· COMPLETE"
      : assessmentStatusLabel === "cancelled"
        ? "ASSESSMENT Â· EXITED"
        : isJoining
          ? "JOINING"
          : "ASSESSMENT"
    : isGuestPreview
      ? isJoining
        ? "JOINING"
        : guestSecondsRemaining != null
          ? `GUEST Â· ${formatGuestPreviewCountdown(guestSecondsRemaining)}`
          : "GUEST PREVIEW Â· HOLD TO SPEAK"
      : isJoining
      ? "JOINING"
      : handsFree
        ? "PRO HANDS-FREE"
        : isProUser
          ? "PRO Â· HOLD TO SPEAK"
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
              <div className="flex m«ëŒ+Š×®º+º$zzb¥æfÆW‚ÓfÆW‚Ö6öÂ—FV×2Ö6VçFW"§W7F–g’Ö6VçFW""Ób#à¢Å&W6Væ6U&–ær7FFSÒ&6öææV7F–ær"Æ&VÃ×·VæFVf–æVGÒóà¢Ç6Æ74æÖSÒ&×BÓ‚FW‡BÕ³…ÒföçB×6VÖ–&öÆBWW&66RG&6¶–ærÕ³ã#†VÕÒFW‡BÕ²4CDc3uÒós#à¢6ö6‚f÷&vP¢Â÷à¢Ç6Æ74æÖSÒ&×BÓBÖ‚×rÖÖBFW‡BÖÆrFW‡B×v†—FRós6Ó§FW‡B×†Â#à¢·†6RÓÓÒ&6öææV7F–ær ¢ò$6öææV7F–ær6V7W&VÇ(
b ¢¢$¦ö–æ–ærFÆ´f÷&vR&Væ(
b'Ğ¢Â÷à¢Ç6Æ74æÖSÒ&×BÓ2Ö‚×r×6ÒFW‡B×6ÒÆVF–ærÓbFW‡B×v†—FRóC#à¢¶—476W76ÖVç@¢ò%6WGF–ærW–÷W"F–væ÷7F–26öçfW'6F–öââ ¢¢%&W&–ær–÷W"6ö6†–ær&ööÒâ'Ğ¢Â÷à¢ÂöF—cà¢²ò¢¶VW&Vv–â–âF†RG&VRf÷"WFõ7F'B6Æ–6²&ö÷G7G&â¢÷Ğ¢·†6RÓÓÒ&–FÆR"ò€¢Æ'WGFöà¢&Vc×¶&Vv–ä'WGFöå&VgĞ¢G—SÒ&'WGFöâ ¢öä6Æ–6³×¶†æFÆU7F'GĞ¢6Æ74æÖSÒ'7"ÖöæÇ’ ¢à¢&Vv–à¢Âö'WGFöãà¢’¢çVÆÇĞ¢Âóà¢’¢†6RÓÓÒ&–FÆR"ò€¢Ãà¢Å&W6Væ6U&–ær7FFSÒ&–FÆR"óà¢Ç6Æ74æÖSÒ&×BÓ‚FW‡BÕ³…ÒföçB×6VÖ–&öÆBWW&66RG&6¶–ærÕ³ã#†VÕÒFW‡BÕ²4CDc3uÒós#à¢6ö6‚f÷&vP¢Â÷à¢Æƒ6Æ74æÖSÒ&×BÓBÖ‚×r×†ÂFW‡BÓG†ÂföçB×6VÖ–&öÆBG&6¶–ær×F–v‡B6Ó§FW‡BÓW†Â#à¢¶—476W76ÖVç@¢ò$fWrV–6²VW7F–öç2 ¢¢WfVçEF—FÆSòçG&–Ò‚’ÇÂ$(	–Ò&VG’v†Vâ–÷R&R'Ğ¢Âöƒà¢Ç6Æ74æÖSÒ&×BÓRÖ‚×rÖÖBFW‡BÖ&6RÆVF–ærÓrFW‡B×v†—FRóS#à¢¶—476W76ÖVç@¢ò$æ÷F†–ærf÷&ÖÂ(	Bf÷&vR§W7BvçG26Vç6Röb–÷R&Vf÷&Rç—F†–ærVÇ6Râ ¢¢†æG4g&VP¢ò$†æG2Ög&VR6ö6†–ær—2&VG’â&Vv–âv†Vâ–÷RvçBâVæ–çFW''WFVB&ööÒâ ¢¢—4wVW7E&Wf–Wp¢ò%F†—2—26†÷'B&—fFR&Wf–Wrâ†öÆBFò7V²v†Vâ–÷^(	—&R&VG’â ¢¢—5&õW6W ¢ò%–÷RFöî(	—B†fRFòW&f÷&Ò†W&Râ†öÆBFò7V²v†Vâ–÷^(	—&R&VG’â ¢¢%–÷RFöî(	—B†fRFòW&f÷&Ò†W&Râ†öÆBFò7V²v†Vâ–÷^(	—&R&VG’(	B÷"VæÆö6²†æG2Ôg&VRv—F‚&òâ'Ğ¢Â÷à¢·vVÆ6öÖTÆ–æRò€¢Ç6Æ74æÖSÒ&×BÓ2Ö‚×rÖÖBFW‡B×6ÒÆVF–ærÓbFW‡BÕ²6Cv#SfÒóƒR#à¢·vVÆ6öÖTÆ–æWĞ¢Â÷à¢’¢çVÆÇĞ¢·7V66W747&—FW&–òçG&–Ò‚’bb€¢Ç6Æ74æÖSÒ&×BÓBÖ‚×rÖÖBFW‡B×6ÒÆVF–ærÓbFW‡B×v†—FRóC#à¢–÷^(	—&R–Ö–ærf÷#¢·7V66W747&—FW&–çG&–Ò‚—Ğ¢Â÷à¢—Ğ¢Æ'WGFöà¢&Vc×¶&Vv–ä'WGFöå&VgĞ¢G—SÒ&'WGFöâ ¢öä6Æ–6³×¶†æFÆU7F'GĞ¢6Æ74æÖSÒ&×BÓ&÷VæFVBÖgVÆÂ&r×v†—FR‚Ó’ÓBFW‡B×6ÒföçB×6VÖ–&öÆBFW‡BÖ&Æ6²G&ç6—F–öâ†÷fW#¦&r×v†—FRó“ ¢à¢&Vv–à¢Âö'WGFöãà¢Âóà¢’¢†6RÓÓÒ&ÖöÖVçGVÒ"ò€¢Ãà¢¶—4wVW7E&Wf–WrbbwVW7E&Wf–WrbbwVW7DWF…&ö×Bò€¢ÆF—`¢&öÆS×¶wVW7DWF…&ö×BÓÓÒ'&ö×B"ò&F–Æör"¢'&Vv–öâ'Ğ¢&–ÖÖöFÃ×¶wVW7DWF…&ö×BÓÓÒ'&ö×B"ò'G'VR"¢VæFVf–æVGĞ¢&–ÖÆ&VÆÆVF'“Ò&wVW7B×&Wf–WrÖ6ö×ÆWFR×F—FÆR ¢6Æ74æÖSÒ&fÆW‚rÖgVÆÂÖ‚×rÖÆrfÆW‚ÓfÆW‚Ö6öÂ—FV×2Ö6VçFW"§W7F–g’Ö6VçFW""Ó‚ ¢à¢Å&W6Væ6U&–æp¢7FFSÒ'w& ¢Æ&VÃ×¶†46GW&VE7VV6‚ò%&W6ö×ÆWFR"¢$æò7VV6‚6GW&VB'Ğ¢óà¢¶wVW7DWF…&ö×BÓÓÒ'&ö×B"ò€¢Ãà¢Æƒ¢–CÒ&wVW7B×&Wf–WrÖ6ö×ÆWFR×F—FÆR ¢6Æ74æÖSÒ&×BÓ‚FW‡BÓ7†ÂföçB×6VÖ–&öÆBG&6¶–ær×F–v‡B6Ó§FW‡BÓG†Â ¢à¢´uTU5Eõ$Ud”Uuô4ôÕÄUDUô„TDÄ”äWĞ¢Âöƒà¢Ç6Æ74æÖSÒ&×BÓBÖ‚×rÖÖBFW‡BÖ&6RÆVF–ærÓrFW‡B×v†—FRóc#à¢´uTU5Eõ$Ud”Uuô4ôÕÄUDUô$ôE—Ğ¢Â÷à¢ÆF—b6Æ74æÖSÒ&×BÓ‚fÆW‚rÖgVÆÂÖ‚×r×6ÒfÆW‚Ö6öÂvÓ2#à¢ÄÆ–æ°¢‡&Vc×¶÷6–vçWöæW‡CÒG¶Væ6öFUU$”6ö×öæVçB€¢&Wf–Wt6Æ–Õ&WGW&åF‚†wVW7E&Wf–WrçF÷–4–B¢—ÖĞ¢6Æ74æÖSÒ'&÷VæFVBÖgVÆÂ&r×v†—FR‚Ó‚’Ó2ãRFW‡B×6ÒföçB×6VÖ–&öÆBFW‡BÖ&Æ6²G&ç6—F–öâ†÷fW#¦&r×v†—FRó“ ¢à¢´uTU5Eõ$Ud”Uuô5$TDUô44õTåEô5DĞ¢ÂôÆ–æ³à¢ÄÆ–æ°¢‡&Vc×¶öÆöv–ãöæW‡CÒG¶Væ6öFUU$”6ö×öæVçB€¢&Wf–Wt6Æ–Õ&WGW&åF‚†wVW7E&Wf–WrçF÷–4–B¢—ÖĞ¢6Æ74æÖSÒ'&÷VæFVBÖgVÆÂ&÷&FW"&÷&FW"×v†—FRóR‚Ó‚’Ó2ãRFW‡B×6ÒFW‡B×v†—FRóƒG&ç6—F–öâ†÷fW#¦&r×v†—FRó ¢à¢´uTU5Eõ$Ud”Uuõ4”tåô”åô5DĞ¢ÂôÆ–æ³à¢Æ'WGFöà¢G—SÒ&'WGFöâ ¢öä6Æ–6³×²‚’Óâ6WDwVW7DWF…&ö×B‚&F—6Ö—76VB"—Ğ¢6Æ74æÖSÒ'‚Ó‚’Ó"FW‡B×6ÒFW‡B×v†—FRóSG&ç6—F–öâ†÷fW#§FW‡B×v†—FRósR ¢à¢´uTU5Eõ$Ud”UuôÔ”$UôÄDU%ô5DĞ¢Âö'WGFöãà¢ÂöF—cà¢¶6ö×ÆWF–öäW'&÷"ò€¢Ç6Æ74æÖSÒ&×BÓbÖ‚×rÖÖBFW‡B×6ÒFW‡B×&VBÓ3"&öÆSÒ&ÆW'B#à¢¶6ö×ÆWF–öäW'&÷'Ğ¢Â÷à¢’¢çVÆÇĞ¢Ú±î¸Â¸­yêë¢°k¢G§¦*^ </>
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
                      ? "Hereâ€™s what Forge heard"
                      : "Not enough to write a full profile yet"}
                  </h1>
                  <p className="mt-3 max-w-md text-base leading-7 text-white/50">
                    {assessmentWrap?.ready
                      ? "A simple current-state summary â€” no roadmap, just what you shared."
                      : "If you left early or kept answers very short, Forge wonâ€™t force a profile."}
                  </p>

                  {momentumLoading ? (
                    <p className="mt-10 text-sm text-white/45">
                      Putting this togetherâ€¦
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
                            Inferred presence (1â€“10)
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
                            Inferred from conversation only â€” not a self-rating.
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
                    {hasCapturedSpeech ? "Leave with momentum" : "Letâ€™s fix the audio path"}
                  </h1>
                  <p className="mt-3 max-w-md text-base leading-7 text-white/50">
                    {hasCapturedSpeech
                      ? "One strength. One improvement. One thing to try in the real conversation."
                      : "Forge didnâ€™t receive a spoken turn. Check your microphone or connection, then try again."}
                  </p>

                  {momentumLoading ? (
                    <p className="mt-10 text-sm text-white/45">
                      Forge is wrapping up your sessionâ€¦
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
            m«ëŒ+Š×®º+º$zzb¥âÆF—b6Æ74æÖSÒ'&÷VæFVBÓ'†Â&÷&FW"&÷&FW"×v†—FRó&r×v†—FRóR‚ÓR’ÓB#à¢Ç6Æ74æÖSÒ'FW‡B×‡2WW&66RG&6¶–ærÕ³ã&VÕÒFW‡B×v†—FRóC#à¢G'’æW‡@¢Â÷à¢Ç6Æ74æÖSÒ&×BÓ"FW‡BÖ&6RÆVF–ærÓrFW‡B×v†—FRó“#à¢¶ÖöÖVçGVÒææW‡D7F–öçĞ¢Â÷à¢ÂöF—cà¢ÂöF—cà¢’¢çVÆÇĞ ¢·6W76–öåW'6—7FVBò€¢Ç6Æ74æÖSÒ&×BÓ‚FW‡B×‡2WW&66RG&6¶–ærÕ³ã†VÕÒFW‡BÖVÖW&ÆBÓ3óƒ#à¢6fVBFò–÷W"†—7F÷'¢Â÷à¢’¢çVÆÇĞ ¢¶6ö×ÆWF–öäW'&÷"ò€¢ÆF—b6Æ74æÖSÒ&×BÓbÖ‚×rÖÖB#à¢Ç6Æ74æÖSÒ'FW‡B×6ÒFW‡B×&VBÓ3"&öÆSÒ&ÆW'B#à¢¶6ö×ÆWF–öäW'&÷'Ğ¢Â÷à¢·6fVE6W76–öä–Bò€¢Æ'WGFöà¢G—SÒ&'WGFöâ ¢öä6Æ–6³×²‚’Óâ°¢–b†ÖöÖVçGVÒ’°¢fö–BW'6—7D6ö×ÆWFVEfö–6U6W76–öâ€¢²ââçGW&ç5&Vbæ7W'&VçEÒÀ¢ÖöÖVçGVĞ¢“°¢Ğ¢×Ğ¢F—6&ÆVC×¶6ö×ÆWF–öå&WG'•VæF–æwĞ¢6Æ74æÖSÒ&×BÓ2&÷VæFVBÖgVÆÂ&÷&FW"&÷&FW"×&VBÓ#ó#‚ÓR’Ó"ãRFW‡B×6ÒFW‡B×&VBÓG&ç6—F–öâ†÷fW#¦&r×&VBÓóF—6&ÆVC¦÷6—G’ÓS ¢à¢¶6ö×ÆWF–öå&WG'•VæF–æp¢ò%6f–æ~(
b ¢¢%G'’6f–ærv–â'Ğ¢Âö'WGFöãà¢’¢çVÆÇĞ¢ÂöF—cà¢’¢çVÆÇĞ ¢ÆF—b6Æ74æÖSÒ&×BÓ‚fÆW‚fÆW‚×w&—FV×2Ö6VçFW"§W7F–g’Ö6VçFW"vÓ2#à¢¶6ö×Æ–ÖVçF'”6ö×ÆWFRbbÖöÖVçGVÔÆöF–ærò€¢Æ'WGFöà¢G—SÒ&'WGFöâ ¢öä6Æ–6³×²‚’Óâ6WEw&7FvR‚&ÖVÖ&W'6†—"—Ğ¢6Æ74æÖSÒ'&÷VæFVBÖgVÆÂ&r×v†—FR‚Ó‚’Ó2ãRFW‡B×6ÒföçB×6VÖ–&öÆBFW‡BÖ&Æ6²G&ç6—F–öâ†÷fW#¦&r×v†—FRó“ ¢à¢6öçF–çVP¢Âö'WGFöãà¢’¢6fVE6W76–öä–Bò€¢ÄÆ–æ°¢‡&Vc×¶ö÷&VfÆV7BòG·6fVE6W76–öä–GÖĞ¢6Æ74æÖSÒ'&÷VæFVBÖgVÆÂ&r×v†—FR‚Ó‚’Ó2ãRFW‡B×6ÒföçB×6VÖ–&öÆBFW‡BÖ&Æ6²G&ç6—F–öâ†÷fW#¦&r×v†—FRó“ ¢à¢&VfÆV7BöâF†—2&W ¢ÂôÆ–æ³à¢’¢€¢ÄÆ–æ°¢‡&Vc×¶—4wVW7E&Wf–Wrò"ö6ö6‚"¢"ö'Ğ¢6Æ74æÖSÒ'&÷VæFVBÖgVÆÂ&r×v†—FR‚Ó‚’Ó2ãRFW‡B×6ÒföçB×6VÖ–&öÆBFW‡BÖ&Æ6²G&ç6—F–öâ†÷fW#¦&r×v†—FRó“ ¢à¢¶—4wVW7E&Wf–Wp¢ò$FöæRf÷"æ÷r ¢¢%&WGW&â†öÖRæB&Vv–âv–â'Ğ¢ÂôÆ–æ³à¢—Ğ¢ÄÆ–æ°¢‡&Vc×¶—4wVW7E&Wf–Wrò"ö6ö6‚"¢"ö'Ğ¢6Æ74æÖSÒ'&÷VæFVBÖgVÆÂ&÷&FW"&÷&FW"×v†—FRó‚Ób’Ó2ãRFW‡B×6ÒFW‡B×v†—FRóSG&ç6—F–öâ†÷fW#¦&r×v†—FRó ¢à¢FöæRf÷"æ÷p¢ÂôÆ–æ³à¢ÂöF—cà¢Âóà¢—Ğ¢Âóà¢’¢€¢Ãà¢²ò¢6öçfW'6F–öâ67&öÆÇ3²7V²Fö6²—2–ææVBFòF†R&Væ6†VÆÂâ¢÷Ğ¢ÆF—b6Æ74æÖSÒ&fÆW‚Ö–âÖ‚ÓrÖgVÆÂÖ‚×rÓ'†ÂfÆW‚ÓfÆW‚Ö6öÂFW‡BÖÆVgB"Õ³ãW&VÕÒ6Ó§"Õ³"ãW&VÕÒ#à¢Ä&Væ6öçfW'6F–öà¢GW&ç3×·GW&ç7Ğ¢Æ—fTf÷&vUFW‡C×¶Æ—fTf÷&vTG&gGĞ¢Æ—fUW6W%FW‡C×¶Æ—fUW6W$G&gGĞ¢óà¢ÂöF—cà ¢²ò¢6†VÆÂ×–ææVB7V²Fö6²(	BæWfW"67&öÆÇ2v’v—F‚ÖW76vW2â¢÷Ğ¢ÆF—b6Æ74æÖSÒ'ö–çFW"ÖWfVçG2ÖæöæR'6öÇWFR–ç6WB×‚Ó&÷GFöÒÓ¢Ó3#à¢ÆF—b6Æ74æÖSÒ'ö–çFW"ÖWfVçG2ÖWFò×‚ÖWFòrÖgVÆÂÖ‚×rÓ7†Â‚ÓR"Õ¶Ö‚ƒã#W&VÒÆ6Æ2†Vçb‡6fRÖ&VÖ–ç6WBÖ&÷GFöÒ’³ãƒW&VÒ’•Ò6Ó§‚Ó‚#à¢ÆF—b6Æ74æÖSÒ&&÷&FW"×B&÷&FW"Õ²4CDc3uÒó&rÖw&F–VçB×Fò×Bg&öÒÖ&Æ6²f–Ö&Æ6²ó“‚FòÖ&Æ6²óƒBÓ2FW‡BÖ6VçFW"&6¶G&÷Ö&ÇW"ÖÖB#à¢Ç6Æ74æÖSÒ'FW‡BÖ6VçFW"FW‡BÕ³…ÒföçBÖÖVF—VÒWW&66RG&6¶–ærÕ³ã†VÕÒFW‡BÕ²4CDc3uÒóƒ#à¢·&W6Væ6TÆ&VÇĞ¢Â÷à ¢¶W'&÷"bb€¢Ç ¢6Æ74æÖSÒ&×‚ÖWFò×BÓ2Ö‚×rÖÖBFW‡B×6ÒFW‡B×&VBÓ3 ¢&öÆSÒ&ÆW'B ¢à¢¶W'&÷'Ğ¢Â÷à¢—Ğ ¢·v¶TÆö6´FVæ–VBbb6ÆÄ–çFW''WFVBò€¢Ç6Æ74æÖSÒ&×‚ÖWFò×BÓ2Ö‚×rÖÖBFW‡B×‡2FW‡BÖÖ&W"Ó#óƒ#à¢¶VW–÷W"67&VVâöâv†–ÆR–÷R&7F–6Rà¢Â÷à¢’¢çVÆÇĞ ¢·&VÖ÷FTVF–ô&Æö6¶VBbb6ÆÄ–çFW''WFVBò€¢Æ'WGFöà¢G—SÒ&'WGFöâ ¢öä6Æ–6³×²‚’Óâfö–B†æFÆU&W7VÖU&VÖ÷FTVF–ò‚—Ğ¢6Æ74æÖSÒ&×BÓ2&÷VæFVBÖgVÆÂ&÷&FW"&÷&FW"Õ²4CDc3uÒó3‚ÓR’Ó"ãRFW‡B×6ÒFW‡BÕ²6SvCf#ÒG&ç6—F–öâ†÷fW#¦&rÕ²4CDc3uÒó ¢à¢†V"6ö6‚f÷&vP¢Âö'WGFöãà¢’¢çVÆÇĞ ¢¶6ÆÄ–çFW''WFVBò€¢ÆF—b6Æ74æÖSÒ&×‚ÖWFò×BÓ2Ö‚×rÖÖB#à¢Ç6Æ74æÖSÒ'FW‡B×6ÒFW‡BÕ²6SvCf#Ò#à¢6ÆÂ–çFW''WFVBâFFò6öçF–çVRà¢Â÷à¢Æ'WGFöà¢G—SÒ&'WGFöâ ¢öä6Æ–6³×²‚’Óâfö–B†æFÆT6öçF–çVTgFW$–çFW''WB‚—Ğ¢F—6&ÆVC×¶Ö–5&V6÷fW'•VæF–æwĞ¢6Æ74æÖSÒ&×BÓ2&÷VæFVBÖgVÆÂ&÷&FW"&÷&FW"Õ²4CDc3uÒó3‚ÓR’Ó"ãRFW‡B×6ÒFW‡BÕ²6SvCf#ÒG&ç6—F–öâ†÷fW#¦&rÕ²4CDc3uÒóF—6&ÆVC¦÷6—G’ÓS ¢à¢¶Ö–5&V6÷fW'•VæF–ærò$6öçF–çV–æ~(
b"¢$6öçF–çVR'Ğ¢Âö'WGFöãà¢ÂöF—cà¢’¢çVÆÇĞ ¢¶Ö–4ÖöFRÓÓÒ'6–ÆVçEöfÆÆ&6²"bb€¢ÆF—b6Æ74æÖSÒ&×‚ÖWFò×BÓ2Ö‚×rÖÖB#à¢Ç6Æ74æÖSÒ'FW‡B×6ÒFW‡BÖÖ&W"Ó#óƒ#à¢¶Ö–4fÆÆ&6µ&V6öâÓÓÒ'W&Ö—76–öåöFVæ–VB ¢ò$Ö–7&÷†öæR66W72v6î(	—Bw&çFVBâ–÷R6â¶VWÆ—7FVæ–ærÂF†VâÆÆ÷r66W72–â–÷W"'&÷w6W"æBG'’v–ââ ¢¢Ö–4fÆÆ&6µ&V6öâÓÓÒ&FWf–6Uö'W7’ ¢ò%–÷W"Ö–7&÷†öæR—2&V–ærW6VBVÇ6Wv†W&Râ–÷R6â¶VWÆ—7FVæ–ærÂF†Vâ6Æ÷6RF†R÷F†W"æBG'’v–ââ ¢¢Ö–4fÆÆ&6µ&V6öâÓÓÒ'Vç7W÷'FVB ¢ò%F†—2'&÷w6W"6î(	—B&V6‚Ö–7&÷†öæR†W&Râ–÷R6â¶VWÆ—7FVæ–ær÷"G'’7W÷'FVB'&÷w6W"â ¢¢$æòÖ–7&÷†öæR—2f–Æ&ÆRöâF†—2FWf–6R&–v‡Bæ÷râ–÷R6â¶VWÆ—7FVæ–ærÂ6öææV7BöæRÂæBG'’v–ââ'Ğ¢Â÷à¢¶Ö–4fÆÆ&6µ&V6öâÓÒ'Vç7W÷'FVB"bb€¢Æ'WGFöà¢G—SÒ&'WGFöâ ¢öä6Æ–6³×²‚’Óâfö–B†æFÆU&V6÷fW$Ö–7&÷†öæR‚—Ğ¢F—6&ÆVC×¶Ö–5&V6÷fW'•VæF–æwĞ¢6Æ74æÖSÒ&×BÓ2&÷VæFVBÖgVÆÂ&÷&FW"&÷&FW"ÖÖ&W"Ó#ó#R‚ÓR’Ó"ãRFW‡B×6ÒFW‡BÖÖ&W"ÓG&ç6—F–öâ†÷fW#¦&rÖÖ&W"ÓóF—6&ÆVC¦÷6—G’ÓS ¢à¢¶Ö–5&V6÷fW'•VæF–æp¢ò$6†V6¶–ærÖ–7&÷†öæ^(
b ¢¢Ö–4fÆÆ&6µ&V6öâÓÓÒ'W&Ö—76–öåöFVæ–VB ¢ò$ÆÆ÷rÖ–7&÷†öæR ¢¢%G'’Ö–7&÷†öæRv–â'Ğ¢Âö'WGFöãà¢—Ğ¢ÂöF—cà¢—Ğ ¢ÆF—b6Æ74æÖSÒ&×BÓ2rÖgVÆÂ#à¢ÆF—b6Æ74æÖSÒ'&÷VæFVBÕ³ã3W&VÕÒ&÷&FW"&÷&FW"Õ²4CDc3uÒó‚&rÕ²333EÒó“R‚Ó2ãR’Ó2ãR6†F÷rÕ³òÓ'…óC…÷&v&ƒÃÃÃãSR•Ò&6¶G&÷Ö&ÇW"×†Â6Ó§‚ÓB#à¢¶†æG4g&VRò€¢ÆF—b6Æ74æÖSÒ&fÆW‚fÆW‚×w&—FV×2Ö6VçFW"§W7F–g’Ö&WGvVVâvÓ2#à¢Ç6Æ74æÖSÒ'FW‡BÕ³…ÒföçB×6VÖ–&öÆBWW&66RG&6¶–ærÕ³ãfVÕÒFW‡BÕ²4CDc3uÒó“#à¢·F†–æ¶–æt†öÆBò$†öÆF–ær(	Bf÷&vR—2v—F–ær"¢$†æG2Ôg&VR+r7V²æGW&ÆÇ’'Ğ¢Â÷à¢ÆF—b6Æ74æÖSÒ&fÆW‚—FV×2Ö6VçFW"vÓ"#à¢Æ'WGFöà¢G—SÒ&'WGFöâ ¢öä6Æ–6³×·FövvÆUF†–æ¶–æt†öÆGĞ¢F—6&ÆVC×²6W76–öå&VG’ÇÂ6ÆÄ–çFW''WFVGĞ¢6Æ74æÖS×¶&÷VæFVBÖgVÆÂ&÷&FW"‚ÓB’Ó"FW‡BÕ³…ÒföçB×6VÖ–&öÆBWW&66RG&6¶–ærÕ³ãFVÕÒG&ç6—F–öâF—6&ÆVC¦÷6—G’Ó3RG·F†–æ¶–æt†öÆBò&&÷&FW"Õ²4CDc3uÒ&rÕ²4CDc3uÒóRFW‡BÕ²6cC““UÒ"¢&&÷&FW"Õ²4CDc3uÒó#"FW‡BÕ²6S†CV5ÒóƒR†÷fW#¦&rÕ²4CDc3uÒó‚'ÖĞ¢à¢·F†–æ¶–æt†öÆBò%&VÆV6R†öÆB"¢%7F–ÆÂF†–æ¶–ær'Ğ¢Âö'WGFöãà¢Æ'WGFöà¢G—SÒ&'WGFöâ ¢öä6Æ–6³×²‚’Óâfö–6RçFövvÆT†æG4g&VT×WFR‚—Ğ¢F—6&ÆVC×°¢6W76–öå&VG’ÇÀ¢Ö–4ÖöFRÓÒ&Ö–7&÷†öæR"ÇÀ¢76W76ÖVçEFW&Ö–æÅV’ÇÀ¢6ÆÄ–çFW''WFV@¢Ğ¢6Æ74æÖSÒ'&÷VæFVBÖgVÆÂ&÷&FW"&÷&FW"Õ²4CDc3uÒó#"‚ÓB’Ó"FW‡BÕ³…ÒföçB×6VÖ–&öÆBWW&66RG&6¶–ærÕ³ãFVÕÒFW‡BÕ²6S†CV5ÒóƒRG&ç6—F–öâ†÷fW#¦&÷&FW"Õ²4CDc3uÒóB†÷fW#¦&rÕ²4CDc3uÒó‚F—6&ÆVC¦÷6—G’Ó3R ¢à¢·fö–6Ræ†æG4g&VT×WFV@¢ò%Væ×WFRÖ–2 ¢¢$×WFRÖ–2'Ğ¢Âö'WGFöãà¢Æ'WGFöà¢G—SÒ&'WGFöâ ¢öä6Æ–6³×²‚’Óâfö–B†æFÆU7F÷‚—Ğ¢6Æ74æÖSÒ'&÷VæFVBÖgVÆÂ&÷&FW"&÷&FW"×v†—FRó"‚ÓB’Ó"FW‡BÕ³…ÒföçB×6VÖ–&öÆBWW&66RG&6¶–ærÕ³ãFVÕÒFW‡B×v†—FRóSRG&ç6—F–öâ†÷fW#¦&÷&FW"×v†—FRó#R†÷fW#¦&r×v†—FRóR†÷fW#§FW‡B×v†—FRóƒ ¢à¢7F÷ ¢Âö'WGFöãà¢ÂöF—cà¢ÂöF—cà¢’¢€¢ÆF—b6Æ74æÖSÒ&fÆW‚fÆW‚Ö6öÂ—FV×2Ö6VçFW"vÓ"ãR#à¢ÆF—b6Æ74æÖSÒ&fÆW‚rÖgVÆÂ—FV×2Ö6VçFW"vÓ"ãR#à¢Æ'WGFöà¢G—SÒ&'WGFöâ ¢F—6&ÆVC×°¢6W76–öå&VG’ÇÀ¢†6RÓÓÒ'7V¶–ær"ÇÀ¢Ö–4ÖöFRÓÒ&Ö–7&÷†öæR"ÇÀ¢76W76ÖVçEFW&Ö–æÅV’ÇÀ¢6ÆÄ–çFW''WFV@¢Ğ¢öåö–çFW$F÷vã×²†WfVçB’Óâ°¢WfVçBæ7W'&VçEF&vWBç6WEö–çFW$6GW&R€¢WfVçBçö–çFW$–@¢“°¢†æFÆU7V´F÷vâ‚“°¢×Ğ¢öåö–çFW%W×²†WfVçB’Óâ°¢–b€¢WfVçBæ7W'&VçEF&vWBæ†5ö–çFW$6GW&R€¢WfVçBçö–çFW$–@¢¢’°¢WfVçBæ7W'&VçEF&vWBç&VÆV6Uö–çFW$6GW&R€¢WfVçBçö–çFW$–@¢“°¢Ğ¢†æFÆU7VµW‚“°¢×Ğ¢öåö–çFW$6æ6VÃ×¶†æFÆU7VµWĞ¢öä¶W”F÷vã×²†WfVçB’Óâ°¢–b€¢WfVçBç&WVBb`¢†WfVçBæ¶W’ÓÓÒ""ÇÂWfVçBæ¶W’ÓÓÒ$VçFW""¢’°¢WfVçBç&WfVçDFVfVÇB‚“°¢†æFÆU7V´F÷vâ‚“°¢Ğ¢×Ğ¢öä¶W•W×²†WfVçB’Óâ°¢–b€¢WfVçBæ¶W’ÓÓÒ""ÇÀ¢WfVçBæ¶W’ÓÓÒ$VçFW" ¢’°¢WfVçBç&WfVçDFVfVÇB‚“°¢†æFÆU7VµW‚“°¢Ğ¢×Ğ¢6Æ74æÖS×¶&VÆF—fRfÆW‚Ö–âÖ‚Õ³2ã#W&VÕÒfÆW‚Ó—FV×2Ö6VçFW"§W7F–g’Ö6VçFW"vÓ"ãR&÷VæFVBÖgVÆÂ&÷&FW"‚ÓR’Ó2ãRFW‡BÕ³…ÒföçB×6VÖ–&öÆBWW&66RG&6¶–ærÕ³ã&VÕÒG&ç6—F–öâGW&F–öâÓ#6VÆV7BÖæöæRF÷V6‚ÖæöæRF—6&ÆVC¦÷6—G’Ó3RG°¢Ö–4Æ—fP¢ò&&÷&FW"Õ²4CDc3uÒ&rÕ²4CDc3uÒFW‡BÖ&Æ6²6†F÷rÕ³óó3g…÷&v&ƒ#"ÃsRÃSRÃã#‚•Ò ¢¢&&÷&FW"Õ²4CDc3uÒó3"&rÕ¶Æ–æV"Öw&F–VçBƒƒFVrÇ&v&ƒ#"ÃsRÃSRÃã’Ç&v&ƒ"Ã"Ã2Ãã“"’•ÒFW‡BÕ²6S†CV5Ò†÷fW#¦&÷&FW"Õ²4CDc3uÒóSR†÷fW#¦&rÕ²4CDc3uÒó"7F—fS§66ÆRÕ³ã“•Ò ¢ÖĞ¢à¢Ç7à¢6Æ74æÖS×¶–æÆ–æRÖfÆW‚‚Ó"rÓ"6‡&–æ²Ó&÷VæFVBÖgVÆÂG°¢Ö–4Æ—fP¢ò&æ–ÖFR×VÇ6R&rÖ&Æ6²ós ¢¢&&rÕ²4CDc3uÒósR6†F÷rÕ³óó…÷&v&ƒ#"ÃsRÃSRÃãSR•Ò ¢ÖĞ¢&–Ö†–FFVà¢óà¢¶76W76ÖVçEFW&Ö–æÅV¢ò$76W76ÖVçBVæF–ær ¢¢Ö–4Æ—fP¢ò$Æ—7FVæ–æ~(
b ¢¢$†öÆBFò7V²'Ğ¢Âö'WGFöãà¢Æ'WGFöà¢G—SÒ&'WGFöâ ¢öä6Æ–6³×²‚’Óâfö–B†æFÆU7F÷‚—Ğ¢6Æ74æÖSÒ&–æÆ–æRÖfÆW‚Ö–âÖ‚Õ³2ã#W&VÕÒ6‡&–æ²Ó—FV×2Ö6VçFW"§W7F–g’Ö6VçFW"&÷VæFVBÖgVÆÂ&÷&FW"&÷&FW"×v†—FRó"‚ÓB’Ó2ãRFW‡BÕ³…ÒföçB×6VÖ–&öÆBWW&66RG&6¶–ærÕ³ãfVÕÒFW‡B×v†—FRóSG&ç6—F–öâ†÷fW#¦&÷&FW"×v†—FRó#"†÷fW#¦&r×v†—FRõ³ãEÒ†÷fW#§FW‡B×v†—FRósR ¢à¢7F÷ ¢Âö'WGFöãà¢ÂöF—cà¢²—5&õW6W"bb—4wVW7E&Wf–Wrò€¢ÄÆ–æ°¢‡&VcÒ"öÖVÖ&W'6†— ¢6Æ74æÖSÒ'FW‡BÕ³…ÒWW&66RG&6¶–ærÕ³ãFVÕÒFW‡BÕ²4CDc3uÒóSRG&ç6—F–öâ†÷fW#§FW‡BÕ²4CDc3uÒóƒR ¢à¢VæÆö6²†æG2Ôg&VRv—F‚&ò(i ¢ÂôÆ–æ³à¢’¢€¢Ç6Æ74æÖSÒ'FW‡BÕ³…ÒWW&66RG&6¶–ærÕ³ãFVÕÒFW‡B×v†—FRó#‚#à¢&W72æB†öÆB+r&VÆV6RFò6Væ@¢Â÷à¢—Ğ¢ÂöF—cà¢—Ğ ¢·†6RÓÓÒ&W'&÷""ò€¢ÆF—b6Æ74æÖSÒ&×BÓ2fÆW‚§W7F–g’Ö6VçFW"vÓ2#à¢Æ'WGFöà¢G—SÒ&'WGFöâ ¢öä6Æ–6³×¶†æFÆU7F'GĞ¢6Æ74æÖSÒ'FW‡B×‡2FW‡B×v†—FRóCG&ç6—F–öâ†÷fW#§FW‡B×v†—FRós ¢à¢&W7F'@¢Âö'WGFöãà¢ÄÆ–æ°¢‡&VcÒ"ö ¢6Æ74æÖSÒ'FW‡B×‡2FW‡B×v†—FRóCG&ç6—F–öâ†÷fW#§FW‡B×v†—FRós ¢à¢&6²Fò†öÖP¢ÂôÆ–æ³à¢ÂöF—cà¢’¢çVÆÇĞ¢ÂöF—cà¢ÂöF—cà¢ÂöF—cà¢ÂöF—cà¢ÂöF—cà¢Âóà¢—Ğ¢Â÷6V7F–öãà ¢·6†÷tFWdF–væ÷7F–72bb€¢Æfö÷FW"6Æ74æÖSÒ'6‡&–æ²Ó"Ó"#à¢Æ'WGFöà¢G—SÒ&'WGFöâ ¢öä6Æ–6³×²‚’Óâ6WE6†÷tF–væ÷7F–72‚‡b’Óâb—Ğ¢6Æ74æÖSÒ'FW‡B×‡2FW‡B×v†—FRó#RG&ç6—F–öâ†÷fW#§FW‡B×v†—FRóCR ¢à¢·6†÷tF–væ÷7F–72ò$†–FRF–væ÷7F–72"¢$F–væ÷7F–72'Ğ¢Âö'WGFöãà¢·6†÷tF–væ÷7F–72bb€¢ÆF—b6Æ74æÖSÒ&×BÓ276R×’Ó2&÷VæFVBÓ'†Â&÷&FW"&÷&FW"×v†—FRó&r×v†—FRóRÓBFW‡BÖÆVgB#à¢Ç6Æ74æÖSÒ'FW‡B×‡2WW&66RG&6¶–ærÕ³ã&VÕÒFW‡B×v†—FRóC#à¢Wf–FVæ6RÆör+ræ÷B'BöbF†R&öGV7B7W&f6P¢Â÷à¢ÇVÂ6Æ74æÖSÒ'76R×’ÓföçBÖÖöæòFW‡BÕ³…ÒFW‡B×v†—FRóCR#à¢¶WfVçG2æÆVæwF‚ÓÓÒò€¢ÆÆ“äæòWfVçG3ÂöÆ“à¢’¢€¢WfVçG2æÖ‚†Æ–æR’ÓâÆÆ’¶W“×¶Æ–æWÓç¶Æ–æWÓÂöÆ“â¢—Ğ¢Â÷VÃà¢·GW&ç2æÆVæwF‚âbb€¢ÆöÂ6Æ74æÖSÒ'76R×’Ó"&÷&FW"×B&÷&FW"×v†—FRóBÓ2FW‡B×‡2FW‡B×v†—FRóSR#à¢·GW&ç2æÖ‚‡GW&â’Óâ€¢ÆÆ’¶W“×¶G·GW&âçGW&ä–æFW‡ÒÒG·GW&âæf–æÆ—¦VDGÖÓà¢7·GW&âçGW&ä–æFW‡Ò·GW&âç&öÆWÓ¢·GW&âçFW‡GĞ¢ÂöÆ“à¢’—Ğ¢ÂööÃà¢—Ğ¢ÂöF—cà¢—Ğ¢Âöfö÷FW#à¢—Ğ¢ÂöF—cà¢ÂöÖ–ãà¢“°§Ğ 