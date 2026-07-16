export type ForgeCoaching = {
  score: number;
  clarity: number;
  confidence: number;
  warmth: number;
  curiosity: number;
  doneWell: string;
  improve: string;
  rewrite: string;
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
