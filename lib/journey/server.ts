import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { evaluatePracticeEntitlement } from "@/lib/billing/entitlements";
import { STARTER_DRILLS, type Drill, type DrillSignal } from "@/lib/drills/catalog";
import { generateBlockDays, planEndDate } from "./generator";
import type { JourneyDay, TodayJourney, TrainingPlan, TrainingPlanKind } from "./types";

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function mapDrill(row: Record<string, unknown>): Drill {
  const catalog = STARTER_DRILLS.find((drill) => drill.name === row.name);
  return {
    id: String(row.id),
    slug: catalog?.slug ?? slugify(String(row.name)),
    name: String(row.name),
    signal: String(row.signal) as DrillSignal,
    instructions: String(row.instructions),
    durationMinutes: Number(row.duration_minutes),
    modality: String(row.modality) as Drill["modality"],
    difficulty: Number(row.difficulty) as Drill["difficulty"],
    twoMinuteVersion: String(row.two_minute_version),
    scenarioTags: Array.isArray(row.scenario_tags) ? row.scenario_tags.map(String) : [],
    goodLooksLike: String(row.good_looks_like),
  };
}

function mapPlan(row: Record<string, unknown>): TrainingPlan {
  return {
    id: String(row.id),
    memberId: String(row.member_id),
    kind: row.kind as TrainingPlanKind,
    occasionText: String(row.occasion_text ?? ""),
    occasionDate: row.occasion_date ? String(row.occasion_date) : null,
    startsOn: String(row.starts_on),
    endsOn: String(row.ends_on),
    status: row.status as TrainingPlan["status"],
    currentBlockNumber: Number(row.current_block_number),
  };
}

async function currentUserId(): Promise<string> {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Please sign in again.");
  return user.id;
}

function focusFromText(value: string): DrillSignal {
  const text = value.toLowerCase();
  if (/boundar|conflict|emotion|calm|interrupt/.test(text)) return "composure";
  if (/interview|pitch|clarity|message/.test(text)) return "message";
  if (/negotiat|perspective|feedback/.test(text)) return "perspective";
  return "purpose";
}

export async function createInitialTrainingPlan(input: {
  kind: TrainingPlanKind;
  occasionText?: string;
  occasionDate?: string;
  focusText?: string;
}): Promise<TrainingPlan> {
  const memberId = await currentUserId();
  const admin = createAdminSupabaseClient();
  const startsOn = new Date().toISOString().slice(0, 10);
  const kind = input.kind;
  const { data: existing } = await admin.from("training_plans").select("*").eq("member_id", memberId).eq("status", "active").maybeSingle();
  if (existing) return mapPlan(existing as Record<string, unknown>);
  const { data: plan, error: planError } = await admin
    .from("training_plans")
    .insert({
      member_id: memberId,
      kind,
      occasion_text: (input.occasionText ?? "").trim().slice(0, 240),
      occasion_date: input.occasionDate || null,
      starts_on: startsOn,
      ends_on: planEndDate(kind, startsOn),
      current_block_number: 1,
      status: "active",
    })
    .select("*")
    .single();
  if (planError || !plan) throw new Error(planError?.message ?? "Could not create training plan.");

  const drillsResult = await admin.from("drills").select("*").eq("is_active", true);
  if (drillsResult.error) throw new Error(drillsResult.error.message);
  const drills = (drillsResult.data ?? []).map((row) => mapDrill(row as Record<string, unknown>));
  const focusSignal = focusFromText(input.focusText ?? "");
  const entitlement = await evaluatePracticeEntitlement(memberId);
  const voiceSlots = entitlement.plan === "free" ? Math.max(0, entitlement.sessionsRemaining ?? 0) : Number.POSITIVE_INFINITY;
  const selected = generateBlockDays({
    startDate: startsOn,
    focusSignal,
    drills,
    occasionText: input.occasionText,
    voiceSlots,
  });
  const { data: program, error: programError } = await admin
    .from("training_programs")
    .insert({
      member_id: memberId,
      plan_id: plan.id,
      block_number: 1,
      focus_signal: focusSignal,
      goal_text: input.occasionText?.trim() || `Build your ${focusSignal} under real conversation pressure.`,
      starts_on: startsOn,
      ends_on: selected.at(-1)?.date ?? startsOn,
      status: "active",
    })
    .select("id")
    .single();
  if (programError || !program) throw new Error(programError?.message ?? "Could not create first training block.");
  const { error: daysError } = await admin.from("program_days").insert(
    selected.map((day) => ({ ...day, program_id: program.id }))
  );
  if (daysError) throw new Error(daysError.message);
  return mapPlan(plan as Record<string, unknown>);
}

