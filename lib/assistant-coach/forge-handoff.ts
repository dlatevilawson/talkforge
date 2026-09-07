import {
  buildForgePracticeContext,
  type ForgePracticeContext,
} from "./practice-profile.ts";

export const COACH_WIZARD_HANDOFF_SOURCE = "coach_wizard";
export const COACH_WIZARD_PRACTICE_DESTINATION =
  "/app/practice?source=coach_wizard&start=1";

export function isCoachWizardHandoffSource(
  value: unknown
): value is typeof COACH_WIZARD_HANDOFF_SOURCE {
  return value === COACH_WIZARD_HANDOFF_SOURCE;
}

export function resolveCoachWizardPracticeContext(input: {
  source: unknown;
  mode: "practice" | "assessment";
  memberPracticeProfile: unknown;
}): ForgePracticeContext | null {
  if (
    input.mode !== "practice" ||
    !isCoachWizardHandoffSource(input.source)
  ) {
    return null;
  }
  return buildForgePracticeContext(input.memberPracticeProfile);
}
