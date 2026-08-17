/**
 * Row ↔ domain mappers for Assistant Coach session tables (4B.2/4B.3).
 */
import type {
  AssistantCoachMessage,
  AssistantCoachProfileDraft,
  AssistantCoachSession,
  AssistantCoachSessionStatus,
} from "./session-repository.ts";

export type AssistantCoachSessionRow = {
  id: string;
  anon_key_hash: string | null;
  user_id: string | null;
  status: string;
  turn_count: number;
  has_experienced_value: boolean;
  expires_at: string;
  claimed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AssistantCoachMessageRow = {
  id: string;
  session_id: string;
  turn_index: number;
  role: string;
  content: string;
  model_meta: Record<string, unknown> | null;
  created_at: string;
};

export type AssistantCoachDraftRow = {
  session_id: string;
  profile_json: Record<string, unknown> | null;
  version: number;
  updated_at: string;
};

export function mapSessionRow(
  row: AssistantCoachSessionRow
): AssistantCoachSession {
  return {
    id: row.id,
    anonKeyHash: row.anon_key_hash,
    userId: row.user_id,
    status: row.status as AssistantCoachSessionStatus,
    turnCount: row.turn_count,
    hasExperiencedValue: row.has_experienced_value,
    expiresAt: row.expires_at,
    claimedAt: row.claimed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapMessageRow(
  row: AssistantCoachMessageRow
): AssistantCoachMessage {
  return {
    id: row.id,
    sessionId: row.session_id,
    turnIndex: row.turn_index,
    role: row.role as AssistantCoachMessage["role"],
    content: row.content,
    modelMeta: row.model_meta ?? {},
    createdAt: row.created_at,
  };
}

export function mapDraftRow(
  row: AssistantCoachDraftRow
): AssistantCoachProfileDraft {
  return {
    sessionId: row.session_id,
    profileJson: row.profile_json ?? {},
    version: row.version,
    updatedAt: row.updated_at,
  };
}
