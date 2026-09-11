import type { SupabaseClient } from "@supabase/supabase-js";
import { buildCheckInCopy } from "./copy.ts";
import {
  assertForgeAgentWriteTarget,
  assertMemberNotGuest,
  canMaterializeDueActions,
  ForgeAgentError,
  isForgeCueKind,
  recordDeniedCueClass,
  shouldMaterializeCue,
} from "./policy.ts";
import {
  FORGE_AGENT_CHANNEL,
  type CreateForgeCueInput,
  type ForgeAgentAction,
  type ForgeAgentPreferences,
  type ForgeCheckInPayload,
  type ForgeCue,
  type ForgeCueKind,
  type ForgeQuietHours,
  type PatchForgeCueInput,
  type UpdateForgePreferencesInput,
} from "./types.ts";

export type ForgeAgentRepository = {
  getPreferences(userId: string): Promise<ForgeAgentPreferences>;
  updatePreferences(
    userId: string,
    input: UpdateForgePreferencesInput
  ): Promise<ForgeAgentPreferences>;
  listCues(userId: string): Promise<ForgeCue[]>;
  createCue(userId: string, input: CreateForgeCueInput): Promise<ForgeCue>;
  patchCue(
    userId: string,
    cueId: string,
    input: PatchForgeCueInput
  ): Promise<ForgeCue>;
  listPendingActions(userId: string): Promise<ForgeAgentAction[]>;
  materializeDueActions(
    userId: string,
    now?: Date
  ): Promise<ForgeAgentAction[]>;
  approveAction(userId: string, actionId: string): Promise<ForgeAgentAction>;
  denyAction(userId: string, actionId: string): Promise<ForgeAgentAction>;
};

function nowIso(now?: Date): string {
  return (now ?? new Date()).toISOString();
}

function normalizeTitle(title: unknown): string {
  if (typeof title !== "string") {
    throw new ForgeAgentError("Title is required.");
  }
  const trimmed = title.trim();
  if (!trimmed) throw new ForgeAgentError("Title is required.");
  if (trimmed.length > 200) {
    throw new ForgeAgentError("Title must be 200 characters or fewer.");
  }
  return trimmed;
}

function normalizeSuccess(value: unknown): string | null {
  if (value == null || value === "") return null;
  if (typeof value !== "string") {
    throw new ForgeAgentError("Success criteria must be text.");
  }
  const trimmed = value.trim();
  if (trimmed.length > 400) {
    throw new ForgeAgentError(
      "Success criteria must be 400 characters or fewer."
    );
  }
  return trimmed || null;
}

function normalizeDueAt(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new ForgeAgentError("A due date is required.");
  }
  const due = new Date(value);
  if (Number.isNaN(due.getTime())) {
    throw new ForgeAgentError("Due date is not valid.");
  }
  return due.toISOString();
}

function normalizeKind(value: unknown): ForgeCueKind {
  if (!isForgeCueKind(value)) {
    throw new ForgeAgentError(
      "Kind must be upcoming conversation, practice follow-up, or homework."
    );
  }
  return value;
}

function defaultPreferences(
  userId: string,
  at = nowIso()
): ForgeAgentPreferences {
  return {
    userId,
    outreachEnabled: false,
    channel: FORGE_AGENT_CHANNEL,
    quietHours: null,
    deniedCueClasses: [],
    createdAt: at,
    updatedAt: at,
  };
}

function parseDeniedClasses(value: unknown): ForgeCueKind[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isForgeCueKind);
}

function parseQuietHours(value: unknown): ForgeQuietHours {
  if (!value || typeof value !== "object") return null;
  const record = value as { start?: unknown; end?: unknown };
  const start = typeof record.start === "string" ? record.start : undefined;
  const end = typeof record.end === "string" ? record.end : undefined;
  if (!start && !end) return null;
  return { start, end };
}

function parsePayload(value: unknown): ForgeCheckInPayload {
  const record =
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  return {
    whySent: typeof record.whySent === "string" ? record.whySent : "",
    body: typeof record.body === "string" ? record.body : "",
    practiceHref:
      typeof record.practiceHref === "string" ? record.practiceHref : "",
  };
}

function mapPreferenceRow(row: Record<string, unknown>): ForgeAgentPreferences {
  return {
    userId: String(row.user_id),
    outreachEnabled: Boolean(row.outreach_enabled),
    channel: FORGE_AGENT_CHANNEL,
    quietHours: parseQuietHours(row.quiet_hours),
    deniedCueClasses: parseDeniedClasses(row.denied_cue_classes),
    createdAt: String(row.created_at ?? nowIso()),
    updatedAt: String(row.updated_at ?? nowIso()),
  };
}

