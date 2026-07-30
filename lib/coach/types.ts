/** Durable per-session coaching report written to Supabase. */
export type SessionReport = {
  sessionId: string;
  userId: string;
  sessionNumber: number;
  modality: "voice" | "text";
  durationSeconds: number | null;
  overallScore: number | null;
  confidence: number | null;
  empathy: number | null;
  listening: number | null;
  clarity: number | null;
  storytelling: number | null;
  negotiation: number | null;
  leadership: number | null;
  questionsAsked: number;
  interruptions: number;
  fillerWords: number;
  breakthrough: string;
  biggestWeakness: string;
  homework: string;
  coachSummary: string;
  transcript: Array<{ role: "user" | "coach"; text: string }>;
  createdAt: string;
  /** Joined from practice_sessions when available */
  scenarioTitle?: string;
  startedAt?: string;
  completedAt?: string;
};

/** Selective relationship memory — only what improves the next conversation. */
export type CoachMemory = {
  userId: string;
  displayName: string;
  occupation: string;
  communicationGoals: string[];
  biggestFears: string[];
  recentWins: string[];
  topicsWorkingOn: string[];
  preferredCoachingStyle: string;
  confidenceLevel: number | null;
  speakingHabits: string[];
  favoriteScenarios: string[];
  pastExercises: string[];
  notes: Record<string, unknown>;
  lastSessionId: string | null;
  lastSessionSummary: string;
  lastScenarioTitle: string;
  sessionsCompleted: number;
  updatedAt: string;
};

export type SkillKey =
  | "confidence"
  | "empathy"
  | "listening"
  | "clarity"
  | "storytelling"
  | "negotiation"
  | "leadership";

export type GrowthSummary = {
  sessionsCompleted: number;
  averageScore: number;
  hoursPracticed: number;
  longestConversationSeconds: number;
  bestScore: number;
  streakDays: number;
  averageFillerWords: number;
  averageSpeakingPaceWpm: number | null;
  skills: Record<SkillKey, number>;
  trend30d: Array<{
    date: string;
    averageScore: number;
    sessions: number;
  }>;
  adaptiveInsight: string | null;
  lastSessionAt: string | null;
  lastScenarioTitle: string | null;
};

/** Compact context injected into Forge prompts. */
export type CoachPromptContext = {
  firstName: string;
  isReturning: boolean;
  sessionsCompleted: number;
  lastScenarioTitle: string;
  lastSessionSummary: string;
  recentWins: string[];
  topicsWorkingOn: string[];
  communicationGoals: string[];
  biggestFears: string[];
  preferredCoachingStyle: string;
  confidenceLevel: number | null;
  speakingHabits: string[];
  adaptiveInsight: string | null;
  welcomeHint: string;
};
