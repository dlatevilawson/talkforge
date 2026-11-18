import {
  ASSESSMENT_SLOT_ORDER,
  startAssessmentLifecycle,
  type AssessmentLifecycleState,
  type AssessmentSnapshot,
} from "./assessment-lifecycle.ts";

/**
 * Rehydrate accepted assessment evidence from the server-persisted snapshot.
 * The frozen slot catalog and lifecycle transitions remain unchanged; consent
 * is preserved and nextSlot() naturally advances to the first pending slot.
 */
export function resumeAssessmentLifecycle(
  snapshot: AssessmentSnapshot | null,
  dailyMinutes: 5 | 10 | 15 | null
): AssessmentLifecycleState {
  const state = startAssessmentLifecycle();
  if (snapshot) {
    for (const id of ASSESSMENT_SLOT_ORDER) {
      const answer = snapshot.answers[id]?.trim();
      if (!answer) continue;
      state.slots[id] = {
        id,
        status: "filled",
        answer,
        source: snapshot.answerSources?.[id] === "synthesized" ? "synthesized" : "user",
      };
    }
    state.consented = snapshot.consented;
    state.substantiveUserAnswers = Object.values(state.slots).filter(
      (slot) => slot.status === "filled" && slot.source === "user" && !(dailyMinutes !== null && slot.id === "practice_time")
    ).length;
  }
  if (dailyMinutes !== null) {
    state.slots.practice_time = {
      id: "practice_time",
      status: "filled",
      answer: `${dailyMinutes} minutes each day`,
      source: "user",
    };
  }
  state.currentSlot = null;
  state.assessmentStatus = "active";
  state.finalResponseRequested = false;
  state.finalResponseDelivered = false;
  state.responsesLocked = false;
  return state;
}
