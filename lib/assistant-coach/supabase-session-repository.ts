/**
 * Phase 4B.3 — Supabase service-role adapter for Assistant Coach sessions.
 * Browser/anon clients must never call this; RLS denies non-service roles.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  mapDraftRow,
  mapMessageRow,
  mapSessionRow,
  type AssistantCoachDraftRow,
  type AssistantCoachMessageRow,
  type AssistantCoachSessionRow,
} from "./session-mappers.ts";
import {
  defaultAnonExpiresAt,
  isAnonSessionExpired,
  AssistantCoachUniqueConflictError,
  type AssistantCoachSessionRepository,
  type CreateAssistantCoachSessionInput,
} from "./session-repository.ts";

function isUniqueViolation(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return (
    error.code === "23505" ||
    /duplicate key|unique constraint/i.test(error.message ?? "")
  );
}

export { mapSessionRow, mapMessageRow, mapDraftRow };

export function createSupabaseAssistantCoachSessionRepository(
  client: SupabaseClient = createAdminSupabaseClient()
): AssistantCoachSessionRepository {
  const repository: AssistantCoachSessionRepository = {
    async createSession(input: CreateAssistantCoachSessionInput) {
      if (!input.anonKeyHash) {
        throw new Error("anonKeyHash is required for anonymous sessions.");
      }
      const now = input.now ?? new Date();
      const ttlDays = input.ttlDays;
      const expiresAt = defaultAnonExpiresAt(now, ttlDays).toISOString();
      const insertPayload: Record<string, unknown> = {
        anon_key_hash: input.anonKeyHash,
        user_id: null,
        status: "active",
        turn_count: 0,
        has_experienced_value: false,
        expires_at: expiresAt,
        claimed_at: null,
      };
      if (input.id) insertPayload.id = input.id;

      const { data, error } = await client
        .from("assistant_coach_sessions")
        .insert(insertPayload)
        .select("*")
        .single();

      if (error) {
        if (isUniqueViolation(error)) {
          // Expected concurrency only — mint layer may adopt the winner.
          throw new AssistantCoachUniqueConflictError(input.anonKeyHash);
        }
        throw new Error(
          `assistant_coach_sessions insert failed: ${error.message}`
        );
      }

      const session = mapSessionRow(data as AssistantCoachSessionRow);

      const { error: draftError } = await client
        .from("assistant_coach_profile_drafts")
        .upsert(
          {
            session_id: session.id,
            profile_json: input.profileJson ?? {},
            version: 1,
            updated_at: session.createdAt,
          },
          { onConflict: "session_id" }
        );
      if (draftError) {
        // Roll back the session row so a retry with the same Idempotency-Key
        // does not adopt an incomplete session (no draft).
        const { error: cleanupError } = await client
          .from("assistant_coach_sessions")
          .delete()
          .eq("id", session.id);
        const cleanupNote = cleanupError
          ? ` (session cleanup also failed: ${cleanupError.message})`
          : "";
        throw new Error(
          `assistant_coach_profile_drafts insert failed: ${draftError.message}${cleanupNote}`
        );
      }

      return session;
    },

    async getSession(sessionId) {
      const { data, error } = await client
        .from("assistant_coach_sessions")
        .select("*")
        .eq("id", sessionId)
        .maybeSingle();
      if (error) {
        throw new Error(
          `assistant_coach_sessions read failed: ${error.message}`
        );
      }
      return data ? mapSessionRow(data as AssistantCoachSessionRow) : null;
    },

    async getSessionByAnonKeyHash(anonKeyHash) {
      const { data, error } = await client
        .from("assistant_coach_sessions")
        .select("*")
        .eq("anon_key_hash", anonKeyHash)
        .in("status", ["active", "gated"])
        .is("user_id", null)
        .maybeSingle();
      if (error) {
        throw new Error(
          `assistant_coach_sessions anon lookup failed: ${error.message}`
        );
      }
      return data ? mapSessionRow(data as AssistantCoachSessionRow) : null;
    },

    async listMessages(sessionId) {
      const { data, error } = await client
        .from("assistant_coach_messages")
        .select("*")
        .eq("session_id", sessionId)
        .order("turn_index", { ascending: true });
      if (error) {
        throw new Error(
          `assistant_coach_messages list failed: ${error.message}`
        );
      }
      return (data as AssistantCoachMessageRow[] | null)?.map(mapMessageRow) ?? [];
    },

    async appendMessage(message) {
      const { data, error } = await client
        .from("assistant_coach_messages")
        .insert({
          id: message.id,
          session_id: message.sessionId,
          turn_index: message.turnIndex,
          role: message.role,
          content: message.content,
          model_meta: message.modelMeta ?? {},
          created_at: message.createdAt,
        })
        .select("*")
        .single();
      if (error) {
        throw new Error(
          `assistant_coach_messages insert failed: ${error.message}`
        );
      }
      if (message.role === "user") {
        const current = await repository.getSession(message.sessionId);
        if (current) {
          await client
            .from("assistant_coach_sessions")
            .update({
              turn_count: current.turnCount + 1,
              updated_at: new Date().toISOString(),
            })
            .eq("id", message.sessionId);
        }
      }
      return mapMessageRow(data as AssistantCoachMessageRow);
    },

    async getDraft(sessionId) {
      const { data, error } = await client
        .from("assistant_coach_profile_drafts")
        .select("*")
        .eq("session_id", sessionId)
        .maybeSingle();
      if (error) {
        throw new Error(
          `assistant_coach_profile_drafts read failed: ${error.message}`
        );
      }
      return data ? mapDraftRow(data as AssistantCoachDraftRow) : null;
    },

    async saveDraft(draft) {
      const updatedAt = draft.updatedAt ?? new Date().toISOString();
      const { data, error } = await client
        .from("assistant_coach_profile_drafts")
        .upsert(
          {
            session_id: draft.sessionId,
            profile_json: draft.profileJson,
            version: draft.version,
            updated_at: updatedAt,
          },
          { onConflict: "session_id" }
        )
        .select("*")
        .single();
      if (error) {
        throw new Error(
          `assistant_coach_profile_drafts save failed: ${error.message}`
        );
      }
      return mapDraftRow(data as AssistantCoachDraftRow);
    },

    async markExpiredIfPast(sessionId, now = new Date()) {
      const session = await repository.getSession(sessionId);
      if (!session) return null;
      // Never overwrite claimed / handed_off / member-linked rows.
      if (session.userId != null) {
        return session;
      }
      if (session.status !== "active" && session.status !== "gated") {
        return session;
      }
      if (!isAnonSessionExpired(session, now)) {
        return session;
      }
      const { data, error } = await client
        .from("assistant_coach_sessions")
        .update({
          status: "expired",
          updated_at: now.toISOString(),
        })
        .eq("id", sessionId)
        .eq("status", session.status)
        .is("user_id", null)
        .select("*")
        .maybeSingle();
      if (error) {
        throw new Error(
          `assistant_coach_sessions expire failed: ${error.message}`
        );
      }
      return data ? mapSessionRow(data as AssistantCoachSessionRow) : session;
    },
  };
  return repository;
}
