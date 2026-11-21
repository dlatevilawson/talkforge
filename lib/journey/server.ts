import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { evaluatePracticeEntitlement } from "@/lib/billing/entitlements";
import { STARTER_DRILLS, type Drill, type DrillPhase, type DrillSignal } from "@/lib/drills/catalog";
import { generateBlockDays, planEndDate } from "./generator";
import { evaluateBlockCompletion, nextBlockStartDate } from "./check-in";
import { initialTrainingPlanRow } from "./daily-minutes";
import type { JourneyDay, TodayJourney, TrainingPlan, TrainingPlanKind } from "./types";

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function mapDrill(row: Record<string, unknown>): Drill {
  const catalog = STARTER_DRILLS.find((drill) => drill.name === row.name);
  const phase = row.phase === "recognise" || row.phase === "build" || row.phase === "rehearse" || row.phase === "roleplay"
    ? row.phase as DrillPhase
    : null;
  return {
    id: String(row.id),
    slug: catalog?.slug ?? slugify(String(row.name)),
    name: String(row.name),
    signal: String(row.signal) as DrillSignal,
    phase,
    instructions: String(row.instructions),
    durationMinutes: Number(row.duration_minutes),
    modality: String(row.modality) as Drill["modality"],
    difficulty: Number(row.difficulty) as Drill["difficulty"],
    twoMinuteVersion: String(row.two_minute_version),
    scenarioTags: Array.isArray(row.scenario_tags) ? row.scenario_tags.map(String) : [],
    goodLooksLike: String(row.good_looks_like),
    question: String(row.question),
    workedExample: String(row.worked_example),
  };
}

