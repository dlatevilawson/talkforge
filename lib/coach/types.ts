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

export type LearningStyle =
  | ""
  | "practice_first"
  | "reflect_first"
  | "example_first"
  | "challenge_first";

/** User-declared life milestone — never invented by Forge. */
export type LifeMilestone = {
  id: string;
  label: string;
  date: string | null;
  note: string;
};

/** Soft real-world commitment remembered for gentle follow-up. */
export type LifeCommitment = {
  id: string;
  text: string;
  plannedFor: string | null;
  status: "open" | "done" | "skipped";
  createdAt: string;
  followedUpAt: string | null;
  source: "user" | "session";
};

/** Selective relationship memory — only what improves the next conversation. */
export type CoachMemory = {
  userId: string;
  displayName: string;
  preferredNickname: string;
  occupation: string;
  communicationGoals: string[];
  longTermChallenges: string[];
  biggestFears: string[];
  recentWins: string[];
  topicsWorkingOn: string[];
  preferredCoachingStyle: string;
  learningStyle: LearningStyle;
  confidenceLevel: number | null;
  biggestStrength: string;
  speakingHabits: string[];
  emotionalTriggers: string[];
  /** Phase 8 — Purpose Alignment (user-declared) */
  northStar: string;
  lifeVision: string;
  personTheyWantToBecome: string;
  compassRelationships: string;
  compassLearning: string;
  compassHealth: string;
  careerGoals: string[];
  familyGoals: string[];
  healthGoals: string[];
  businessGoals: string[];
  learningGoals: string[];
  lifeMilestones: LifeMilestone[];
  commitments: LifeCommitment[];
  lastVisionCheckAt: string | null;
  favoriteScenarios: string[];
  pastExercises: string[];
  notes: Record<string, unknown>;
  lastSessionId: string | null;
  lastSessionSummary: string;
  lastScenarioTitle: string;
  lastSessionAt: string | null;
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
  nickname: string;
  isReturning: boolean;
  sessionsCompleted: number;
  lastScenarioTitle: string;
  lastSessionSummary: string;
  lastSessionAt: string | null;
  recentWins: string[];
  topicsWorkingOn: string[];
  communicationGoals: string[];
  longTermChallenges: string[];
  biggestFears: string[];
  emotionalTriggers: string[];
  preferredCoachingStyle: string;
  learningStyle: LearningStyle;
  confidenceLevel: number | null;
  biggestStrength: string;
  speakingHabits: string[];
  adaptiveInsight: string | null;
  welcomeHint: string;
  northStar: string;
  lifeVision: string;
  personTheyWantToBecome: string;
  openCommitment: string;
  purposeBlock: string;
};
