/**
 * System 2 public surface — experience engines consume Living Profile only.
 */
export type {
  AdaptiveHomeModel,
  MissionRecommendation,
  RankedCandidate,
  ReadinessEvidenceHint,
  ReadinessResult,
  ReadinessState,
} from "./types";

export {
  buildAdaptiveHome,
  evaluateReadiness,
  narrowToObjective,
  rankReadinessCandidates,
  recommendNextStep,
} from "./types";

export {
  TRAINING_FOCUS_OPTIONS,
  trainingFocusById,
} from "./training-focus";
export type { TrainingFocusOption } from "./training-focus";

export {
  buildHomeAlternatives,
  canStartTraining,
  isExplorerFromSessionHistory,
  practiceEntryHref,
} from "./home-recommendation";
export type {
  HomeAlternative,
  HomeAlternativeCatalog,
  HomeEntitlement,
  HomeSessionHistory,
} from "./home-recommendation";
