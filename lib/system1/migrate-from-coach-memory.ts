/**
 * Runtime backfill: member-declared CoachMemory → Living Profile when LP empty.
 * Does not copy session-inferred identity fields (strengths, habits, confidence).
 */
import type { CoachMemory } from "@/lib/coach/types";
import type { LivingProfile } from "@/lib/system1/types";
import { emptyLivingProfile } from "@/lib/system1/profile";
import { applyMemberLivingProfileUpdate } from "@/lib/system1/member-writes";

export function livingProfileNeedsBackfill(profile: LivingProfile | null): boolean {
  if (!profile) return true;
  return (
    !profile.preferredNickname.trim() &&
    !profile.purposeStatement.trim() &&
    profile.personalPrinciples.length === 0 &&
    profile.seasons.length === 0 &&
    !profile.preferredCoachingStyle.trim()
  );
}

export function backfillLivingProfileFromCoachMemory(
  userId: string,
  memory: CoachMemory | null,
  existing: LivingProfile | null
): LivingProfile {
  const base =
    existing ?? emptyLivingProfile(userId, memory?.displayName ?? "");
  if (!memory) return base;
  if (!livingProfileNeedsBackfill(base)) {
    if (!base.displayName.trim() && memory.displayName.trim()) {
      return { ...base, displayName: memory.displayName };
    }
    return base;
  }

  const goals = memory.communicationGoals.filter(Boolean);
  const [purpose, ...principleLines] = goals;

  return applyMemberLivingProfileUpdate(base, {
    displayName: memory.displayName || base.displayName,
    preferredNickname: memory.preferredNickname,
    purposeStatement: purpose ?? "",
    principleLines,
    seasonLabels: memory.longTermChallenges.filter(Boolean),
    preferredCoachingStyle: memory.preferredCoachingStyle,
  });
}
