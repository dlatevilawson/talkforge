/**
 * Phase 4B.4 — identity-agnostic Assistant Coach turn runtime.
 *
 * Docs historically referred to runAssistantCoachTurn in lib/assistant-coach;
 * that export did not exist on main. This module introduces the minimal
 * runtime required by PHASE4B §4B.4, built on System 1 evidence/insight helpers.
 *
 * Does NOT implement: hard gate (4B.6), semantic value policy (4B.5), claim,
 * UI, Forge, Assessment, or guest identity.
 */
import {
  addEvidenceToLivingProfile,
  applyDerivedInsightsToLivingProfile,
  buildCoachContext,
} from "../system1/profile-intelligence.ts";
import { emptyLivingProfile } from "../system1/profile.ts";
import type { LivingProfile } from "../system1/types.ts";
import {
  validateModelObservations,
  type ObservationDecision,
} from "./observations.ts";
import {
  buildGateFlags,
  type AssistantCoachGateFlags,
} from "./gate-flags.ts";
import { getAssistantCoachAnonTurnCap } from "./config.ts";
import { computeHasExperiencedValue } from "./semantic-value.ts";
import {
  isAnonSessionExpired,
  type AssistantCoachMessage,
  type AssistantCoachSession,
  type AssistantCoachSessionRepository,
} from "./session-repository.ts";

export type AssistantCoachModelOutput = {
  reply: string;
  observations?: unknown;
};

export type AssistantCoachModel = (input: {
  message: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  coachContext: ReturnType<typeof buildCoachContext>;
}) => Promise<AssistantCoachModelOutput>;

export type RunAssistantCoachTurnInput = {
  repository: AssistantCoachSessionRepository;
  session: AssistantCoachSession;
  message: string;
  clientTurnId?: string | null;
  /** When set and matches session.userId, profile is treated as member LP draft sync. */
  authUserId?: string | null;
  /** Optional member Living Profile (claimed path). Draft is still updated. */
  memberProfile?: LivingProfile | null;
  model: AssistantCoachModel;
  now?: Date;
};

export type RunAssistantCoachTurnResult = {
  reply: string;
  session: AssistantCoachSession;
  gate: AssistantCoachGateFlags;
  messages: AssistantCoachMessage[];
  observationDecisions: ObservationDecision[];
  idempotentReplay: boolean;
};

export class AssistantCoachTurnError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "AssistantCoachTurnError";
    this.code = code;
    this.status = status;
  }
}

function asLivingProfile(
  sessionId: string,
  profileJson: Record<string, unknown> | null | undefined,
  authUserId?: string | null
): LivingProfile {
  const base = emptyLivingProfile(
    authUserId || `anon:${sessionId}`,
    typeof profileJson?.displayName === "string"
      ? profileJson.displayName
      : ""
  );
  if (!profileJson || typeof profileJson !== "object") return base;
  return {
    ...base,
    ...profileJson,
    userId: base.userId,
    // Never allow draft JSON to smuggle a purpose overwrite from the model path.
    purposeStatement:
      typeof profileJson.purposeStatement === "string"
        ? profileJson.purposeStatement
        : base.purposeStatement,
    evidenceLedger: Array.isArray(profileJson.evidenceLedger)
      ? (profileJson.evidenceLedger as LivingProfile["evidenceLedger"])
      : base.evidenceLedger,
    profileInsights: Array.isArray(profileJson.profileInsights)
      ? (profileJson.profileInsights as LivingProfile["profileInsights"])
      : base.profileInsights,
    personalPrinciples: Array.isArray(profileJson.personalPrinciples)
      ? (profileJson.personalPrinciples as LivingProfile["personalPrinciples"])
      : base.personalPrinciples,
    seasons: Array.isArray(profileJson.seasons)
      ? (profileJson.seasons as LivingProfile["seasons"])
      : base.seasons,
    provenance: Array.isArray(profileJson.provenance)
      ? (profileJson.provenance as LivingProfile["provenance"])
      : base.provenance,
  };
}

function livingProfileToDraftJson(profile: LivingProfile): Record<string, unknown> {
  return {
    ...profile,
    // Explicit: purpose remains whatever was already on the draft/member —
    // runtime never invents purpose.
    purposeStatement: profile.purposeStatement ?? "",
    evidenceLedger: profile.evidenceLedger,
    profileInsights: profile.profileInsights,
  };
}

function findIdempotentReplay(
  messages: AssistantCoachMessage[],
  clientTurnId: string
): { user: AssistantCoachMessage; assistant: AssistantCoachMessage } | null {
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    if (
      m.role === "user" &&
      m.modelMeta &&
      m.modelMeta.clientTurnId === clientTurnId
    ) {
      const next = messages[i + 1];
      if (next && next.role === "assistant") {
        return { user: m, assistant: next };
      }
    }
  }
  return null;
}

/**
 * Execute one Assistant Coach turn against an already-resolved session.
 */