function mapCueRow(row: Record<string, unknown>): ForgeCue {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    kind: normalizeKind(row.kind),
    title: String(row.title ?? ""),
    successCriteria:
      typeof row.success_criteria === "string" ? row.success_criteria : null,
    dueAt: String(row.due_at),
    source: row.source === "session" ? "session" : "member",
    sourceSessionId:
      typeof row.source_session_id === "string" ? row.source_session_id : null,
    status: (row.status as ForgeCue["status"]) ?? "active",
    createdAt: String(row.created_at ?? nowIso()),
    updatedAt: String(row.updated_at ?? nowIso()),
  };
}

function mapActionRow(row: Record<string, unknown>): ForgeAgentAction {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    cueId: String(row.cue_id),
    actionType: "in_app_checkin",
    status: (row.status as ForgeAgentAction["status"]) ?? "pending_approval",
    payload: parsePayload(row.payload),
    approvedAt: typeof row.approved_at === "string" ? row.approved_at : null,
    deniedAt: typeof row.denied_at === "string" ? row.denied_at : null,
    deliveredAt: typeof row.delivered_at === "string" ? row.delivered_at : null,
    createdAt: String(row.created_at ?? nowIso()),
    updatedAt: String(row.updated_at ?? nowIso()),
  };
}

export function createMemoryForgeAgentRepository(options?: {
  onWrite?: (table: string) => void;
}): ForgeAgentRepository {
  const prefs = new Map<string, ForgeAgentPreferences>();
  const cues = new Map<string, ForgeCue>();
  const actions = new Map<string, ForgeAgentAction>();
  const write = (table: string) => {
    assertForgeAgentWriteTarget(table);
    options?.onWrite?.(table);
  };

  const getOrCreatePrefs = (userId: string): ForgeAgentPreferences => {
    const existing = prefs.get(userId);
    if (existing) return existing;
    const created = defaultPreferences(userId);
    write("forge_agent_preferences");
    prefs.set(userId, created);
    return created;
  };

  const pendingForUser = (userId: string): ForgeAgentAction[] =>
    [...actions.values()]
      .filter(
        (action) =>
          action.userId === userId && action.status === "pending_approval"
      )
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  return {
    async getPreferences(userId) {
      assertMemberNotGuest(userId);
      return getOrCreatePrefs(userId);
    },
    async updatePreferences(userId, input) {
      assertMemberNotGuest(userId);
      const current = getOrCreatePrefs(userId);
      write("forge_agent_preferences");
      const next: ForgeAgentPreferences = {
        ...current,
        outreachEnabled:
          typeof input.outreachEnabled === "boolean"
            ? input.outreachEnabled
            : current.outreachEnabled,
        quietHours:
          input.quietHours !== undefined
            ? parseQuietHours(input.quietHours)
            : current.quietHours,
        channel: FORGE_AGENT_CHANNEL,
        updatedAt: nowIso(),
      };
      prefs.set(userId, next);
      return next;
    },
    async listCues(userId) {
      assertMemberNotGuest(userId);
      return [...cues.values()]
        .filter((cue) => cue.userId === userId)
        .sort((a, b) => a.dueAt.localeCompare(b.dueAt));
    },
    async createCue(userId, input) {
      assertMemberNotGuest(userId);
      write("forge_cues");
      const at = nowIso();
      const cue: ForgeCue = {
        id: crypto.randomUUID(),
        userId,
        kind: normalizeKind(input.kind),
        title: normalizeTitle(input.title),
        successCriteria: normalizeSuccess(input.successCriteria),
        dueAt: normalizeDueAt(input.dueAt),
        source: "member",
        sourceSessionId: null,
        status: "active",
        createdAt: at,
        updatedAt: at,
      };
      cues.set(cue.id, cue);
      return cue;
    },
    async patchCue(userId, cueId, input) {
      assertMemberNotGuest(userId);
      const cue = cues.get(cueId);
      if (!cue || cue.userId !== userId) {
        throw new ForgeAgentError("Cue not found.", 404, "FORGE_CUE_NOT_FOUND");
      }
      if (cue.status === "consumed") {
        throw new ForgeAgentError("A consumed cue cannot be changed.");
      }
      write("forge_cues");
      const next: ForgeCue = {
        ...cue,
        status: input.status,
        updatedAt: nowIso(),
      };
      cues.set(cueId, next);
      return next;
    },
    async listPendingActions(userId) {
      assertMemberNotGuest(userId);
      return pendingForUser(userId);
    },
    async materializeDueActions(userId, now) {
      assertMemberNotGuest(userId);
      const preferences = getOrCreatePrefs(userId);
      if (!canMaterializeDueActions(preferences)) {
        return pendingForUser(userId);
      }
      for (const cue of cues.values()) {
        if (cue.userId !== userId) continue;
        const hasExistingAction = [...actions.values()].some(
          (action) => action.cueId === cue.id
        );
        if (
          !shouldMaterializeCue({
            cue,
            hasExistingAction,
            outreachEnabled: preferences.outreachEnabled,
            deniedCueClasses: preferences.deniedCueClasses,
            now,
          })
        ) {
          continue;
        }
        write("forge_agent_actions");
        const at = nowIso(now);
        const action: ForgeAgentAction = {
          id: crypto.randomUUID(),
          userId,
          cueId: cue.id,
          actionType: "in_app_checkin",
          status: "pending_approval",
          payload: buildCheckInCopy(cue),
          approvedAt: null,
          deniedAt: null,
          deliveredAt: null,
          createdAt: at,
          updatedAt: at,
        };
        actions.set(action.id, action);
      }
      return pendingForUser(userId);
    },
    async approveAction(userId, actionId) {
      assertMemberNotGuest(userId);
      const action = actions.get(actionId);
      if (!action || action.userId !== userId) {
        throw new ForgeAgentError(
          "Check-in not found.",
          404,
          "FORGE_ACTION_NOT_FOUND"
        );
      }
      if (action.status !== "pending_approval") {
        throw new ForgeAgentError("This check-in is no longer pending.");
      }
      write("forge_agent_actions");
      write("forge_cues");
      const at = nowIso();
      const next: ForgeAgentAction = {
        ...action,
        status: "delivered",
        approvedAt: at,
        deliveredAt: at,
        updatedAt: at,
      };
      actions.set(actionId, next);
      const cue = cues.get(action.cueId);
      if (cue && cue.userId === userId) {
        cues.set(action.cueId, { ...cue, status: "consumed", updatedAt: at });
      }
      return next;
    },
    async denyAction(userId, actionId) {
      assertMemberNotGuest(userId);
      const action = actions.get(actionId);
      if (!action || action.userId !== userId) {
        throw new ForgeAgentError(
          "Check-in not found.",
          404,
          "FORGE_ACTION_NOT_FOUND"
        );
      }
      if (action.status !== "pending_approval") {
        throw new ForgeAgentError("This check-in is no longer pending.");
      }
      const cue = cues.get(action.cueId);
      if (!cue) {
        throw new ForgeAgentError("Cue not found.", 404, "FORGE_CUE_NOT_FOUND");
      }
      write("forge_agent_actions");
      write("forge_cues");
      write("forge_agent_preferences");
      const at = nowIso();
      const next: ForgeAgentAction = {
        ...action,
        status: "denied",
        deniedAt: at,
        updatedAt: at,
      };
      actions.set(actionId, next);
      cues.set(cue.id, { ...cue, status: "cancelled", updatedAt: at });
      const preferences = getOrCreatePrefs(userId);
      prefs.set(userId, {
        ...preferences,
        deniedCueClasses: recordDeniedCueClass(
          preferences.deniedCueClasses,
          cue.kind
        ),
        updatedAt: at,
      });
      return next;
    },
  };
}

