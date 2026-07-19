import { readFileSync, existsSync } from "fs";
import path from "path";
import { listKnowledgeCatalog } from "../modules/knowledge";
import { isTargetFounderVisibleEnabled, isTargetPlaneEnabled } from "../flags";
import { getRetentionSnapshot } from "../retention/store";

export type GateStatus = "met" | "amber" | "pending" | "blocked";

export type CutoverGateEvidence = {
  id: string;
  gate: string;
  status: GateStatus;
  evidence: string[];
};

export type CutoverReadinessReport = {
  generated_at: string;
  founder_visible_enabled: boolean;
  target_enabled: boolean;
  loader_frozen: boolean;
  gates: CutoverGateEvidence[];
  ready_for_founder_flag_decision: boolean;
  blockers: string[];
};

function loaderStillFrozen(): { frozen: boolean; evidence: string[] } {
  const loaderPath = path.join(process.cwd(), "atlas/engine/loader.ts");
  const evidence: string[] = [];
  if (!existsSync(loaderPath)) {
    return { frozen: false, evidence: ["loader.ts missing"] };
  }
  const src = readFileSync(loaderPath, "utf8");
  const expectedFiles = [
    "constitution.md",
    "founder-brief.md",
    "forge-laws.md",
    "philosophy.md",
    "projects.md",
    "decisions.md",
    "roadmap.md",
    "metrics.md",
    "engineering-protocol.md",
    "bug-log.md",
  ];
  const missing = expectedFiles.filter((f) => !src.includes(f));
  if (missing.length) {
    evidence.push(`Loader file set drift: missing ${missing.join(", ")}`);
    return { frozen: false, evidence };
  }
  evidence.push("loadAtlasContext() still loads the frozen Tier-D set (10 files)");
  evidence.push("W4 did not modify atlas/engine/loader.ts");
  return { frozen: true, evidence };
}

/**
 * Evaluate ATLAS-P3 Step 8 cutover gates for readiness evidence (not permission to cut over).
 */
export function evaluateCutoverReadiness(): CutoverReadinessReport {
  const catalog = listKnowledgeCatalog();
  const retention = getRetentionSnapshot();
  const loader = loaderStillFrozen();
  const targetOn = isTargetPlaneEnabled();
  const founderVisible = isTargetFounderVisibleEnabled();

  const labeledCatalog =
    catalog.length > 0 &&
    catalog.every((c) => c.authority_label && c.plane === "legacy-atlas");

  const gates: CutoverGateEvidence[] = [
    {
      id: "G1",
      gate: "Context path implements RUNTIME-CTX authority filters",
      status: labeledCatalog ? "amber" : "pending",
      evidence: [
        labeledCatalog
          ? "Target Knowledge Module labels all legacy sources; Scaffold excluded"
          : "Labeled catalog incomplete",
        "Full ATOS Authoritative/Canonical inject path still dual-plane (amber until cutover)",
      ],
    },
    {
      id: "G2",
      gate: "Canonical / Authoritative sources exist for domains being cut over",
      status: "amber",
      evidence: [
        "ATOS Specs/Standards Authoritative under RES-002",
        "Legacy-atlas plane still primary for Ask Atlas until cutover",
      ],
    },
    {
      id: "G3",
      gate: "Memory Module can enqueue REG-PROMO-Q without auto-Canonicalizing",
      status:
        retention.promoStaging.every((p) => p.canonical === false && p.auto_published === false)
          ? "amber"
          : "blocked",
      evidence: [
        "W4 promo staging proves enqueue-without-Canonical (staging ≠ REG-PROMO-Q publish)",
        `Promo staging items: ${retention.promoStaging.length}`,
        "Production REG-PROMO-Q write remains STD-002 Founder-gated",
      ],
    },
    {
      id: "G4",
      gate: "Explicit Founder approval to change loadAtlasContext() / loader file set",
      status: loader.frozen ? "pending" : "blocked",
      evidence: loader.evidence.concat([
        "No Founder approval to lift loader freeze in W4",
      ]),
    },
    {
      id: "G5",
      gate: "Compatibility test: no silent authority upgrade of Draft Specs",
      status: "amber",
      evidence: [
        "Label transport forbids upgrades in Context Module",
        "Integrity V3 rejects unlabeled / scaffold-as-institutional",
      ],
    },
    {
      id: "G6",
      gate: "Integrity Module V1–V8 active on Founder-visible path",
      status: "amber",
      evidence: [
        "Integrity Module implemented on target plane",
        "Founder-visible path remains disabled — gate not production-proven yet",
      ],
    },
    {
      id: "G7",
      gate: "Dual-plane rollback plan documented before switch",
      status: "amber",
      evidence: [
        "Rollback: keep FOUNDER_VISIBLE off; Legacy /api/atlas continues to serve",
        "TARGET shadow can be disabled by unsetting ATLAS_RUNTIME_TARGET",
        "Loader freeze preserves Legacy knowledge set",
      ],
    },
  ];

  const blockers: string[] = [];
  if (founderVisible) {
    blockers.push(
      "ATLAS_RUNTIME_FOUNDER_VISIBLE is ON — violates ATLAS-D-W4 (must remain off)"
    );
  }
  if (!loader.frozen) {
    blockers.push("Loader freeze violated");
  }
  for (const g of gates) {
    if (g.status === "blocked") blockers.push(`${g.id}: ${g.gate}`);
  }

  // Ready for Founder *flag decision* only when evidence pack is complete and flags still off.
  // Does not mean cutover is approved — only that W4 objectives produced reviewable evidence.
  const evidenceComplete = gates.every((g) => g.status !== "blocked");
  const ready_for_founder_flag_decision =
    evidenceComplete && !founderVisible && !targetOn && loader.frozen;

  return {
    generated_at: new Date().toISOString(),
    founder_visible_enabled: founderVisible,
    target_enabled: targetOn,
    loader_frozen: loader.frozen,
    gates,
    ready_for_founder_flag_decision,
    blockers,
  };
}