function mapPlan(row: Record<string, unknown>): TrainingPlan {
  return {
    id: String(row.id),
    memberId: String(row.member_id),
    kind: row.kind as TrainingPlanKind,
    occasionText: String(row.occasion_text ?? ""),
    occasionDate: row.occasion_date ? String(row.occasion_date) : null,
    dailyMinutes: row.daily_minutes === 5 || row.daily_minutes === 10 || row.daily_minutes === 15 ? row.daily_minutes : null,
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

function toProgramDayRow(day: { dayIndex: number; date: string; drillId: string; fieldAssignmentText: string }, programId: string) {
  return {
    program_id: programId,
    day_index: day.dayIndex,
    date: day.date,
    drill_id: day.drillId,
    field_assignment_text: day.fieldAssignmentText,
  };
}

export async function createInitialTrainingPlan(input: {
  kind: TrainingPlanKind;
  occasionText?: string;
  occasionDate?: string;
  focusText?: string;
  dailyMinutes?: number | null;
}): Promise<TrainingPlan> {
  const memberId = await currentUserId();
  const admin = createAdminSupabaseClient();
  const startsOn = new Date().toISOString().slice(0, 10);
  const kind = input.kind;
  const { data: existing } = await admin.from("training_plans").select("*").eq("member_id", memberId).eq("status", "active").maybeSingle();
  if (existing) {
    const { data: activeProgram } = await admin.from("training_programs").select("id").eq("plan_id", existing.id).eq("status", "active").maybeSingle();
    if (activeProgram) {
      const { count } = await admin.from("program_days").select("id", { count: "exact", head: true }).eq("program_id", activeProgram.id);
      if ((count ?? 0) >= 14) return mapPlan(existing as Record<string, unknown>);
      // A failed first attempt can leave an active block with no days. Remove only
      // that incomplete block so retry repairs the plan without creating a second one.
      const { error: repairError } = await admin.from("training_programs").delete().eq("id", activeProgram.id).eq("plan_id", existing.id);
      if (repairError) throw new Error(repairError.message);
    }
  }
  const existingPlan = existing as Record<string, unknown> | null;
  const { data: plan, error: planError } = existingPlan ? { data: existingPlan, error: null } : await admin
    .from("training_plans")
    .insert(initialTrainingPlanRow({ memberId, kind, startsOn, endsOn: planEndDate(kind, startsOn), occasionText: input.occasionText, occasionDate: input.occasionDate, dailyMinutes: input.dailyMinutes }))
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
    selected.map((day) => toProgramDayRow(day, program.id))
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

export async function updateTrainingPlanDailyMinutes(planId: string, value: unknown): Promise<void> {
  const memberId = await currentUserId();
  const minutes = value === null ? null : ([5, 10, 15].includes(Number(value)) ? Number(value) : 5);
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin.from("training_plans").update({ daily_minutes: minutes }).eq("id", planId).eq("member_id", memberId).eq("status", "active").select("id").maybeSingle();
  if (error || !data) throw new Error(error?.message ?? "Active plan not found.");
}

export async function completeBlockAndPrescribeNext(input: { planId: string; programId: string; focusSignal: DrillSignal; goalText: string }): Promise<void> {
  const memberId = await currentUserId();
  const admin = createAdminSupabaseClient();
  const { data: plan, error: planError } = await admin.from("training_plans").select("*").eq("id", input.planId).eq("member_id", memberId).single();
  if (planError || !plan) throw new Error(planError?.message ?? "Plan not found");
  const { data: currentProgram, error: currentProgramError } = await admin
    .from("training_programs")
    .select("id, ends_on, status")
    .eq("id", input.programId)
    .eq("plan_id", input.planId)
    .eq("status", "active")
    .single();
  if (currentProgramError || !currentProgram) throw new Error(currentProgramError?.message ?? "Active block not found");
  const { data: currentDays, error: currentDaysError } = await admin.from("program_days").select("status").eq("program_id", input.programId);
  if (currentDaysError) throw new Error(currentDaysError.message);
  const completion = evaluateBlockCompletion((currentDays ?? []).map((day) => String(day.status)));
  if (!completion.blockComplete || completion.totalDays < 14) throw new Error("Complete every day before starting the check-in.");
  const nextBlock = Number(plan.current_block_number) + 1;
  const totalBlocks = plan.kind === "6_week" ? 3 : 13;
  const { error: doneError } = await admin.from("training_programs").update({ status: "completed" }).eq("id", currentProgram.id).eq("plan_id", input.planId);
  if (doneError) throw new Error(doneError.message);
  if (nextBlock > totalBlocks) {
    const { error } = await admin.from("training_plans").update({ status: "completed" }).eq("id", input.planId);
    if (error) throw new Error(error.message);
    return;
  }
  const startsOn = nextBlockStartDate(String(currentProgram.ends_on));
  const { data: drills, error: drillsError } = await admin.from("drills").select("*").eq("is_active", true);
  if (drillsError) throw new Error(drillsError.message);
  const generated = generateBlockDays({ startDate: startsOn, focusSignal: input.focusSignal, drills: (drills ?? []).map((row) => mapDrill(row as Record<string, unknown>)) });
  const { data: nextProgram, error: nextError } = await admin.from("training_programs").insert({ member_id: memberId, plan_id: input.planId, block_number: nextBlock, focus_signal: input.focusSignal, goal_text: input.goalText, starts_on: startsOn, ends_on: generated.at(-1)?.date, status: "active" }).select("id").single();
  if (nextError || !nextProgram) throw new Error(nextError?.message ?? "Could not create next block");
  const { error: daysError } = await admin.from("program_days").insert(generated.map((day) => toProgramDayRow(day, nextProgram.id)));
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
  const base = { plan: mapPlan(plan as Record<string, unknown>), blockNumber: Number(program.block_number), focusSignal: program.focus_signal as DrillSignal, goalText: String(program.goal_text ?? ""), programId: String(program.id), completedDays: mapped.filter((item) => item.status === "done").length, totalDays: mapped.length, voiceResetDate: null };
  if (!day && mapped.length > 0 && mapped.every((item) => item.status === "done")) {
    return { ...base, status: "block_complete", day: null, tomorrow: null };
  }
  if (!day) return null;
  return { ...base, status: "today", day, tomorrow: mapped.find((item) => item.dayIndex === day.dayIndex + 1) ?? null };
}

export async function getActiveDrill(idOrSlug: string | undefined): Promise<Drill | null> {
  if (!idOrSlug) return null;
  const starter = STARTER_DRILLS.find((drill) => drill.id === idOrSlug || drill.slug === idOrSlug);
  if (starter) return starter;
  const admin = createAdminSupabaseClient();
  const { data, error } = await admin.from("drills").select("*").eq("is_active", true);
  if (error) throw new Error(error.message);
  const row = (data ?? []).find((candidate) => String(candidate.id) === idOrSlug || slugify(String(candidate.name)) === idOrSlug);
  return row ? mapDrill(row as Record<string, unknown>) : null;
}

export async function getLatestDrillTarget(input: { drillId: string; signal: DrillSignal }): Promise<string | null> {
  const memberId = await currentUserId();
  const admin = createAdminSupabaseClient();
  const { data: completions, error } = await admin.from("drill_completions")
    .select("drill_id, next_target, completed_at")
    .eq("member_id", memberId)
    .not("next_target", "is", null)
    .order("completed_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);
  const rows = (completions ?? []).filter((row) => typeof row.next_target === "string" && row.next_target.trim());
  const exact = rows.find((row) => row.drill_id === input.drillId);
  if (exact) return String(exact.next_target).trim();
  if (rows.length === 0) return null;
  const drillIds = [...new Set(rows.map((row) => String(row.drill_id)))];
  const { data: drills, error: drillsError } = await admin.from("drills").select("id, signal").in("id", drillIds);
  if (drillsError) throw new Error(drillsError.message);
  const matchingIds = new Set((drills ?? []).filter((drill) => drill.signal === input.signal).map((drill) => String(drill.id)));
  const sameSignal = rows.find((row) => matchingIds.has(String(row.drill_id)));
  return sameSignal ? String(sameSignal.next_target).trim() : null;
}