export function createSupabaseForgeAgentRepository(
  supabase: SupabaseClient
): ForgeAgentRepository {
  const write = (table: string) => {
    assertForgeAgentWriteTarget(table);
  };

  async function readPreferences(
    userId: string
  ): Promise<ForgeAgentPreferences> {
    const { data, error } = await supabase
      .from("forge_agent_preferences")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) {
      throw new ForgeAgentError("Could not load check-in preferences.", 500);
    }
    if (data) return mapPreferenceRow(data as Record<string, unknown>);
    write("forge_agent_preferences");
    const at = nowIso();
    const { data: inserted, error: insertError } = await supabase
      .from("forge_agent_preferences")
      .insert({
        user_id: userId,
        outreach_enabled: false,
        channel: FORGE_AGENT_CHANNEL,
        denied_cue_classes: [],
        created_at: at,
        updated_at: at,
      })
      .select("*")
      .single();
    if (insertError || !inserted) {
      throw new ForgeAgentError("Could not create check-in preferences.", 500);
    }
    return mapPreferenceRow(inserted as Record<string, unknown>);
  }

  return {
    async getPreferences(userId) {
      assertMemberNotGuest(userId);
      return readPreferences(userId);
    },
    async updatePreferences(userId, input) {
      assertMemberNotGuest(userId);
      const current = await readPreferences(userId);
      write("forge_agent_preferences");
      const { data, error } = await supabase
        .from("forge_agent_preferences")
        .update({
          outreach_enabled:
            typeof input.outreachEnabled === "boolean"
              ? input.outreachEnabled
              : current.outreachEnabled,
          quiet_hours:
            input.quietHours !== undefined
              ? input.quietHours
              : current.quietHours,
          channel: FORGE_AGENT_CHANNEL,
        })
        .eq("user_id", userId)
        .select("*")
        .single();
      if (error || !data) {
        throw new ForgeAgentError("Could not save check-in preferences.", 500);
      }
      return mapPreferenceRow(data as Record<string, unknown>);
    },
    async listCues(userId) {
      assertMemberNotGuest(userId);
      const { data, error } = await supabase
        .from("forge_cues")
        .select("*")
        .eq("user_id", userId)
        .order("due_at", { ascending: true });
      if (error) {
        throw new ForgeAgentError("Could not load cues.", 500);
      }
      return (data ?? []).map((row) => mapCueRow(row as Record<string, unknown>));
    },
    async createCue(userId, input) {
      assertMemberNotGuest(userId);
      write("forge_cues");
      const { data, error } = await supabase
        .from("forge_cues")
        .insert({
          user_id: userId,
          kind: normalizeKind(input.kind),
          title: normalizeTitle(input.title),
          success_criteria: normalizeSuccess(input.successCriteria),
          due_at: normalizeDueAt(input.dueAt),
          source: "member",
          status: "active",
        })
        .select("*")
        .single();
      if (error || !data) {
        throw new ForgeAgentError("Could not save that cue.", 500);
      }
      return mapCueRow(data as Record<string, unknown>);
    },
    async patchCue(userId, cueId, input) {
      assertMemberNotGuest(userId);
      const { data: existing, error: readError } = await supabase
        .from("forge_cues")
        .select("*")
        .eq("id", cueId)
        .eq("user_id", userId)
        .maybeSingle();
      if (readError) {
        throw new ForgeAgentError("Could not load that cue.", 500);
      }
      if (!existing) {
        throw new ForgeAgentError("Cue not found.", 404, "FORGE_CUE_NOT_FOUND");
      }
      if (existing.status === "consumed") {
        throw new ForgeAgentError("A consumed cue cannot be changed.");
      }
      write("forge_cues");
      const { data, error } = await supabase
        .from("forge_cues")
        .update({ status: input.status })
        .eq("id", cueId)
        .eq("user_id", userId)
        .select("*")
        .single();
      if (error || !data) {
        throw new ForgeAgentError("Could not update that cue.", 500);
      }
      return mapCueRow(data as Record<string, unknown>);
    },
    async listPendingActions(userId) {
      assertMemberNotGuest(userId);
      const { data, error } = await supabase
        .from("forge_agent_actions")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "pending_approval")
        .order("created_at", { ascending: true });
      if (error) {
        throw new ForgeAgentError("Could not load check-ins.", 500);
      }
      return (data ?? []).map((row) =>
        mapActionRow(row as Record<string, unknown>)
      );
    },
    async materializeDueActions(userId, now) {
      assertMemberNotGuest(userId);
      const preferences = await readPreferences(userId);
      if (!canMaterializeDueActions(preferences)) {
        return this.listPendingActions(userId);
      }
      const { data: cueRows, error: cueError } = await supabase
        .from("forge_cues")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "active")
        .lte("due_at", nowIso(now));
      if (cueError) {
        throw new ForgeAgentError("Could not load due cues.", 500);
      }
      const dueCues = (cueRows ?? []).map((row) =>
        mapCueRow(row as Record<string, unknown>)
      );
      if (dueCues.length === 0) {
        return this.listPendingActions(userId);
      }
      const { data: actionRows, error: actionError } = await supabase
        .from("forge_agent_actions")
        .select("cue_id")
        .in(
          "cue_id",
          dueCues.map((cue) => cue.id)
        );
      if (actionError) {
        throw new ForgeAgentError("Could not load existing check-ins.", 500);
      }
      const existingCueIds = new Set(
        (actionRows ?? []).map((row) => String(row.cue_id))
      );
      const inserts = dueCues
        .filter((cue) =>
          shouldMaterializeCue({
            cue,
            hasExistingAction: existingCueIds.has(cue.id),
            outreachEnabled: preferences.outreachEnabled,
            deniedCueClasses: preferences.deniedCueClasses,
            now,
          })
        )
        .map((cue) => {
          write("forge_agent_actions");
          return {
            user_id: userId,
            cue_id: cue.id,
            action_type: "in_app_checkin",
            status: "pending_approval",
            payload: buildCheckInCopy(cue),
          };
        });
      if (inserts.length > 0) {
        const { error: insertError } = await supabase
          .from("forge_agent_actions")
          .insert(inserts);
        if (insertError && insertError.code !== "23505") {
          throw new ForgeAgentError("Could not draft check-ins.", 500);
        }
      }
      return this.listPendingActions(userId);
    },
    async approveAction(userId, actionId) {
      assertMemberNotGuest(userId);
      const { data: existing, error: readError } = await supabase
        .from("forge_agent_actions")
        .select("*")
        .eq("id", actionId)
        .eq("user_id", userId)
        .maybeSingle();
      if (readError) {
        throw new ForgeAgentError("Could not load that check-in.", 500);
      }
      if (!existing) {
        throw new ForgeAgentError(
          "Check-in not found.",
          404,
          "FORGE_ACTION_NOT_FOUND"
        );
      }
      if (existing.status !== "pending_approval") {
        throw new ForgeAgentError("This check-in is no longer pending.");
      }
      const at = nowIso();
      write("forge_agent_actions");
      write("forge_cues");
      const { data, error } = await supabase
        .from("forge_agent_actions")
        .update({
          status: "delivered",
          approved_at: at,
          delivered_at: at,
        })
        .eq("id", actionId)
        .eq("user_id", userId)
        .select("*")
        .single();
      if (error || !data) {
        throw new ForgeAgentError("Could not approve that check-in.", 500);
      }
      await supabase
        .from("forge_cues")
        .update({ status: "consumed" })
        .eq("id", existing.cue_id)
        .eq("user_id", userId);
      return mapActionRow(data as Record<string, unknown>);
    },
    async denyAction(userId, actionId) {
      assertMemberNotGuest(userId);
      const { data: existing, error: readError } = await supabase
        .from("forge_agent_actions")
        .select("*")
        .eq("id", actionId)
        .eq("user_id", userId)
        .maybeSingle();
      if (readError) {
        throw new ForgeAgentError("Could not load that check-in.", 500);
      }
      if (!existing) {
        throw new ForgeAgentError(
          "Check-in not found.",
          404,
          "FORGE_ACTION_NOT_FOUND"
        );
      }
      if (existing.status !== "pending_approval") {
        throw new ForgeAgentError("This check-in is no longer pending.");
      }
      const { data: cueRow, error: cueError } = await supabase
        .from("forge_cues")
        .select("*")
        .eq("id", existing.cue_id)
        .eq("user_id", userId)
        .maybeSingle();
      if (cueError || !cueRow) {
        throw new ForgeAgentError("Cue not found.", 404, "FORGE_CUE_NOT_FOUND");
      }
      const cue = mapCueRow(cueRow as Record<string, unknown>);
      const preferences = await readPreferences(userId);
      const at = nowIso();
      write("forge_agent_actions");
      write("forge_cues");
      write("forge_agent_preferences");
      const { data, error } = await supabase
        .from("forge_agent_actions")
        .update({
          status: "denied",
          denied_at: at,
        })
        .eq("id", actionId)
        .eq("user_id", userId)
        .select("*")
        .single();
      if (error || !data) {
        throw new ForgeAgentError("Could not deny that check-in.", 500);
      }
      await supabase
        .from("forge_cues")
        .update({ status: "cancelled" })
        .eq("id", cue.id)
        .eq("user_id", userId);
      await supabase
        .from("forge_agent_preferences")
        .update({
          denied_cue_classes: recordDeniedCueClass(
            preferences.deniedCueClasses,
            cue.kind
          ),
        })
        .eq("user_id", userId);
      return mapActionRow(data as Record<string, unknown>);
    },
  };
}
