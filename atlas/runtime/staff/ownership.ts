import type { AioId, RuntimeModuleId } from "./types";

/** Exclusive module → office map (ATLAS-ENG-PROGRAM §4.1 + AIF under Core). */
export const MODULE_OWNER: Record<RuntimeModuleId, AioId> = {
  "rt.ingress": "AIO-CORE",
  "rt.authority": "AIO-CORE",
  "rt.memory": "AIO-CORE",
  "rt.hub": "AIO-CORE",
  "aio.core.program": "AIO-CORE",
  "rt.knowledge": "AIO-INTEL",
  "rt.awareness": "AIO-INTEL",
  "rt.context": "AIO-INTEL",
  "rt.cognition": "AIO-COUNSEL",
  "rt.composition": "AIO-COUNSEL",
  "rt.exchange": "AIO-BROKER",
  "rt.integrity": "AIO-GUARD",
  "rt.escalation": "AIO-GUARD",
  "rt.trace": "AIO-GUARD",
};

const FORBIDDEN_OFFICE_IDS = new Set(["AIO-PROGRAM", "EXEC-SENTINEL", "AIO-SENTINEL"]);

export function ownerOf(moduleId: RuntimeModuleId): AioId {
  return MODULE_OWNER[moduleId];
}

export function assertOwnershipInvariants(): void {
  const seen = new Map<RuntimeModuleId, AioId>();
  for (const [mod, owner] of Object.entries(MODULE_OWNER) as [RuntimeModuleId, AioId][]) {
    if (seen.has(mod) && seen.get(mod) !== owner) {
      throw new Error(`Dual owner for ${mod}`);
    }
    seen.set(mod, owner);
    if (FORBIDDEN_OFFICE_IDS.has(owner)) {
      throw new Error(`Forbidden owner id ${owner} for ${mod}`);
    }
  }
  if ((MODULE_OWNER as Record<string, string>)["AIO-PROGRAM" as RuntimeModuleId]) {
    throw new Error("AIO-PROGRAM must not appear as a module owner (not a sixth AIO)");
  }
  // Program Desk is Core function
  if (MODULE_OWNER["aio.core.program"] !== "AIO-CORE") {
    throw new Error("aio.core.program must be owned by AIO-CORE (AIF-PROGRAM)");
  }
}

/** Reject peer-office treatment of Program Desk. */
export function assertNotSixthAio(id: string): void {
  if (id === "AIO-PROGRAM") {
    throw new Error("AIO-PROGRAM is not a peer office; use AIF-PROGRAM under AIO-CORE");
  }
}
