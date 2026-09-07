/**
 * Phase 4B.3 — Supabase service-role adapter for Assistant Coach sessions.
 * Browser/anon clients must never call this; RLS denies non-service roles.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import {
  mapDraftRow,
  mapSessionRow,
  type AssistantCoachDraftRow,
  type AssistantCoachSessionRow,
} from "./session-mappers.ts";
import {
  defaultAnonExpiresAt,
  isAnonSessionExpired,
  AssistantCoachDraftConflictError,
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

export { mapSessionRow, mapDraftRow };

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
        // Historical recovery only: `gated` shares the deployed unique index.
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

    async normalizeLegacyGatedSession(sessionId, now = new Date()) {
      const current = await repository.getSession(sessionId);
      if (!current) return null;
      if (
        current.status !== "gated" ||
        current.userId != null ||
        isAnonSessionExpired(current, now)
      ) {
        return current;
      }

      // Historical recovery only. The status/user/TTL predicates prevent this
      // compatibility write from reviving or taking ownership of a row.
      const { data, error } = await client
        .from("assistant_coach_sessions")
        .update({ status: "active", updated_at: now.toISOString() })
        .eq("id", sessionId)
        .eq("status", "gated")
        .is("user_id", null)
        .gt("expires_at", now.toISOString())
        .select("*")
        .maybeSingle();
      if (error) {
        throw new Error(
          `assistant_coach_sessions legacy gated recovery failed: ${error.message}`
        );
      }
      if (data) return mapSessionRow(data as AssistantCoachSessionRow);

      // A concurrent request may already have healed or expired the row.
      return repository.getSession(sessionId);
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
      if (draft.expectedVersion != null) {
        const { data, error } = await client
          .from("assistant_coach_profile_drafts")
          .update({
            profile_json: draft.profileJson,
            version: draft.version,
            updated_at: updatedAt,
          })
          .eq("session_id", draft.sessionId)
          .eq("version", draft.expectedVersion)
          .select("*")
          .maybeSingle();
        if (error) {
          throw new Error(
            `assistant_coach_profile_drafts save failed: ${error.message}`
          );
        }
        if (!data) throw new AssistantCoachDraftConflictError();
        return mapDraftRow(data as AssistantCoachDraftRow);
      }
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

    async getSessionByAnonKeyHashForActivation(anonKeyHash) {
      const { data, error } = await client
        .from("assistant_coach_sessions")
        .select("*")
        .eq("anon_key_hash", anonKeyHash)
        .neq("status", "expired")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) {
        throw new Error(
          `assistant_coach_sessions activation lookup failed: ${error.message}`
        );
      }
      return data ? mapSessionRow(data as AssistantCoachSessionRow) : null;
    },

    async getLatestOwnedSessionByUserId(userId) {
      const { data, error } = await client
        .from("assistant_coach_sessions")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "claimed")
        .order("claimed_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) {
        throw new Error(
          `assistant_coach_sessions ownership lookup failed: ${error.message}`
        );
      }
      return data ? mapSessionRow(data as AssistantCoachSessionRow) : null;
    },

    async transferSessionOwnership(input) {
      const current = await repository.getSession(input.sessionId);
      if (!current) throw new Error("session not found");
      const now = input.now ?? new Date();
      if (current.userId === input.userId && current.status === "claimed") {
        return current;
      }
      if (current.userId != null && current.userId !== input.userId) {
        const err = new Error("session owned by another user");
        err.name = "AssistantCoachOwnershipConflictError";
        throw err;
      }
      if (isAnonSessionExpired(current, now)) {
        const err = new Error("session expired");
        err.name = "AssistantCoachOwnershipExpiredError";
        throw err;
      }
      const { data, error } = await client
        .from("assistant_coach_sessions")
        .update({
          user_id: input.userId,
          anon_key_hash: null,
          status: "claimed",
          claimed_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq("id", input.sessionId)
        .is("user_id", null)
        .select("*")
        .maybeSingle();
      if (error) {
        throw new Error(
          `assistant_coach_sessions ownership transfer failed: ${error.message}`
        );
      }
      if (data) {
        return mapSessionRow(data as AssistantCoachSessionRow);
      }
      const raced = await repository.getSession(input.sessionId);
      if (raced?.userId === input.userId && raced.status === "claimed") {
        return raced;
      }
      const err = new Error("session owned by another user");
      err.name = "AssistantCoachOwnershipConflictError";
      throw err;
    },
  };
  return repository;
}
