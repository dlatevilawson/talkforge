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
import { disciplineAssistantCoachOutput } from "./reply-discipline.ts";
import { memberEvidenceFromTurn } from "./confirmation.ts";
import {
  buildGateFlags,
  type AssistantCoachGateFlags,
} from "./gate-flags.ts";
import { AssistantCoachConfigError } from "./config.ts";
import { getAssistantCoachAnonTurnCap } from "./config.ts";
import { computeHasExperiencedValue } from "./semantic-value.ts";
import {
  messageHasAcceptedIntervention,
  validateCoachIntervention,
} from "./intervention.ts";
import {
  isAnonSessionExpired,
  type AssistantCoachMessage,
  type AssistantCoachSession,
  type AssistantCoachSessionRepository,
} from "./session-repository.ts";

export type AssistantCoachModelOutput = {
  reply: string;
  observations?: unknown;
  /** Optional structured actionable intervention (validated server-side). */
  intervention?: unknown;
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
  readonly gate?: AssistantCoachGateFlags;
  readonly session?: AssistantCoachSession;

  constructor(
    code: string,
    message: string,
    status = 400,
    extras?: {
      gate?: AssistantCoachGateFlags;
      session?: AssistantCoachSession;
    }
  ) {
    super(message);
    this.name = "AssistantCoachTurnError";
    this.code = code;
    this.status = status;
    this.gate = extras?.gate;
    this.session = extras?.session;
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

  // 4B.6 — hard gate BEFORE model spend for anonymous sessions.
  const turnCap = getAssistantCoachAnonTurnCap();
  const isAnonymous = session.userId == null;
  if (isAnonymous) {
    const blocked =
      session.hasExperiencedValue ||
      session.status === "gated" ||
      session.turnCount >= turnCap;
    if (blocked) {
      let gated = session;
      if (
        session.status === "active" &&
        typeof repository.updateSessionFlags === "function"
      ) {
        gated = await repository.updateSessionFlags(session.id, {
          status: "gated",
          hasExperiencedValue: session.hasExperiencedValue,
          now,
        });
      } else if (session.status === "active") {
        gated = { ...session, status: "gated" };
      }
      throw new AssistantCoachTurnError(
        "must_authenticate",
        "Create an account to continue this Assistant Coach conversation.",
        403,
        {
          session: gated,
          gate: buildGateFlags(gated, {
            turnCap,
            isAnonymous: true,
          }),
        }
      );
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
    // Preserve fail-closed config errors (e.g. missing OPENAI_API_KEY on hosted).
    if (err instanceof AssistantCoachConfigError) throw err;
    throw new AssistantCoachTurnError(
      "model_failed",
      err instanceof Error ? err.message : "Model invocation failed.",
      502
    );
  }

  const rawReply =
    typeof modelOut?.reply === "string" ? modelOut.reply.trim() : "";
  if (!rawReply) {
    throw new AssistantCoachTurnError(
      "malformed_model",
      "Model response missing reply.",
      502
    );
  }

  const priorUserMessages = existingMessages
    .filter((m) => m.role === "user")
    .map((m) => m.content);
  const disciplined = disciplineAssistantCoachOutput({
    reply: rawReply,
    intervention: modelOut.intervention,
    userMessages: [...priorUserMessages, message],
  });
  const reply = disciplined.reply;

  const decisions = validateModelObservations(modelOut.observations);
  const turnIndex =
    existingMessages.reduce((max, m) => Math.max(max, m.turnIndex), -1) + 1;
  const sourceId = clientTurnId || `turn_${session.id}_${turnIndex}`;

  const spoken = memberEvidenceFromTurn(message, priorUserMessages);
  if (spoken) {
    workingProfile = addEvidenceToLivingProfile(workingProfile, {
      userId: workingProfile.userId,
      sourceType: "assistant_coach",
      sourceId: `${sourceId}_said`,
      text: spoken.text,
      category: spoken.category,
      confidence: spoken.confidence,
      observedAt: now.toISOString(),
    });
  }

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

  // Validate intervention against post-turn ledger (grounding must exist).
  const interventionDecision = validateCoachIntervention(
    disciplined.intervention,
    workingProfile.evidenceLedger ?? []
  );

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
      interventionAccepted: interventionDecision.accepted === true,
      clippedCurriculum: disciplined.clippedCurriculum,
      withheldIntervention: disciplined.withheldIntervention,
      ...(interventionDecision.accepted
        ? {
            interventionKind: interventionDecision.kind,
            interventionSummary: interventionDecision.summary,
            interventionGrounding: interventionDecision.groundedInCategories,
          }
        : interventionDecision.reason
          ? { interventionRejectReason: interventionDecision.reason }
          : {}),
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
  const priorIntervention = messagesAfter.some(
    (m) =>
      m.role === "assistant" &&
      messageHasAcceptedIntervention(m.modelMeta ?? undefined)
  );
  const experienced = computeHasExperiencedValue({
    evidenceLedger: workingProfile.evidenceLedger ?? [],
    profileInsights: workingProfile.profileInsights ?? [],
    messages: messagesAfter,
    hasActionableIntervention: priorIntervention,
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

  const capForGate = getAssistantCoachAnonTurnCap();
  return {
    reply,
    session: updated,
    gate: buildGateFlags(updated, {
      turnCap: capForGate,
      isAnonymous: updated.userId == null,
    }),
    messages: messagesAfter,
    observationDecisions: decisions,
    idempotentReplay: false,
  };
}
