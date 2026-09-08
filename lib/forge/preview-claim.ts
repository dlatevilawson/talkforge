import { coachTopicById, type CoachTopicId } from "../assistant-coach/coach-topics.ts";
import {
  AssistantCoachDraftVersionConflictError,
  isAnonSessionExpired,
  type AssistantCoachSession,
  type AssistantCoachSessionRepository,
} from "../assistant-coach/session-repository.ts";
import {
  readGuestForgePreview,
  readGuestForgeTranscriptForClaim,
  type GuestTranscriptTurn,
} from "./guest-preview.ts";

export class GuestPreviewClaimError extends Error {
  readonly code:
    | "claim_unavailable"
    | "preview_required"
    | "preview_incomplete"
    | "preview_expired"
    | "claim_conflict"
    | "topic_mismatch"
    | "claim_race";
  readonly status: number;

  constructor(
    code:
      | "claim_unavailable"
      | "preview_required"
      | "preview_incomplete"
      | "preview_expired"
      | "claim_conflict"
      | "topic_mismatch"
      | "claim_race",
    message: string,
    status: number
  ) {
    super(message);
    this.name = "GuestPreviewClaimError";
    this.code = code;
    this.status = status;
  }
}

export type GuestPreviewClaimResult = {
  session: AssistantCoachSession;
  topicId: CoachTopicId;
  transcript: GuestTranscriptTurn[];
  alreadyClaimed: boolean;
};

function requireClaimRepository(repository: AssistantCoachSessionRepository) {
  if (
    typeof repository.getSessionByAnonKeyHashForClaim !== "function" ||
    typeof repository.claimSession !== "function"
  ) {
    throw new GuestPreviewClaimError(
      "claim_unavailable",
      "Preview claim is unavailable.",
      503
    );
  }
}

async function markPreviewClaimed(input: {
  repository: AssistantCoachSessionRepository;
  sessionId: string;
  now: Date;
}): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const draft = await input.repository.getDraft(input.sessionId);
    const preview = draft && readGuestForgePreview(draft);
    if (!draft || !preview) {
      throw new GuestPreviewClaimError(
        "preview_required",
        "No completed Forge preview is available to claim.",
        404
      );
    }
    if (preview.status === "claimed") return;
    if (preview.status !== "completed") {
      throw new GuestPreviewClaimError(
        "preview_incomplete",
        "Complete the Forge preview before creating or linking an account.",
        409
      );
    }
    try {
      await input.repository.compareAndSwapDraft(
        input.sessionId,
        draft.version,
        {
          ...draft.profileJson,
          forgePreview: { ...preview, status: "claimed" },
        },
        input.now
      );
      return;
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
  throw new GuestPreviewClaimError(
    "claim_race",
    "Preview claim changed concurrently. Retry.",
    409
  );
}

export async function claimGuestForgePreview(input: {
  repository: AssistantCoachSessionRepository;
  anonKeyHash: string | null;
  userId: string;
  expectedTopicId: string;
  now?: Date;
}): Promise<GuestPreviewClaimResult> {
  requireClaimRepository(input.repository);
  const now = input.now ?? new Date();
  const topic = coachTopicById(input.expectedTopicId);
  if (!topic) {
    throw new GuestPreviewClaimError(
      "topic_mismatch",
      "Choose an approved Coach topic.",
      400
    );
  }
  if (!input.anonKeyHash) {
    throw new GuestPreviewClaimError(
      "preview_required",
      "This browser does not have a Forge preview to claim.",
      401
    );
  }

  const session =
    await input.repository.getSessionByAnonKeyHashForClaim!(
      input.anonKeyHash
    );
  if (!session) {
    throw new GuestPreviewClaimError(
      "preview_required",
      "This browser does not have a Forge preview to claim.",
      404
    );
  }
  const alreadyClaimed =
    session.userId === input.userId && session.status === "claimed";
  if (!alreadyClaimed && isAnonSessionExpired(session, now)) {
    throw new GuestPreviewClaimError(
      "preview_expired",
      "This Forge preview has expired.",
      410
    );
  }
  if (session.userId && session.userId !== input.userId) {
    throw new GuestPreviewClaimError(
      "claim_conflict",
      "This Forge preview belongs to another account.",
      409
    );
  }

  const draft = await input.repository.getDraft(session.id);
  const preview = draft && readGuestForgePreview(draft);
  if (!draft || !preview) {
    throw new GuestPreviewClaimError(
      "preview_required",
      "No Forge preview is available to claim.",
      404
    );
  }
  if (preview.topicId !== topic.id) {
    throw new GuestPreviewClaimError(
      "topic_mismatch",
      "The return topic does not match this Forge preview.",
      409
    );
  }
  if (preview.status !== "completed" && preview.status !== "claimed") {
    throw new GuestPreviewClaimError(
      "preview_incomplete",
      "Complete the Forge preview before creating or linking an account.",
      409
    );
  }

  let claimed = session;
  if (!alreadyClaimed) {
    try {
      claimed = await input.repository.claimSession!({
        sessionId: session.id,
        userId: input.userId,
        now,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === "AssistantCoachClaimConflictError"
      ) {
        throw new GuestPreviewClaimError(
          "claim_conflict",
          "This Forge preview belongs to another account.",
          409
        );
      }
      if (
        error instanceof Error &&
        error.name === "AssistantCoachClaimExpiredError"
      ) {
        throw new GuestPreviewClaimError(
          "preview_expired",
          "This Forge preview has expired.",
          410
        );
      }
      throw error;
    }
  }

  // The ownership update above atomically binds the session row and all
  // session-keyed transcript/topic storage. This CAS is an idempotent marker;
  // retries converge if either database request was interrupted.
  await markPreviewClaimed({
    repository: input.repository,
    sessionId: session.id,
    now,
  });
  const transcript = await readGuestForgeTranscriptForClaim(
    input.repository,
    session.id,
    preview.transcriptBaseIndex
  );

  return {
    session: claimed,
    topicId: topic.id,
    transcript,
    alreadyClaimed,
  };
}

export function previewClaimReturnPath(topicId: string): string {
  const topic = coachTopicById(topicId);
  return topic
    ? `/forge/preview/claim?topic=${encodeURIComponent(topic.id)}`
    : "/coach";
}

export function previewClaimLoginPath(topicId: string): string {
  return `/login?next=${encodeURIComponent(previewClaimReturnPath(topicId))}`;
}

export function memberForgeTransitionPath(topicId: string): string {
  const topic = coachTopicById(topicId);
  return topic
    ? `/forge?topic=${encodeURIComponent(topic.id)}&start=1`
    : "/app";
}

export function authenticatedPracticePath(topicId: string): string {
  const topic = coachTopicById(topicId);
  return topic
    ? `/app/practice?topic=${encodeURIComponent(topic.id)}&start=1`
    : "/app";
}