export async function pauseTrainingPlan(planId: string): Promise<void> {
  const memberId = await currentUserId();
  const admin = createAdminSupabaseClient();
  const { error } = await admin.rpc("pause_training_plan", { p_plan_id: planId, p_member_id: memberId });
  if (error) throw new Error(error.message);
}

export async function resumeTrainingPlan(planId: string): Promise<void> {
  const memberId = await currentUserId();
  const admin = createAdminSupabaseClient();
  const { error } = await admin.rpc("resume_training_plan", { p_plan_id: planId, p_member_id: memberId });
  if (error) throw new Error(error.message);
}

export async function completeBlockAndPrescribeNext(input: { planId: string; programId: string; focusSignal: DrillSignal; goalText: string }): Promise<void> {
  const memberId = await currentUserId();
  const admin = createAdminSupabaseClient();
  const { data: plan, error: planError } = await admin.from("training_plans").select("*").eq("id", input.planId).eq("member_id", memberId).single();
  if (planError || !plan) throw new Error(planError?.message ?? "Plan not found");
  const nextBlock = Number(plan.current_block_number) + 1;
  const totalBlocks = plan.kind === "6_week" ? 3 : 13;
  const { error: doneError } = await admin.from("training_programs").update({ status: "completed" }).eq("id", input.programId).eq("plan_id", input.planId);
  if (doneError) throw new Error(doneError.message);
  if (nextBlock > totalBlocks) {
    const { error } = await admin.from("training_plans").update({ status: "completed" }).eq("id", input.planId);
    if (error) throw new Error(error.message);
    return;
  }
  const start = new Date(`${new Date().toISOString().slice(0, 10)}T00:00:00Z`);
  const startsOn = start.toISOString().slice(0, 10);
  const { data: drills, error: drillsError } = await admin.from("drills").select("*").eq("is_active", true);
  if (drillsError) throw new Error(drillsError.message);
  const generated = generateBlockDays({ startDate: startsOn, focusSignal: input.focusSignal, drills: (drills ?? []).map((row) => mapDrill(row as Record<string, unknown>)) });
  const { data: nextProgram, error: nextError } = await admin.from("training_programs").insert({ member_id: memberId, plan_id: input.planId, block_number: nextBlock, focus_signal: input.focusSignal, goal_text: input.goalText, starts_on: startsOn, ends_on: generated.at(-1)?.date, status: "active" }).select("id").single();
  if (nextError || !nextProgram) throw new Error(nextError?.message ?? "Could not create next block");
  const { error: daysError } = await admin.from("program_days").insert(generated.map((day) => ({ ...day, program_id: nextProgram.id })));
  if (daysError) throw new Error(daysError.message);
  const { error: updateError } = await admin.from("training_plans").update({ current_block_number: nextBlock }).eq("id", input.planId);
  if (updateError) throw new Error(updateError.message);
}

export async function getTodayJourney(): Promise<TodayJourney | null> {
  const memberId = await currentUserId();
  const admin = createAdminSupabaseClient();
  const { data: plan } = await admin.from("training_plans").select("*").eq("member_id", memberId).eq("status", "active").maybeSingle();
  if (!plan) return null;
  const { data: program } = await admin.from("training_programs").select("id, block_number, focus_signal, goal_text, starts_on, ends_on").eq("plan_id", plan.id).eq("status", "active").maybeSingle();
  if (!program) return null;
  const today = new Date().toISOString().slice(0, 10);
  const { data: days } = await admin.from("program_days").select("id, program_id, day_index, date, status, field_assignment_text, drill:drills(*)").eq("program_id", program.id).order("day_index");
  const rows = (days ?? []) as Array<Record<string, unknown>>;
  const mapped = rows.map((row) => ({
    id: String(row.id), programId: String(row.program_id), dayIndex: Number(row.day_index), date: String(row.date),
    status: row.status as JourneyDay["status"], fieldAssignmentText: String(row.field_assignment_text ?? ""),
    drill: mapDrill((Array.isArray(row.drill) ? row.drill[0] : row.drill) as Record<string, unknown>),
  }));
  const day = mapped.find((item) => item.date >= today && item.status !== "done") ?? mapped.find((item) => item.status === "pending");
  if (!day) return null;
  return { plan: mapPlan(plan as Record<string, unknown>), blockNumber: Number(program.block_number), focusSignal: program.focus_signal as DrillSignal, goalText: String(program.goal_text ?? ""), day, tomorrow: mapped.find((item) => item.dayIndex === day.dayIndex + 1) ?? null, voiceResetDate: null };
}
