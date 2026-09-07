import { createHash, randomUUID } from "node:crypto";
import {
  coachTopicById,
  type CoachTopic,
  type CoachTopicId,
} from "../assistant-coach/coach-topics.ts";
import {
  AssistantCoachDraftVersionConflictError,
  isAnonSessionExpired,
  type AssistantCoachProfileDraft,
  type AssistantCoachSession,
  type AssistantCoachSessionRepository,
} from "../assistant-coach/session-repository.ts";

export const GUEST_FORGE_PREVIEW_SOURCE = "coach_guest_preview";
export const GUEST_FORGE_PREVIEW_MODE = "guest_preview";
export const GUEST_FORGE_MAX_MINTS = 2;
export const GUEST_FORGE_MAX_TURNS = 40;
export const GUEST_FORGE_MAX_TURN_CHARS = 2_000;
export const GUEST_FORGE_MAX_TRANSCRIPT_CHARS = 20_000;
export const GUEST_FORGE_MINT_LEASE_MS = 45_000;

export type GuestForgePreviewStatus =
  | "unused"
  | "active"
  | "completed"
  | "claimed";

export type GuestForgePreview = {
  status: GuestForgePreviewStatus;
  topicId: CoachTopicId;
  forgeSessionId: string | null;
  reconnectToken: string;
  startedAt: string | null;
  completedAt: string | null;
  completionId: string | null;
  realtimeSessionId: string | null;
  mintAttempts: number;
  mintLeaseId: string | null;
  mintLeaseExpiresAt: string | null;
  transcriptBaseIndex: number;
  lastTranscriptReplayId: string | null;
  lastTranscriptDigest: string | null;
  transcriptUpdatedAt: string | null;
};

export type GuestForgePreviewView = GuestForgePreview & {
  version: number;
  topic: CoachTopic;
};

export class GuestForgePreviewError extends Error {
  readonly code:
    | "invalid_topic"
    | "session_invalid"
    | "topic_locked"
    | "preview_completed"
    | "preview_claimed"
    | "reconnect_denied"
    | "mint_in_flight"
    | "economic_limit"
    | "version_conflict"
    | "invalid_payload";
  readonly status: number;

  constructor(
    code:
      | "invalid_topic"
      | "session_invalid"
      | "topic_locked"
      | "preview_completed"
      | "preview_claimed"
      | "reconnect_denied"
      | "mint_in_flight"
      | "economic_limit"
      | "version_conflict"
      | "invalid_payload",
    message: string,
    status: number
  ) {
    super(message);
    this.name = "GuestForgePreviewError";
    this.code = code;
    this.status = status;
  }
}

function emptyPreview(
  topicId: CoachTopicId,
  transcriptBaseIndex: number
): GuestForgePreview {
  return {
    status: "unused",
    topicId,
    forgeSessionId: null,
    reconnectToken: randomUUID(),
    startedAt: null,
    completedAt: null,
    completionId: null,
    realtimeSessionId: null,
    mintAttempts: 0,
    mintLeaseId: null,
    mintLeaseExpiresAt: null,
    transcriptBaseIndex,
    lastTranscriptReplayId: null,
    lastTranscriptDigest: null,
    transcriptUpdatedAt: null,
  };
}

function readPreview(draft: AssistantCoachProfileDraft): GuestForgePreview | null {
  const value = draft.profileJson.forgePreview;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const candidate = value as Partial<GuestForgePreview>;
  if (
    !["unused", "active", "completed", "claimed"].includes(
      String(candidate.status)
    ) ||
    !coachTopicById(candidate.topicId)
  ) {
    return null;
  }
  return candidate as GuestForgePreview;
}

function nextJson(
  draft: AssistantCoachProfileDraft,
  preview: GuestForgePreview
): Record<string, unknown> {
  return { ...draft.profileJson, forgePreview: preview };
}

function view(
  draft: AssistantCoachProfileDraft,
  preview: GuestForgePreview
): GuestForgePreviewView {
  return {
    ...preview,
    version: draft.version,
    topic: coachTopicById(preview.topicId)!,
  };
}

function assertSession(session: AssistantCoachSession, now: Date): void {
  if (
    session.userId != null ||
    isAnonSessionExpired(session, now) ||
    (session.status !== "active" && session.status !== "gated")
  ) {
    throw new GuestForgePreviewError(
      "session_invalid",
      "A current anonymous Coach session is required.",
      401
    );
  }
}

