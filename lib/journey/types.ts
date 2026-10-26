import type { Drill, DrillSignal } from "@/lib/drills/catalog";

export type TrainingPlanKind = "6_week" | "6_month";
export type TrainingPlanStatus = "active" | "paused" | "completed" | "cancelled";
export type ProgramDayStatus = "pending" | "done" | "skipped";

export type TrainingPlan = {
  id: string;
  memberId: string;
  kind: TrainingPlanKind;
  occasionText: string;
  occasionDate: string | null;
  startsOn: string;
  endsOn: string;
  status: TrainingPlanStatus;
  currentBlockNumber: number;
};

export type JourneyDay = {
  id: string;
  programId: string;
  dayIndex: number;
  date: string;
  status: ProgramDayStatus;
  fieldAssignmentText: string;
  drill: Drill;
};

export type TodayJourney = {
  plan: TrainingPlan;
  blockNumber: number;
  focusSignal: DrillSignal;
  goalText: string;
  day: JourneyDay;
  tomorrow: JourneyDay | null;
  voiceResetDate: string | null;
};