export async function runAssistantCoachTurn(
  input: RunAssistantCoachTurnInput
): Promise<RunAssistantCoachTurnResult> {
  const now = input.now ?? new Date();
  const message = input.message.trim();
  if (!message) {
    throw new AssistantCoachTurnError(
      "message_required",
      "A message is required.",
      400
    );
  }

  const { session, repository } = input;
  if (isAnonSessionExpired(session, now)) {
    await repository.markExpiredIfPast(session.id, now);
    throw new AssistantCoachTurnError(
      "session_expired",
      "This Assistant Coach session has expired.",
      410
    );
  }
  if (session.status === "claimed" && session.userId == null) {
    throw new AssistantCoachTurnError(
      "session_invalid",
      "Claimed session is missing user ownership.",
      409
    );
  }
  // Claimed sessions: only the owning member may continue (no anon cookie reuse).
  if (session.userId != null) {
    if (!input.authUserId || input.authUserId !== session.userId) {
      throw new AssistantCoachTurnError(
        "session_claimed",
        "This session belongs to a member account.",
        403
      );
    }
  }

  const existingMessages = await repository.listMessages(session.id);
  const clientTurnId = input.clientTurnId?.trim() || null;
  if (clientTurnId) {
    const replay = findIdempotentReplay(existingMessages, clientTurnId);
    if (replay) {
      const fresh = (await repository.getSession(session.id)) ?? session;
      return {
        reply: replay.assistant.content,
        session: fresh,
        gate: buildGateFlags(fresh, {
          turnCap: getAssistantCoachAnonTurnCap(),
          isAnonymous: fresh.userId == null,
        }),
        messages: await repository.listMessages(session.id),
        observationDecisions: [],
        idempotentReplay: true,
      };
    }
  }

  const draft = await repository.getDraft(session.id);
  if (!draft) {
    throw new AssistantCoachTurnError(
      "draft_missing",
      "Assistant Coach profile draft is missing.",
      500
    );
  }

  const useMember =
    Boolean(input.authUserId) &&
    session.userId != null &&
    input.authUserId === session.userId &&
    input.memberProfile;

  let workingProfile = useMember
    ? input.memberProfile!
    : asLivingProfile(session.id, draft.profileJson, input.authUserId);

  // Freeze purpose before model/evidence path (OWN-001).
  const purposeBefore = workingProfile.purposeStatement;
  const principlesBefore = workingProfile.personalPrinciples;

  const history = existingMessages.map((m) => ({
    role: m.role,
    content: m.content,
  }));
  const coachContext = buildCoachContext(workingProfile);

  let modelOut: AssistantCoachModelOutput;
  try {
    modelOut = await input.model({
      message,
      history,
      coachContext,
    });
  } catch (err) {
    throw new AssistantCoachTurnError(
      "model_failed",
      err instanceof Error ? err.message : "Model invocation failed.",
      502
    );
  }

  const reply =
    typeof modelOut?.reply === "string" ? modelOut.reply.trim() : "";
  if (!reply) {
    throw new AssistantCoachTurnError(
      "malformed_model",
      "Model response missing reply.",
      502
    );
  }

  const decisions = validateModelObservations(modelOut.observations);
  const turnIndex =
    existingMessages.reduce((max, m) => Math.max(max, m.turnIndex), -1) + 1;
  const sourceId = clientTurnId || `turn_${session.id}_${turnIndex}`;

  for (const d of decisions) {
    if (!d.accepted) continue;
    workingProfile = addEvidenceToLivingProfile(workingProfile, {
      userId: workingProfile.userId,
      sourceType: "assistant_coach",
      sourceId,
      text: d.text,
      category: d.category,
      confidence: d.confidence,
      observedAt: now.toISOString(),
    });
  }
  workingProfile = applyDerivedInsightsToLivingProfile(workingProfile, {
    now: now.toISOString(),
  });

  // OWN-001 hard guard: never let runtime mutate purpose/principles.
  workingProfile = {
    ...workingProfile,
    purposeStatement: purposeBefore,
    personalPrinciples: principlesBefore,
  };

  const userMessage = await repository.appendMessage({
    sessionId: session.id,
    turnIndex,
    role: "user",
    content: message,
    modelMeta: {
      clientTurnId: clientTurnId ?? undefined,
      sourceId,
    },
    createdAt: now.toISOString(),
  });

  const assistantMessage = await repository.appendMessage({
    sessionId: session.id,
    turnIndex: turnIndex + 1,
    role: "assistant",
    content: reply,
    modelMeta: {
      clientTurnId: clientTurnId ?? undefined,
      observationCount: decisions.length,
      acceptedCount: decisions.filter((d) => d.accepted).length,
      rejectedCount: decisions.filter((d) => !d.accepted).length,
    },
    createdAt: new Date(now.getTime() + 1).toISOString(),
  });
  void userMessage;
  void assistantMessage;

  await repository.saveDraft({
    sessionId: session.id,
    version: draft.version + 1,
    profileJson: livingProfileToDraftJson(workingProfile),
    updatedAt: now.toISOString(),
  });

  let updated = (await repository.getSession(session.id)) ?? session;

  // 4B.5 — sticky semantic value (never clears once true).
  const messagesAfter = await repository.listMessages(session.id);
  const experienced = computeHasExperiencedValue({
    evidenceLedger: workingProfile.evidenceLedger ?? [],
    profileInsights: workingProfile.profileInsights ?? [],
    messages: messagesAfter,
  });
  if (
    experienced &&
    !updated.hasExperiencedValue &&
    typeof repository.updateSessionFlags === "function"
  ) {
    updated = await repository.updateSessionFlags(session.id, {
      hasExperiencedValue: true,
      now,
    });
  } else if (experienced && !updated.hasExperiencedValue) {
    // Memory repos always have updateSessionFlags; keep fail-soft for partial mocks.
    updated = { ...updated, hasExperiencedValue: true };
  }

  const turnCap = getAssistantCoachAnonTurnCap();
  return {
    reply,
    session: updated,
    gate: buildGateFlags(updated, {
      turnCap,
      isAnonymous: updated.userId == null,
    }),
    messages: messagesAfter,
    observationDecisions: decisions,
    idempotentReplay: false,
  };
}
