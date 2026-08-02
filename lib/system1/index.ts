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

export type { IdentityEvidenceProposal } from "./proposals";
export { proposeIdentityEvidenceFromReport } from "./proposals";
export { attachPendingProposals, emptyLivingProfile } from "./profile";
export type { MemberLivingProfileInput } from "./member-writes";
export { applyMemberLivingProfileUpdate } from "./member-writes";
export {
  backfillLivingProfileFromCoachMemory,
  livingProfileNeedsBackfill,
} from "./migrate-from-coach-memory";
