export type ForgeCoaching = {
  score: number;
  clarity: number;
  confidence: number;
  warmth: number;
  curiosity: number;
  doneWell: string;
  improve: string;
  /** Why the improvement matters for the target event (FLA-001). */
  whyItMatters?: string;
  /** Observed behavior cited (FLA-001 evidence rule). */
  evidence?: string;
  rewrite: string;
};

/** User-visible upcoming conversation (FLA-001: Events Are the Interface). */
export type ForgeEvent = {
  id: string;
  userId: string;
  /** V1 wedge class */
  eventType: "technical_interview";
  track: "system_design" | "behavioral_tech" | "coding_interview";
  title: string;
  whenLabel: string;
  audience: string;
  successCriteria: string;
  companyContext?: string;
  createdAt: string;
};

export type RealityStatus = "happened" | "partial" | "postponed";

/** Reality capture after a real conversation (FLA-001 / PPS-001). */
export type RealityCapture = {
  id: string;
  userId: string;
  sessionId: string;
  eventId?: string;
  status: RealityStatus;
  postponeReason?: string;
  wentBetter: string;
  brokeUnderPressure: string;
  replayMoment: string;
  outcomeSignal: "advanced" | "rejected" | "unclear" | "na";
  readinessBefore?: number;
  readinessAfter?: number;
  createdAt: string;
};

export type ConversationTurn =
  | { role: "user" | "npc"; text: string }
  | { role: "forge"; coaching: ForgeCoaching };

export type TalkForgeUser = {
  id: string;
  displayName: string;
  createdAt: string;
};

export type PracticeSession = {
  id: string;
  userId: string;
  scenarioId: string;
  scenarioTitle: string;
  missionPrompt: string;
  startedAt: string;
  completedAt?: string;
  turns: ConversationTurn[];
  averageScore?: number;
};

export type Reflection = {
  sessionId: string;
  userId: string;
  wentWell: string;
  improveNext: string;
  createdAt: string;
  coachSatisfaction?: number;
};

export type ProgressSummary = {
  sessionsCompleted: number;
  averageScore: number;
  lastSessionAt: string | null;
  lastScenarioTitle: string | null;
};

/** Transfer funnel counters (North Star instrumentation — PPS-001). */
export type TransferSummary = {
  eventsNamed: number;
  sessionsLinkedToEvents: number;
  realityCaptures: number;
  conversationsAttempted: number;
};