function terminalError(preview: GuestForgePreview): never {
  if (preview.status === "claimed") {
    throw new GuestForgePreviewError(
      "preview_claimed",
      "This preview has already been claimed.",
      409
    );
  }
  throw new GuestForgePreviewError(
    "preview_completed",
    "This browser has already completed its Forge preview.",
    409
  );
}

export async function bootstrapGuestForgePreview(input: {
  repository: AssistantCoachSessionRepository;
  session: AssistantCoachSession;
  topicId: string;
  now?: Date;
}): Promise<GuestForgePreviewView> {
  const now = input.now ?? new Date();
  assertSession(input.session, now);
  const topic = coachTopicById(input.topicId);
  if (!topic) {
    throw new GuestForgePreviewError(
      "invalid_topic",
      "Choose an approved Coach topic.",
      400
    );
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const draft = await input.repository.getDraft(input.session.id);
    if (!draft) {
      throw new GuestForgePreviewError(
        "session_invalid",
        "Anonymous Coach session state is unavailable.",
        503
      );
    }
    const existing = readPreview(draft);
    if (existing) {
      if (existing.topicId !== topic.id) {
        throw new GuestForgePreviewError(
          "topic_locked",
          "The preview topic cannot be changed after selection.",
          409
        );
      }
      if (!Number.isInteger(existing.transcriptBaseIndex)) {
        const messages = await input.repository.listMessages(input.session.id);
        const transcriptBaseIndex =
          messages.reduce(
            (max, message) => Math.max(max, message.turnIndex),
            -1
          ) + 1;
        const upgraded: GuestForgePreview = {
          ...existing,
          transcriptBaseIndex,
          lastTranscriptDigest: existing.lastTranscriptDigest ?? null,
        };
        try {
          const saved = await input.repository.compareAndSwapDraft(
            input.session.id,
            draft.version,
            nextJson(draft, upgraded),
            now
          );
          return view(saved, upgraded);
        } catch (error) {
          if (
            error instanceof AssistantCoachDraftVersionConflictError &&
            attempt < 2
          ) {
            continue;
          }
          throw error;
        }
      }
      return view(draft, existing);
    }
    const messages = await input.repository.listMessages(input.session.id);
    const transcriptBaseIndex =
      messages.reduce(
        (max, message) => Math.max(max, message.turnIndex),
        -1
      ) + 1;
    try {
      const saved = await input.repository.compareAndSwapDraft(
        input.session.id,
        draft.version,
        nextJson(draft, emptyPreview(topic.id, transcriptBaseIndex)),
        now
      );
      return view(saved, readPreview(saved)!);
    } catch (error) {
      if (!(error instanceof AssistantCoachDraftVersionConflictError)) throw error;
    }
  }
  throw new GuestForgePreviewError(
    "version_conflict",
    "Preview state changed concurrently. Retry.",
    409
  );
}

export type GuestForgeMintAuthorization = {
  preview: GuestForgePreviewView;
  mintLeaseId: string;
};

