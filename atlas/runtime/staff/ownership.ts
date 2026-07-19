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

/**
 * Exclusive staff responsibilities (ATLAS-P5 matrix).
 * Exactly one owner each — WP-S0 orphan/dual-owner detector.
 */
export const RESPONSIBILITY_OWNER: Record<string, AioId> = {
  "atlas.authority_posture": "AIO-CORE",
  "atlas.founder_channel": "AIO-CORE",
  "atlas.task_assignment": "AIO-CORE",
  "atlas.emission_permit": "AIO-CORE",
  "atlas.program_desk": "AIO-CORE", // AIF-PROGRAM function
  "atlas.labeled_context": "AIO-INTEL",
  "atlas.health_sensing": "AIO-INTEL",
  "atlas.std003_counsel": "AIO-COUNSEL",
  "atlas.brief_drafts": "AIO-COUNSEL",
  "atlas.exec_brokerage": "AIO-BROKER",
  "atlas.risk_notice_transport": "AIO-BROKER",
  "atlas.integrity_validation": "AIO-GUARD",
  "atlas.escalation_packaging": "AIO-GUARD",
  "atlas.audit_trace": "AIO-GUARD",
};

/** Must never be owned by an AIO (company / Founder plane). */
export const FORBIDDEN_AIO_RESPONSIBILITIES = [
  "company.engineering_integrity", // EXEC-SENTINEL
  "company.engineering_delivery", // EXEC-ENGINEERING
  "company.canonical_approval", // Founder / Knowledge
  "company.product_roadmap", // EXEC-PRODUCT
] as const;

const FORBIDDEN_OFFICE_IDS = new Set([
  "AIO-PROGRAM",
  "EXEC-SENTINEL",
  "AIO-SENTINEL",
]);

export function ownerOf(moduleId: RuntimeModuleId): AioId {
  return MODULE_OWNER[moduleId];
}

export function ownerOfResponsibility(responsibility: string): AioId {
  const owner = RESPONSIBILITY_OWNER[responsibility];
  if (!owner) {
    throw new Error(`Orphaned responsibility (no owner): ${responsibility}`);
  }
  return owner;
}

export type OwnershipValidationReport = {
  ok: boolean;
  modules: number;
  responsibilities: number;
  offices_with_work: AioId[];
  orphans: string[];
  dual_owners: string[];
  forbidden_claims: string[];
  errors: string[];
};

/**
 * WP-S0 / VC1 — every module & responsibility has exactly one owner;
 * no orphans; no forbidden EXEC absorption; no sixth AIO.
 */
export function validateExclusiveOwnership(): OwnershipValidationReport {
  const errors: string[] = [];
  const orphans: string[] = [];
  const dual_owners: string[] = [];
  const forbidden_claims: string[] = [];

  const moduleSeen = new Map<string, AioId>();
  for (const [mod, owner] of Object.entries(MODULE_OWNER) as [
    RuntimeModuleId,
    AioId,
  ][]) {
    if (moduleSeen.has(mod) && moduleSeen.get(mod) !== owner) {
      dual_owners.push(mod);
      errors.push(`Dual owner for module ${mod}`);
    }
    moduleSeen.set(mod, owner);
    if (FORBIDDEN_OFFICE_IDS.has(owner)) {
      forbidden_claims.push(`${mod}→${owner}`);
      errors.push(`Forbidden owner id ${owner} for ${mod}`);
    }
  }

  const respSeen = new Map<string, AioId>();
  const ownerCounts: Partial<Record<AioId, number>> = {};
  for (const [resp, owner] of Object.entries(RESPONSIBILITY_OWNER)) {
    if (respSeen.has(resp) && respSeen.get(resp) !== owner) {
      dual_owners.push(resp);
      errors.push(`Dual owner for responsibility ${resp}`);
    }
    respSeen.set(resp, owner);
    ownerCounts[owner] = (ownerCounts[owner] ?? 0) + 1;
    if (FORBIDDEN_OFFICE_IDS.has(owner)) {
      forbidden_claims.push(`${resp}→${owner}`);
      errors.push(`Forbidden owner for ${resp}`);
    }
  }

  for (const banned of FORBIDDEN_AIO_RESPONSIBILITIES) {
    if (banned in RESPONSIBILITY_OWNER) {
      forbidden_claims.push(banned);
      errors.push(`AIO must not own ${banned}`);
    }
  }

  if (MODULE_OWNER["aio.core.program"] !== "AIO-CORE") {
    errors.push("aio.core.program must be owned by AIO-CORE (AIF-PROGRAM)");
  }

  const requiredOffices: AioId[] = [
    "AIO-CORE",
    "AIO-INTEL",
    "AIO-COUNSEL",
    "AIO-BROKER",
    "AIO-GUARD",
  ];
  for (const id of requiredOffices) {
    const hasModule = Object.values(MODULE_OWNER).includes(id);
    const hasResp = Object.values(RESPONSIBILITY_OWNER).includes(id);
    if (!hasModule && !hasResp) {
      orphans.push(id);
      errors.push(`Office ${id} owns nothing (orphaned office)`);
    }
  }

  // Detect empty responsibility keys
  for (const [resp, owner] of Object.entries(RESPONSIBILITY_OWNER)) {
    if (!resp.trim()) orphans.push("(empty responsibility key)");
    if (!owner) orphans.push(resp);
  }

  const offices_with_work = requiredOffices.filter(
    (id) => (ownerCounts[id] ?? 0) > 0 || Object.values(MODULE_OWNER).includes(id)
  );

  return {
    ok: errors.length === 0 && orphans.length === 0 && dual_owners.length === 0,
    modules: Object.keys(MODULE_OWNER).length,
    responsibilities: Object.keys(RESPONSIBILITY_OWNER).length,
    offices_with_work,
    orphans,
    dual_owners,
    forbidden_claims,
    errors,
  };
}

export function assertOwnershipInvariants(): void {
  const report = validateExclusiveOwnership();
  if (!report.ok) {
    throw new Error(
      `Ownership invariants failed: ${report.errors.join("; ")}`
    );
  }
}

/** Reject peer-office treatment of Program Desk. */
export function assertNotSixthAio(id: string): void {
  if (id === "AIO-PROGRAM") {
    throw new Error(
      "AIO-PROGRAM is not a peer office; use AIF-PROGRAM under AIO-CORE"
    );
  }
}
