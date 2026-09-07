import { applyMemberPracticeProfileUpdate } from "../system1/member-writes.ts";
import type { LivingProfile } from "../system1/types.ts";
import { parseMemberPracticeProfile } from "./practice-profile.ts";
import {
  AssistantCoachClaimError,
} from "./claim-merge.ts";
import {
  isAnonSessionExpired,
  type AssistantCoachSession,
  type AssistantCoachSessionRepository,
} from "./session-repository.ts";
import { COACH_WIZARD_PRACTICE_DESTINATION } from "./forge-handoff.ts";

export const COACH_ACTIVATION_DESTINATION =
  COACH_WIZARD_PRACTICE_DESTINATION;

export type ActivationLivingProfileStore = {
  loadOrCreate(userId: string): Promise<LivingProfile>;
  saveIfVersion(
    profile: LivingProfile,
    expectedVersion: number
  ): Promise<LivingProfile | null>;
  markOnboardingComplete(userId: string): Promise<void>;
};

export type ActivateAssistantCoachProfileResult = {
  profile: LivingProfile;
  session: AssistantCoachSession;
  alreadyActive: boolean;
  destination: typeof COACH_ACTIVATION_DESTINATION;
};

function requireActivationMethods(
  repository: AssistantCoachSessionRepository
): void {
  if (
    typeof repository.getSessionByAnonKeyHashForClaim !== "function" ||
    typeof repository.getLatestClaimedSessionByUserId !== "function" ||
    typeof repository.claimSession !== "function"
  ) {
    throw new AssistantCoachClaimError(
      "activation_unavailable",
      "Coach activation is unavailable.",
      503
    );
  }
}

async function resolveSession(
  repository: AssistantCoachSessionRepository,
  anonKeyHash: string | null,
  userId: string
): Promise<AssistantCoachSession | null> {
  const fromCookie = anonKeyHash
    ? await repository.getSessionByAnonKeyHashForClaim!(anonKeyHash)
    : null;
  return (
    fromCookie ??
    (await repository.getLatestClaimedSessionByUserId!(userId))
  );
}

/**
 * Decision 060 activation boundary. Claims only a verified wizard declaration,
 * then writes it through member authority with optimistic concurrency.
 */
export async function activateAssistantCoachProfile(input: {
  repository: AssistantCoachSessionRepository;
  profiles: ActivationLivingProfileStore;
  anonKeyHash: string | null;
  userId: string;
  now?: Date;
}): Promise<ActivateAssistantCoachProfileResult> {
  requireActivationMethods(input.repository);
  const now = input.now ?? new Date();
  let session = await resolveSession(
    input.repository,
    input.anonKeyHash,
    input.userId
  );

  if (!session) {
    throw new AssistantCoachClaimError(
      "activation_required",
      "Return to Coach and verify your profile.",
      404
    );
  }
  if (session.userId && session.userId !== input.userId) {
    throw new AssistantCoachClaimError(
      "activation_unavailable",
      "This Coach profile cannot be activated.",
      409
    );
  }
  if (session.userId == null && isAnonSessionExpired(session, now)) {
    await input.repository.markExpiredIfPast(session.id, now);
    throw new AssistantCoachClaimError(
      "session_expired",
      "This Coach profile has expired. Start again.",
      410
    );
  }

  const draft = await input.repository.getDraft(session.id);
  const verifiedDraft = parseMemberPracticeProfile(
    draft?.profileJson?.memberPracticeProfile
  );
  if (!draft || !verifiedDraft) {
    throw new AssistantCoachClaimError(
      "verified_profile_required",
      "Return to Coach and choose Looks right.",
      409
    );
  }

  const wasClaimed = session.userId === input.userId;
  if (!wasClaimed) {
    try {
      session = await input.repository.claimSession!({
        sessionId: session.id,
        userId: input.userId,
        now,
      });
    } catch {
      throw new AssistantCoachClaimError(
        "activation_unavailable",
        "This Coach profile cannot be activated.",
        409
      );
    }
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const current = await input.profiles.loadOrCreate(input.userId);
    if (parseMemberPracticeProfile(current.memberPracticeProfile)) {
      await input.profiles.markOnboardingComplete(input.userId);
      return {
        profile: current,
        session,
        alreadyActive: true,
        destination: COACH_ACTIVATION_DESTINATION,
      };
    }

    const next = applyMemberPracticeProfileUpdate(
      current,
      {
        topics: verifiedDraft.topics,
        audiences: verifiedDraft.audiences,
        pattern: verifiedDraft.pattern,
        urgency: verifiedDraft.urgency,
      },
      { sourceSessionId: session.id, now }
    );
    const saved = await input.profiles.saveIfVersion(next, current.version);
    if (saved) {
      await input.profiles.markOnboardingComplete(input.userId);
      return {
        profile: saved,
        session,
        alreadyActive: wasClaimed,
        destination: COACH_ACTIVATION_DESTINATION,
      };
    }
  }

  throw new AssistantCoachClaimError(
    "profile_conflict",
    "Your profile changed. Try again.",
    409
  );
}