export async function authorizeGuestForgeMint(input: {
  repository: AssistantCoachSessionRepository;
  session: AssistantCoachSession;
  topicId: string;
  reconnectToken: string;
  expectedVersion: number;
  now?: Date;
}): Promise<GuestForgeMintAuthorization> {
  const now = input.now ?? new Date();
  assertSession(input.session, now);
  const topic = coachTopicById(input.topicId);
  if (!topic) {
    throw new GuestForgePreviewError("invalid_topic", "Invalid Coach topic.", 400);
  }
  const draft = await input.repository.getDraft(input.session.id);
  const preview = draft && readPreview(draft);
  if (!draft || !preview) {
    throw new GuestForgePreviewError(
      "session_invalid",
      "Bootstrap the Forge preview first.",
      401
    );
  }
  if (draft.version !== input.expectedVersion) {
    throw new GuestForgePreviewError(
      "version_conflict",
      "Preview state changed. Restore it before retrying.",
      409
    );
  }
  if (preview.topicId !== topic.id) {
    throw new GuestForgePreviewError("topic_locked", "Preview topic mismatch.", 409);
  }
  if (preview.reconnectToken !== input.reconnectToken) {
    throw new GuestForgePreviewError(
      "reconnect_denied",
      "Reconnect lease is invalid.",
      401
    );
  }
  if (preview.status === "completed" || preview.status === "claimed") {
    terminalError(preview);
  }
  if (
    preview.mintLeaseExpiresAt &&
    new Date(preview.mintLeaseExpiresAt).getTime() > now.getTime()
  ) {
    throw new GuestForgePreviewError(
      "mint_in_flight",
      "A Forge connection is already being created.",
      409
    );
  }
  if (preview.mintAttempts >= GUEST_FORGE_MAX_MINTS) {
    throw new GuestForgePreviewError(
      "economic_limit",
      "The preview reconnect allowance has been used.",
      429
    );
  }

  const mintLeaseId = randomUUID();
  const updated: GuestForgePreview = {
    ...preview,
    status: "active",
    forgeSessionId: preview.forgeSessionId ?? randomUUID(),
    startedAt: preview.startedAt ?? now.toISOString(),
    mintAttempts: preview.mintAttempts + 1,
    mintLeaseId,
    mintLeaseExpiresAt: new Date(
      now.getTime() + GUEST_FORGE_MINT_LEASE_MS
    ).toISOString(),
  };
  try {
    const saved = await input.repository.compareAndSwapDraft(
      input.session.id,
      draft.version,
      nextJson(draft, updated),
      now
    );
    return { preview: view(saved, updated), mintLeaseId };
  } catch (error) {
    if (error instanceof AssistantCoachDraftVersionConflictError) {
      throw new GuestForgePreviewError(
        "version_conflict",
        "Another Forge start won the preview lease.",
        409
      );
    }
    throw error;
  }
}

export async function settleGuestForgeMint(input: {
  repository: AssistantCoachSessionRepository;
  sessionId: string;
  mintLeaseId: string;
  realtimeSessionId: string | null;
  now?: Date;
}): Promise<GuestForgePreviewView> {
  const draft = await input.repository.getDraft(input.sessionId);
  const preview = draft && readPreview(draft);
  if (!draft || !preview || preview.mintLeaseId !== input.mintLeaseId) {
    throw new GuestForgePreviewError(
      "version_conflict",
      "Forge mint lease changed before settlement.",
      409
    );
  }
  const updated: GuestForgePreview = {
    ...preview,
    realtimeSessionId: input.realtimeSessionId,
    mintLeaseId: null,
    mintLeaseExpiresAt: null,
  };
  const saved = await input.repository.compareAndSwapDraft(
    input.sessionId,
    draft.version,
    nextJson(draft, updated),
    input.now
  );
  return view(saved, updated);
}

export type GuestTranscriptTurn = {
  role: "founder" | "forge";
  text: string;
  turnIndex: number;
};

export async function listGuestForgeMessages(
  repository: AssistantCoachSessionRepository,
  sessionId: string
) {
  const messages = await repository.listMessages(sessionId);
  return messages.filter(
    (message) =>
      message.modelMeta.source === GUEST_FORGE_PREVIEW_SOURCE
  );
}

/** Source-filtered read contract shared by reconnect and the later claim slice. */
export async function readGuestForgeTranscriptForClaim(
  repository: AssistantCoachSessionRepository,
  sessionId: string,
  transcriptBaseIndex: number
): Promise<GuestTranscriptTurn[]> {
  const messages = await listGuestForgeMessages(repository, sessionId);
  return messages
    .filter((message) => message.turnIndex >= transcriptBaseIndex)
    .map((message) => ({
      role: message.role === "user" ? "founder" : "forge",
      text: message.content,
      turnIndex: message.turnIndex - transcriptBaseIndex,
    }));
}

function validateTranscript(turns: GuestTranscriptTurn[]): void {
  if (!Array.isArray(turns) || turns.length > GUEST_FORGE_MAX_TURNS) {
    throw new GuestForgePreviewError(
      "invalid_payload",
      "Transcript has too many turns.",
      413
    );
  }
  let total = 0;
  const keys = new Set<string>();
  for (const turn of turns) {
    if (
      (turn.role !== "founder" && turn.role !== "forge") ||
      !Number.isInteger(turn.turnIndex) ||
      turn.turnIndex < 0 ||
      typeof turn.text !== "string" ||
      !turn.text.trim() ||
      turn.text.length > GUEST_FORGE_MAX_TURN_CHARS
    ) {
      throw new GuestForgePreviewError(
        "invalid_payload",
        "Transcript turn is invalid.",
        400
      );
    }
    const key = `${turn.turnIndex}:${turn.role}`;
    if (keys.has(key)) {
      throw new GuestForgePreviewError(
        "invalid_payload",
        "Transcript contains a duplicate turn.",
        400
      );
    }
    keys.add(key);
    total += turn.text.length;
  }
  if (total > GUEST_FORGE_MAX_TRANSCRIPT_CHARS) {
    throw new GuestForgePreviewError(
      "invalid_payload",
      "Transcript is too large.",
      413
    );
  }
}

