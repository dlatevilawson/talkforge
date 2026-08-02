/**
 * System 2 public surface — experience engines consume Living Profile only.
 */
export type {
  AdaptiveHomeModel,
  MissionRecommendation,
  ReadinessResult,
  ReadinessState,
} from "./types";

export { buildAdaptiveHome, evaluateReadiness } from "./types";
