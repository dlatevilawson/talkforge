/**
 * System 1 public surface — BUILD-SYS1-001
 * Storage adapters and UI unify onto these types over Phase A.
 */
export type {
  CoachingIntensity,
  ConversationLifecycleStatus,
  EvidenceSourceKind,
  IdentityWriteAuthority,
  LifeSeason,
  LivingProfile,
  MatteringConversation,
  PersonalPrinciple,
  ProvenanceRecord,
  SeasonKind,
} from "./types";

export {
  canWriteLivingProfileField,
  CONVERSATION_LIFECYCLE_ORDER,
} from "./types";