export async function persistGuestForgeTranscript(input: {
  repository: AssistantCoachSessionRepository;
  session: AssistantCoachSession;
  topicId: string;
  reconnectToken: string;
  expectedVersion: number;
  replayId: string;
  turns: GuestTranscriptTurn[];
  now?: Date;
}): Promise<GuestForgePreviewView> {
  validateTranscript(input.turns);
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(input.replayId)) {
    throw new GuestForgePreviewError(
      "invalid_payload",
      "Transcript replay id is invalid.",
      400
    );
  }
  const now = input.now ?? new Date();
  const digest = transcriptDigest(input.turns);
  assertSession(input.session, now);
  const draft = await input.repository.getDraft(input.session.id);
  const preview = draft && readPreview(draft);
  if (!draft || !preview || preview.status !== "active") {
    if (preview?.status === "completed" || preview?.status === "claimed") {
      terminalError(preview);
    }
    throw new GuestForgePreviewError("session_invalid", "No active preview.", 409);
  }
  if (
    preview.topicId !== input.topicId ||
    preview.reconnectToken !== input.reconnectToken
  ) {
    throw new GuestForgePreviewError(
      "reconnect_denied",
      "Preview binding is invalid.",
      401
    );
  }
  if (
    preview.lastTranscriptReplayId === input.replayId &&
    preview.lastTranscriptDigest !== digest
  ) {
    throw new GuestForgePreviewError(
      "invalid_payload",
      "Transcript replay id was reused with different content.",
      409
    );
  }
  const isReplay = preview.lastTranscriptReplayId === input.replayId;
  if (!isReplay && draft.version !== input.expectedVersion) {
    throw new GuestForgePreviewError(
      "version_conflict",
      "Transcript state changed. Restore before retrying.",
      409
    );
  }
  let updated = preview;
  let saved = draft;
  if (!isReplay) {
    updated = {
      ...preview,
      lastTranscriptReplayId: input.replayId,
      lastTranscriptDigest: digest,
      transcriptUpdatedAt: now.toISOString(),
    };
    try {
      saved = await input.repository.compareAndSwapDraft(
        input.session.id,
        draft.version,
        nextJson(draft, updated),
        now
      );
    } catch (error) {
      if (error instanceof AssistantCoachDraftVersionConflictError) {
        throw new GuestForgePreviewError(
          "version_conflict",
          "Transcript submission lost a concurrency race.",
          409
        );
      }
      throw error;
    }
  }

  const existing = await listGuestForgeMessages(
    input.repository,
    input.session.id
  );
  for (const turn of input.turns) {
    const role = turn.role === "founder" ? "user" : "assistant";
    const storedTurnIndex = preview.transcriptBaseIndex + turn.turnIndex;
    const prior = existing.find(
      (message) =>
        message.turnIndex === storedTurnIndex && message.role === role
    );
    if (prior) {
      if (prior.content !== turn.text.trim()) {
        throw new GuestForgePreviewError(
          "invalid_payload",
          "Transcript turn replay does not match stored content.",
          409
        );
      }
      continue;
    }
    await input.repository.appendMessage({
      sessionId: input.session.id,
      turnIndex: storedTurnIndex,
      role,
      content: turn.text.trim(),
      modelMeta: {
        source: GUEST_FORGE_PREVIEW_SOURCE,
        replayId: input.replayId,
      },
    });
  }
  const converged = await listGuestForgeMessages(
    input.repository,
    input.session.id
  );
  for (const turn of input.turns) {
    const role = turn.role === "founder" ? "user" : "assistant";
    const storedTurnIndex = preview.transcriptBaseIndex + turn.turnIndex;
    const stored = converged.find(
      (message) =>
        message.turnIndex === storedTurnIndex && message.role === role
    );
    if (!stored || stored.content !== turn.text.trim()) {
      throw new Error("Guest Forge transcript did not converge durably.");
    }
  }
  return view(saved, updated);
}

