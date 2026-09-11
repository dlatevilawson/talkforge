export const FORGE_CUE_KINDS = [
  "upcoming_conversation",
  "practice_follow_up",
  "homework",
] as const;

export type ForgeCueKind = (typeof FORGE_CUE_KINDS)[number];

export const FORGE_CUE_STATUSES = [
  "active",
  "paused",
  "consumed",
  "cancelled",
] as const;

export type ForgeCueStatus = (typeof FORGE_CUE_STATUSES)[number];

export const FORGE_ACTION_STATUSES = [
  "pending_approval",
  "approved",
  "denied",
  "expired",
  "delivered",
  "failed",
] as const;

export type ForgeActionStatus = (typeof FORGE_ACTION_STATUSES)[number];

export const FORGE_AGENT_CHANNEL = "in_app" as const;

export type ForgeAgentChannel = typeof FORGE_AGENT_CHANNEL;

export type ForgeQuietHours = {
  start?: string;
  end?: string;
} | null;

export type ForgeCheckInPayload = {
  whySent: string;
  body: string;
  practiceHref: string;
};

export type ForgeAgentPreferences = {
  userId: string;
  outreachEnabled: boolean;
  channel: ForgeAgentChannel;
  quietHours: ForgeQuietHours;
  deniedCueClasses: ForgeCueKind[];
  createdAt: string;
  updatedAt: string;
};

export type ForgeCue = {
  id: string;
  userId: string;
  kind: ForgeCueKind;
  title: string;
  successCriteria: string | null;
  dueAt: string;
  source: "member" | "session";
  sourceSessionId: string | null;
  status: ForgeCueStatus;
  createdAt: string;
  updatedAt: string;
};

export type ForgeAgentAction = {
  id: string;
  userId: string;
  cueId: string;
  actionType: "in_app_checkin";
  status: ForgeActionStatus;
  payload: ForgeCheckInPayload;
  approvedAt: string | null;
  deniedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateForgeCueInput = {
  kind: ForgeCueKind;
  title: string;
  successCriteria?: string | null;
  dueAt: string;
};

export type PatchForgeCueInput = {
  status: Extract<ForgeCueStatus, "active" | "paused" | "cancelled">;
};

export type UpdateForgePreferencesInput = {
  outreachEnabled?: boolean;
  quietHours?: ForgeQuietHours;
};

export const FORGE_AGENT_WRITE_TABLES = [
  "forge_agent_preferences",
  "forge_cues",
  "forge_agent_actions",
] as const;

export const FORGE_AGENT_FORBIDDEN_WRITE_TABLES = [
  "living_profiles",
  "coach_memory",
] as const;
