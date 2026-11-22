"use server";

import { completeBlockAndPrescribeNext, pauseTrainingPlan, resumeTrainingPlan, updateTrainingPlanDailyMinutes } from "@/lib/journey/server";
import { safeJourneyAction } from "@/lib/journey/check-in";

export async function pausePlanAction(planId: string): Promise<{ ok: boolean; message?: string }> {
  try { await pauseTrainingPlan(planId); return { ok: true }; }
  catch (error) { return { ok: false, message: error instanceof Error ? error.message : "Could not pause plan" }; }
}

export async function resumePlanAction(planId: string): Promise<{ ok: boolean; message?: string }> {
  try { await resumeTrainingPlan(planId); return { ok: true }; }
  catch (error) { return { ok: false, message: error instanceof Error ? error.message : "Could not resume plan" }; }
}

export async function completeBlockAction(input: { planId: string; programId: string; focusSignal: "purpose" | "perspective" | "composure" | "message" | "adaptability"; goalText: string }): Promise<{ ok: boolean; message?: string }> {
  const result = await safeJourneyAction(
    () => completeBlockAndPrescribeNext(input),
    "Could not start the next block. Please try again.",
  );
  if (!result.ok) return result;
  return result.value.alreadyComplete
    ? { ok: true, message: "This block is already complete — your next block is ready." }
    : { ok: true };
}

export async function updateDailyMinutesAction(planId: string, dailyMinutes: number): Promise<{ ok: boolean; message?: string }> {
  const result = await safeJourneyAction(
    () => updateTrainingPlanDailyMinutes(planId, dailyMinutes),
    "Could not save your practice time. Please try again.",
  );
  return result.ok ? { ok: true } : result;
}
