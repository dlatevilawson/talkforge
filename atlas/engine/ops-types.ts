export type OpsStatus = "open" | "in_progress" | "done" | "blocked";
export type Severity = "critical" | "high" | "medium" | "low";
export type HealthTone = "good" | "warn" | "bad" | "neutral";

export type SprintState = {
  id: string;
  name: string;
  goal: string;
  status: "active" | "planned" | "complete";
  focus: string[];
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
  priorities: PriorityItem[];
  bugs: BugItem[];
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
  message: string;
  tone: HealthTone;
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
  message: string;
  items: GithubActivityItem[];
  tone: HealthTone;
};

export type NextAction = {
  title: string;
  reason: string;
  href: string;
  cta: string;
  urgency: Severity;
};

export type FounderOpsSnapshot = {
  generatedAt: string;
  sprint: SprintState;
  priorities: PriorityItem[];
  bugs: BugItem[];
  openBugCount: number;
  productHealth: ProductHealth;
  database: DatabaseStatus;
  aiUsage: AiUsage;
  recentSessions: RecentSessionRow[];
  github: GithubStatus;
  quickActions: QuickAction[];
  nextAction: NextAction;
};
