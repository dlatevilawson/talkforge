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
  profile: LivingProfile;
  alreadyClaimed: boolean;
};

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
    return { session: existing, profile, alreadyClaimed: true };
  }

  const alreadyClaimed =
    session.userId === userId && session.status === "claimed";

  const member = await input.profiles.loadOrCreate(userId);
  const purposeBefore = member.purposeStatement;
  const principlesBefore = member.personalPrinciples;
  const seasonsBefore = member.seasons;

  const draftRow = await input.repository.getDraft(session.id);
  const draft = draftJsonToLivingProfile(session.id, draftRow?.profileJson);
  const merged = mergeDraftIntoMemberLivingProfile({
    member,
    draft,
    sessionId: session.id,
    now,
  });

  if (merged.purposeStatement !== purposeBefore) {
    merged.purposeStatement = purposeBefore;
  }
  merged.personalPrinciples = principlesBefore;
  merged.seasons = seasonsBefore;

  const saved = await input.profiles.saveMerged(merged);
  const claimed = alreadyClaimed
    ? session
    : await input.repository.claimSession!({
        sessionId: session.id,
        userId,
        now,
      });

  await input.profiles.markOnboardingComplete(userId);

  return {
    session: claimed,
    profile: saved,
    alreadyClaimed,
  };
}
