/**
 * Phase 4B.2 — Assistant Coach anonymous session repository (schema companion).
 *
 * Types + in-memory repository for unit tests.
 * Production adapter: supabase-session-repository.ts (service_role only).
 * Cookie mint/restore: session-service.ts + /api/assistant-coach/session (4B.3).
 * No turn API / LLM / UI in this module.
 */

export const ASSISTANT_COACH_ANON_TTL_DAYS = 14;

export const ASSISTANT_COACH_SESSION_STATUSES = [
  "active",
  "gated",
  "claimed",
  "expired",
  "handed_off",
] as const;

export type AssistantCoachSessionStatus =
  (typeof ASSISTANT_COACH_SESSION_STATUSES)[number];

export type AssistantCoachMessageRole = "user" | "assistant";

export type AssistantCoachSession = {
  id: string;
  anonKeyHash: string | null;
  userId: string | null;
  status: AssistantCoachSessionStatus;
  turnCount: number;
  hasExperiencedValue: boolean;
  expiresAt: string;
  claimedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AssistantCoachMessage = {
  id: string;
  sessionId: string;
  turnIndex: number;
  role: AssistantCoachMessageRole;
  content: string;
  modelMeta: Record<string, unknown>;
  createdAt: string;
};

export type AssistantCoachProfileDraft = {
  sessionId: string;
  /** LivingProfile-shaped provisional JSON — not living_profiles until claim. */
  profileJson: Record<string, unknown>;
  version: number;
  updatedAt: string;
};

export type CreateAssistantCoachSessionInput = {
  id?: string;
  anonKeyHash: string;
  now?: Date;
  ttlDays?: number;
  profileJson?: Record<string, unknown>;
};

/**
 * Thrown only when createSession hits the active/gated anon_key_hash unique
 * constraint (expected concurrency). Other persistence failures must not use
 * this type — callers must not treat them as safe adopt/restore races.
 */
export class AssistantCoachUniqueConflictError extends Error {
  readonly code = "AC_ANON_KEY_UNIQUE_CONFLICT";
  readonly anonKeyHash: string;

  constructor(anonKeyHash: string, message?: string) {
    super(
      message ??
        "anon_key_hash already has an active/gated Assistant Coach session."
    );
    this.name = "AssistantCoachUniqueConflictError";
    this.anonKeyHash = anonKeyHash;
  }
}

export function isAssistantCoachUniqueConflictError(
  err: unknown
): err is AssistantCoachUniqueConflictError {
  return (
    err instanceof AssistantCoachUniqueConflictError ||
    (typeof err === "object" &&
      err !== null &&
      (err as { code?: string }).code === "AC_ANON_KEY_UNIQUE_CONFLICT")
  );
}

export type AssistantCoachSessionRepository = {
  createSession(
    input: CreateAssistantCoachSessionInput
  ): Promise<AssistantCoachSession>;
  getSession(sessionId: string): Promise<AssistantCoachSession | null>;
  getSessionByAnonKeyHash(
    anonKeyHash: string
  ): Promise<AssistantCoachSession | null>;
  listMessages(sessionId: string): Promise<AssistantCoachMessage[]>;
  appendMessage(
    message: Omit<AssistantCoachMessage, "id" | "createdAt"> & {
      id?: string;
      createdAt?: string;
    }
  ): Promise<AssistantCoachMessage>;
  getDraft(sessionId: string): Promise<AssistantCoachProfileDraft | null>;
  saveDraft(
    draft: Omit<AssistantCoachProfileDraft, "updatedAt"> & { updatedAt?: string }
  ): Promise<AssistantCoachProfileDraft>;
  markExpiredIfPast(sessionId: string, now?: Date): Promise<AssistantCoachSession | null>;
};

function newId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function defaultAnonExpiresAt(
  now: Date = new Date(),
  ttlDays: number = ASSISTANT_COACH_ANON_TTL_DAYS
): Date {
  return new Date(now.getTime() + ttlDays * 24 * 60 * 60 * 1000);
}

export function isAnonSessionExpired(
  session: Pick<AssistantCoachSession, "status" | "expiresAt">,
  now: Date = new Date()
): boolean {
  if (session.status === "expired") return true;
  return new Date(session.expiresAt).getTime() <= now.getTime();
}

/**
 * In-memory repository mirroring 4B.2 table semantics for unit tests.
 * Not a production store — 4B.3+ will add a Supabase service-role adapter.
 */
export function createMemoryAssistantCoachSessionRepository(): AssistantCoachSessionRepository {
  const sessions = new Map<string, AssistantCoachSession>();
  const messages = new Map<string, AssistantCoachMessage[]>();
  const drafts = new Map<string, AssistantCoachProfileDraft>();
  const activeAnon = new Map<string, string>();

  return {
    async createSession(input) {
      const now = input.now ?? new Date();
      const ttlDays = input.ttlDays ?? ASSISTANT_COACH_ANON_TTL_DAYS;
      if (!input.anonKeyHash) {
        throw new Error("anonKeyHash is required for anonymous sessions.");
      }
      if (activeAnon.has(input.anonKeyHash)) {
        throw new AssistantCoachUniqueConflictError(input.anonKeyHash);
      }
      const iso = now.toISOString();
      const session: AssistantCoachSession = {
        id: input.id ?? newId("acs"),
        anonKeyHash: input.anonKeyHash,
        userId: null,
        status: "active",
        turnCount: 0,
        hasExperiencedValue: false,
        expiresAt: defaultAnonExpiresAt(now, ttlDays).toISOString(),
        claimedAt: null,
        createdAt: iso,
        updatedAt: iso,
      };
      sessions.set(session.id, session);
      activeAnon.set(input.anonKeyHash, session.id);
      messages.set(session.id, []);
      drafts.set(session.id, {
        sessionId: session.id,
        profileJson: input.profileJson ?? {},
        version: 1,
        updatedAt: iso,
      });
      return structuredClone(session);
    },

    async getSession(sessionId) {
      const row = sessions.get(sessionId);
      return row ? structuredClone(row) : null;
    },

    async getSessionByAnonKeyHash(anonKeyHash) {
      const id = activeAnon.get(anonKeyHash);
      if (!id) return null;
      const row = sessions.get(id);
      if (!row) return null;
      // Anonymous restore surface: active/gated + unclaimed only.
      if (row.userId != null) return null;
      if (row.status !== "active" && row.status !== "gated") return null;
      return structuredClone(row);
    },

    async listMessages(sessionId) {
      const rows = messages.get(sessionId) ?? [];
      return structuredClone(rows).sort((a, b) => a.turnIndex - b.turnIndex);
    },

    async appendMessage(message) {
      if (!sessions.has(message.sessionId)) {
        throw new Error("session not found");
      }
      const list = messages.get(message.sessionId) ?? [];
      if (
        list.some(
          (m) => m.turnIndex === message.turnIndex && m.role === message.role
        )
      ) {
        throw new Error("duplicate (session_id, turn_index, role)");
      }
      const row: AssistantCoachMessage = {
        id: message.id ?? newId("acm"),
        sessionId: message.sessionId,
        turnIndex: message.turnIndex,
        role: message.role,
        content: message.content,
        modelMeta: message.modelMeta ?? {},
        createdAt: message.createdAt ?? new Date().toISOString(),
      };
      list.push(row);
      messages.set(message.sessionId, list);
      const session = sessions.get(message.sessionId)!;
      if (message.role === "user") {
        session.turnCount += 1;
        session.updatedAt = new Date().toISOString();
        sessions.set(session.id, session);
      }
      return structuredClone(row);
    },

    async getDraft(sessionId) {
      const row = drafts.get(sessionId);
      return row ? structuredClone(row) : null;
    },

    async saveDraft(draft) {
      if (!sessions.has(draft.sessionId)) {
        throw new Error("session not found");
      }
      const row: AssistantCoachProfileDraft = {
        sessionId: draft.sessionId,
        profileJson: draft.profileJson,
        version: draft.version,
        updatedAt: draft.updatedAt ?? new Date().toISOString(),
      };
      drafts.set(draft.sessionId, row);
      return structuredClone(row);
    },

    async markExpiredIfPast(sessionId, now = new Date()) {
      const session = sessions.get(sessionId);
      if (!session) return null;
      // Never overwrite claimed / handed_off / member-linked rows.
      if (session.userId != null) {
        return structuredClone(session);
      }
      if (session.status !== "active" && session.status !== "gated") {
        return structuredClone(session);
      }
      if (!isAnonSessionExpired(session, now)) {
        return structuredClone(session);
      }
      if (session.anonKeyHash && activeAnon.get(session.anonKeyHash) === session.id) {
        activeAnon.delete(session.anonKeyHash);
      }
      session.status = "expired";
      session.updatedAt = now.toISOString();
      sessions.set(session.id, session);
      return structuredClone(session);
    },
  };
}
