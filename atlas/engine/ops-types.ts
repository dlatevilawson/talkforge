export type OpsStatus = "open" | "in_progress" | "done" | "blocked";
export type Severity = "critical" | "high" | "medium" | "low";
export type HealthTone = "good" | "warn" | "bad" | "neutral";

export type NoteCategory =
  | "Product"
  | "Marketing"
  | "Engineering"
  | "Company"
  | "Future Ideas";

export type SprintState = {
  id: string;
  name: string;
  goal: string;
  status: "active" | "planned" | "complete";
  focus: string[];
};

export type TodayMission = {
  title: string;
  detail: string;
};

export type MilestoneState = {
  id: string;
  title: string;
  detail: string;
  status: OpsStatus;
  progress: number;
};

export type DeploymentStatus = {
  provider: string;
  environment: string;
  status: "healthy" | "degraded" | "unknown";
  url: string;
  message: string;
  tone: HealthTone;
};

export type PriorityItem = {
  rank: number;
  title: string;
  detail: string;
  status: OpsStatus;
};

export type BugItem = {
  id: string;
  title: string;
  detail: string;
  severity: Severity;
  status: OpsStatus;
};

export type QuickAction = {
  id: string;
  label: string;
  href: string;
  description: string;
  external?: boolean;
};

export type OpsLinks = {
  github: string;
  githubPulls: string;
  supabase: string;
  continueBuilding: string;
};

export type AiCostConfig = {
  currency: string;
  estimatedPerForgeTurn: number;
  estimatedPerAtlasBrief: number;
  note: string;
};

export type OpsStateFile = {
  version: string;
  updatedAt: string;
  product: {
    name: string;
    phase: string;
    status: OpsStatus | "in_progress";
  };
  sprint: SprintState;
  todayMission: TodayMission;
  milestone: MilestoneState;
  deployment: Omit<DeploymentStatus, "tone">;
  links: OpsLinks;
  priorities: PriorityItem[];
  bugs: BugItem[];
  aiCost: AiCostConfig;
  quickActions: QuickAction[];
};

export type ProductHealth = {
  sessionsCompleted: number;
  sessionsTotal: number;
  averageScore: number;
  reflectionsSaved: number;
  lastSessionAt: string | null;
  lastScenarioTitle: string | null;
  uniqueUsers: number;
  tone: HealthTone;
  summary: string;
};

export type DatabaseStatus = {
  configured: boolean;
  reachable: boolean;
  backend: "supabase" | "unconfigured";
  profileCount: number | null;
  message: string;
  tone: HealthTone;
};

export type AiUsage = {
  openaiConfigured: boolean;
  forgeTurnsRecent: number;
  sessionsWithCoaching: number;
  averageCoachScore: number;
  estimatedCostUsd: number;
  currency: string;
  message: string;
  tone: HealthTone;
};

export type FounderMetrics = {
  practiceSessions: number;
  averageCoachingScore: number;
  users: number;
  growth: {
    newUsers7d: number;
    sessions7d: number;
    label: string;
  };
  retention: {
    returningUsers: number;
    rate: number;
    label: string;
  };
};

export type RecentSessionRow = {
  id: string;
  scenarioTitle: string;
  startedAt: string;
  completedAt: string | null;
  averageScore: number | null;
  turnCount: number;
  userId: string;
};

export type GithubActivityItem = {
  id: string;
  kind: "commit" | "pull_request" | "issue";
  title: string;
  url: string;
  author: string | null;
  at: string;
};

export type GithubStatus = {
  available: boolean;
  repo: string;
  openPullRequests: number;
  message: string;
  items: GithubActivityItem[];
  tone: HealthTone;
  pullsUrl: string;
  repoUrl: string;
};

export type NextAction = {
  title: string;
  reason: string;
  href: string;
  cta: string;
  urgency: Severity;
};

export type FounderNote = {
  id: string;
  body: string;
  category: NoteCategory;
  createdAt: string;
};

export type DailyFounderBrief = {
  date: string;
  summary: string;
  priorities: string[];
  generatedAt: string;
  source: "openai" | "deterministic";
};

export type MissionControl = {
  sprint: SprintState;
  todayMission: TodayMission;
  topPriority: PriorityItem | null;
  milestone: MilestoneState;
};

export type CompanyHealth = {
  productHealth: ProductHealth;
  openBugs: BugItem[];
  openBugCount: number;
  database: DatabaseStatus;
  github: GithubStatus;
  aiCost: {
    estimatedCostUsd: number;
    currency: string;
    forgeTurnsRecent: number;
    message: string;
    tone: HealthTone;
  };
  deployment: DeploymentStatus;
};

export type FounderOpsSnapshot = {
  generatedAt: string;
  missionControl: MissionControl;
  companyHealth: CompanyHealth;
  founderMetrics: FounderMetrics;
  quickActions: QuickAction[];
  links: OpsLinks;
  notes: FounderNote[];
  brief: DailyFounderBrief;
  /** @deprecated Prefer missionControl / companyHealth; kept for transitional callers */
  sprint: SprintState;
  priorities: PriorityItem[];
  bugs: BugItem[];
  openBugCount: number;
  productHealth: ProductHealth;
  database: DatabaseStatus;
  aiUsage: AiUsage;
  recentSessions: RecentSessionRow[];
  github: GithubStatus;
  nextAction: NextAction;
};
