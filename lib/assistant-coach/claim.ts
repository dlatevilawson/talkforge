/**
 * Claim anonymous Assistant Coach session onto an authenticated member.
 * Intelligence stays identity-agnostic; this only changes ownership.
 */
import {
  AssistantCoachClaimError,
  draftJsonToLivingProfile,
  mergeDraftIntoMemberLivingProfile,
} from "./claim-merge.ts";
import { isAnonSessionExpired } from "./session-repository.ts";
import type {
  AssistantCoachMessage,
  AssistantCoachSession,
  AssistantCoachSessionRepository,
} from "./session-repository.ts";
import type { LivingProfile } from "../system1/types.ts";

export { AssistantCoachClaimError };

export type ClaimLivingProfileStore = {
  loadOrCreate(userId: string): Promise<LivingProfile>;
  saveMerged(profile: LivingProfile): Promise<LivingProfile>;
  markOnboardingComplete(userId: string): Promise<void>;
};

export type ClaimAssistantCoachSessionInput = {
  repository: AssistantCoachSessionRepository;
  anonKeyHash: string | null;
  userId: string;
  profiles: ClaimLivingProfileStore;
  now?: Date;
};

export type ClaimAssistantCoachSessionResult = {
  session: AssistantCoachSession;
  /** Merged member Living Profile after claim (System 1). */
  profile: LivingProfile;
  /** This AC session's draft only — confirmation must not use member history. */
  draftProfile: LivingProfile;
  /** User turns from this AC session — used to recover the identified moment. */
  userMessages: string[];
  alreadyClaimed: boolean;
};

function userMessageTexts(messages: AssistantCoachMessage[]): string[] {
  return messages
    .filter((m) => m.role === "user")
    .map((m) => m.content.trim())
    .filter(Boolean);
}

async function loadSessionDraftAndMessages(
  repository: AssistantCoachSessionRepository,
  session: AssistantCoachSession
): Promise<{ draftProfile: LivingProfile; userMessages: string[] }> {
  const draftRow = await repository.getDraft(session.id);
  const draftProfile = draftJsonToLivingProfile(
    session.id,
    draftRow?.profileJson
  );
  const userMessages = userMessageTexts(
    await repository.listMessages(session.id)
  );
  return { draftProfile, userMessages };
}

function requireClaimMethods(repository: AssistantCoachSessionRepository) {
  if (
    typeof repository.getSessionByAnonKeyHashForClaim !== "function" ||
    typeof repository.claimSession !== "function" ||
    typeof repository.getLatestClaimedSessionByUserId !== "function"
  ) {
    throw new AssistantCoachClaimError(
      "claim_unavailable",
      "Assistant Coach claim is not available.",
      503
    );
  }
}

export async function claimAssistantCoachSession(
  input: ClaimAssistantCoachSessionInput
): Promise<ClaimAssistantCoachSessionResult> {
  requireClaimMethods(input.repository);
  const now = input.now ?? new Date();
  const userId = input.userId;

  let session: AssistantCoachSession | null = null;
  if (input.anonKeyHash) {
    session = await input.repository.getSessionByAnonKeyHashForClaim!(
      input.anonKeyHash
    );
  }

  if (session && isAnonSessionExpired(session, now) && session.userId == null) {
    throw new AssistantCoachClaimError(
      "session_expired",
      "This Coach session has expired. Start again.",
      410
    );
  }

  if (session?.userId && session.userId !== userId) {
    throw new AssistantCoachClaimError(
      "claim_conflict",
      "This Coach session belongs to another account.",
      409
    );
  }

  if (!session) {
    const existing =
      await input.repository.getLatestClaimedSessionByUserId!(userId);
    if (!existing) {
      throw new AssistantCoachClaimError(
        "session_required",
        "No Coach session to continue. Start from Coach first.",
        404
      );
    }
    const profile = await input.profiles.loadOrCreate(userId);
    const { draftProfile, userMessages } = await loadSessionDraftAndMessages(
      input.repository,
      existing
    );
    return {
      session: existing,
      profile,
      draftProfile,
      userMessages,
      alreadyClaimed: true,
    };
  }

  const alreadyClaimed =
    session.userId === userId && session.status === "claimed";

  const { draftProfile, userMessages } = await loadSessionDraftAndMessages(
    input.repository,
    session
  );

  if (alreadyClaimed) {
    const profile = await input.profiles.loadOrCreate(userId);
    return {
      session,
      profile,
      draftProfile,
      userMessages,
      alreadyClaimed: true,
    };
  }

  const member = await input.profiles.loadOrCreate(userId);
  const purposeBefore = member.purposeStatement;
  const principlesBefore = member.personalPrinciples;
  const seasonsBefore = member.seasons;

  const merged = mergeDraftIntoMemberLivingProfile({
    member,
    draft: draftProfile,
    sessionId: session.id,
    now,
  });

  if (merged.purposeStatement !== purposeBefore) {
    merged.purposeStatement = purposeBefore;
  }
  merged.personalPrinciples = principlesBefore;
  merged.seasons = seasonsBefore;

  const saved = await input.profiles.saveMerged(merged);
  const claimed = await input.repository.claimSession!({
    sessionId: session.id,
    userId,
    now,
  });

  await input.profiles.markOnboardingComplete(userId);

  return {
    session: claimed,
    profile: saved,
    draftProfile,
    userMessages,
    alreadyClaimed: false,
  };
}