export async function completeGuestForgePreview(input: {
  repository: AssistantCoachSessionRepository;
  session: AssistantCoachSession;
  topicId: string;
  reconnectToken: string;
  expectedVersion: number;
  completionId: string;
  now?: Date;
}): Promise<GuestForgePreviewView> {
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(input.completionId)) {
    throw new GuestForgePreviewError(
      "invalid_payload",
      "Completion id is invalid.",
      400
    );
  }
  const now = input.now ?? new Date();
  assertSession(input.session, now);
  const draft = await input.repository.getDraft(input.session.id);
  const preview = draft && readPreview(draft);
  if (!draft || !preview) {
    throw new GuestForgePreviewError("session_invalid", "No preview exists.", 409);
  }
  if (
    preview.topicId !== input.topicId ||
    preview.reconnectToken !== input.reconnectToken
  ) {
    throw new GuestForgePreviewError(
      "reconnect_denied",
      "Preview binding is invalid.",
      401
    );
  }
  if (
    preview.status === "completed" &&
    preview.completionId === input.completionId
  ) {
    return view(draft, preview);
  }
  if (preview.status === "completed" || preview.status === "claimed") {
    terminalError(preview);
  }
  if (preview.status !== "active") {
    throw new GuestForgePreviewError(
      "session_invalid",
      "Only an active preview can complete.",
      409
    );
  }
  if (draft.version !== input.expectedVersion) {
    throw new GuestForgePreviewError(
      "version_conflict",
      "Completion state changed. Restore before retrying.",
      409
    );
  }
  const updated: GuestForgePreview = {
    ...preview,
    status: "completed",
    completedAt: now.toISOString(),
    completionId: input.completionId,
    mintLeaseId: null,
    mintLeaseExpiresAt: null,
  };
  try {
    const saved = await input.repository.compareAndSwapDraft(
      input.session.id,
      draft.version,
      nextJson(draft, updated),
      now
    );
    return view(saved, updated);
  } catch (error) {
    if (error instanceof AssistantCoachDraftVersionConflictError) {
      throw new GuestForgePreviewError(
        "version_conflict",
        "Completion lost a concurrency race.",
        409
      );
    }
    throw error;
  }
}

export function guestForgeTopicContext(topicId: string): {
  eventTitle: string;
  objective: string;
  opening: string;
} {
  const topic = coachTopicById(topicId);
  if (!topic) {
    throw new GuestForgePreviewError("invalid_topic", "Invalid Coach topic.", 400);
  }
  const details: Record<CoachTopicId, [string, string]> = {
    interview: [
      "Job interview",
      "Ask what role or interview moment is ahead, then invite the visitor to answer one realistic opening interview question.",
    ],
    "salary-negotiation": [
      "Salary negotiation",
      "Ask who they are negotiating with and what outcome matters, then invite their opening ask.",
    ],
    "difficult-feedback": [
      "Difficult feedback",
      "Ask who needs the feedback and what makes it difficult, then invite their first sentence.",
    ],
    "setting-a-boundary": [
      "Setting a boundary",
      "Ask who the boundary is with and what needs to change, then invite the clearest opening line.",
    ],
    "pitch-presentation": [
      "Pitch or presentation",
      "Ask who the audience is and what they should understand, then invite the opening.",
    ],
    "handling-conflict": [
      "Handling conflict",
      "Ask who the conflict is with and what is at stake, then invite the first calm sentence.",
    ],
    "something-else": [
      "Conversation practice",
      "Open generically: ask what conversation they want to prepare for. Do not offer a menu or turn the opening into a form.",
    ],
  };
  const [eventTitle, firstQuestion] = details[topic.id];
  return {
    eventTitle,
    objective: [
      `GUEST FORGE PREVIEW TOPIC (server-owned): ${topic.label}.`,
      "This is one private practice preview. Forge remains the coach.",
      "Do not infer or write Living Profile identity or relationship memory.",
      "Ask exactly one scenario-relevant first question, then wait.",
      firstQuestion,
    ].join(" "),
    opening: firstQuestion,
  };
}

export function transcriptDigest(turns: GuestTranscriptTurn[]): string {
  return createHash("sha256").update(JSON.stringify(turns)).digest("hex");
}
