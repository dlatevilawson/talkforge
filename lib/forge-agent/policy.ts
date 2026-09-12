import {
  FORGE_AGENT_FORBIDDEN_WRITE_TABLES,
  FORGE_AGENT_SERVICE_WRITE_TABLES,
  FORGE_AGENT_WRITE_TABLES,
  FORGE_CUE_KINDS,
  type ForgeAgentPreferences,
  type ForgeCue,
  type ForgeCueKind,
} from "./types.ts";

export class ForgeAgentError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status = 400, code = "FORGE_AGENT_ERROR") {
    super(message);
    this.name = "ForgeAgentError";
    this.status = status;
    this.code = code;
  }
}

export function assertMemberNotGuest(userId: string): void {
  if (userId.startsWith("guest_")) {
    throw new ForgeAgentError(
      "Guest identity cannot use Forge Agent check-ins.",
      403,
      "FORGE_AGENT_GUEST_FORBIDDEN"
    );
  }
}

export function canMaterializeDueActions(
  prefs: Pick<ForgeAgentPreferences, "outreachEnabled">
): boolean {
  return prefs.outreachEnabled === true;
}

export function isCueClassDenied(
  deniedCueClasses: readonly string[],
  kind: ForgeCueKind
): boolean {
  return deniedCueClasses.includes(kind);
}

export function recordDeniedCueClass(
  deniedCueClasses: readonly string[],
  kind: ForgeCueKind
): ForgeCueKind[] {
  const next = new Set<ForgeCueKind>();
  for (const value of deniedCueClasses) {
    if ((FORGE_CUE_KINDS as readonly string[]).includes(value)) {
      next.add(value as ForgeCueKind);
    }
  }
  next.add(kind);
  return [...next];
}

export function shouldMaterializeCue(input: {
  cue: Pick<ForgeCue, "status" | "kind" | "dueAt">;
  hasExistingAction: boolean;
  outreachEnabled: boolean;
  deniedCueClasses: readonly string[];
  now?: Date;
}): boolean {
  if (!input.outreachEnabled) return false;
  if (input.hasExistingAction) return false;
  if (input.cue.status !== "active") return false;
  if (isCueClassDenied(input.deniedCueClasses, input.cue.kind)) return false;
  const now = input.now ?? new Date();
  const dueAt = new Date(input.cue.dueAt);
  if (Number.isNaN(dueAt.getTime()) || dueAt.getTime() > now.getTime()) {
    return false;
  }
  return true;
}

export function assertForgeAgentWriteTarget(table: string): void {
  assertForgeAgentIdentityUntouched(table);
  if (!(FORGE_AGENT_WRITE_TABLES as readonly string[]).includes(table)) {
    throw new ForgeAgentError(
      "Forge Agent cannot write this table.",
      500,
      "FORGE_AGENT_WRITE_FORBIDDEN"
    );
  }
}

export function assertForgeAgentServiceWriteTarget(table: string): void {
  assertForgeAgentIdentityUntouched(table);
  if (
    !(FORGE_AGENT_SERVICE_WRITE_TABLES as readonly string[]).includes(table)
  ) {
    throw new ForgeAgentError(
      "Forge Agent cannot write this table.",
      500,
      "FORGE_AGENT_WRITE_FORBIDDEN"
    );
  }
}

export function assertForgeAgentIdentityUntouched(table: string): void {
  if (
    (FORGE_AGENT_FORBIDDEN_WRITE_TABLES as readonly string[]).includes(table)
  ) {
    throw new ForgeAgentError(
      "Forge Agent must not write Living Profile or coach memory.",
      500,
      "FORGE_AGENT_IDENTITY_WRITE_FORBIDDEN"
    );
  }
}

export function isForgeCueKind(value: unknown): value is ForgeCueKind {
  return (
    typeof value === "string" &&
    (FORGE_CUE_KINDS as readonly string[]).includes(value)
  );
}
