"use server";

import { completeBlockAndPrescribeNext, pauseTrainingPlan, resumeTrainingPlan } from "@/lib/journey/server";

export async function pausePlanAction(planId: string): Promise<{ ok: boolean; message?: string }> {
  try { await pauseTrainingPlan(planId); return { ok: true }; }
  catch (error) { return { ok: false, message: error instanceof Error ? error.message : "Could not pause plan" }; }
}

export async function resumePlanAction(planId: string): Promise<{ ok: boolean; message?: string }> {
  try { await resumeTrainingPlan(planId); return { ok: true }; }
  catch (error) { return { ok: false, message: error instanceof Error ? error.message : "Could not resume plan" }; }
}

export async function completeBlockAction(input: { planId: string; programId: string; focusSignal: "purpose" | "perspective" | "composure" | "message" | "adaptability"; goalText: string }): Promise<{ ok: boolean; message?: string }> {
  try { await completeBlockAndPrescribeNext(input); return { ok: true }; }
  catch (error) { return { ok: false, message: error instanceof Error ? error.message : "Could not prescribe next block" }; }
}
