/**
 * Session → Understanding proposals (AUDIT-001 C4 remediation).
 *
 * Experiences may propose identity-adjacent claims with evidence refs.
 * They must NEVER commit those claims onto Living Profile or CoachMemory
 * identity fields. Intelligence + member confirmation apply separately.
 */
import type { SessionReport } from "@/lib/coach/types";
import type { EvidenceSourceKind } from "@/lib/system1/types";

export type IdentityEvidenceProposal = {
  id: string;
  userId: string;
  fieldPath: string;
  claim: string;
  sourceKind: EvidenceSourceKind;
  evidenceRefs: string[];
  confidence: "high" | "medium" | "low";
  sessionId: string;
  status: "pending";
  createdAt: string;
};

function proposalId(sessionId: string, fieldPath: string): string {
  return `prop_${sessionId}_${fieldPath.replace(/[^a-z0-9_]/gi, "_")}`;
}

/**
 * Derive pending evidence proposals from a completed session report.
 * Does not mutate Living Profile or CoachMemory identity fields.
 */
export function proposeIdentityEvidenceFromReport(
  report: SessionReport
): IdentityEvidenceProposal[] {
  const createdAt = new Date().toISOString();
  const refs = [report.sessionId];
  const out: IdentityEvidenceProposal[] = [];

  const breakthrough = report.breakthrough?.trim();
  if (breakthrough) {
    out.push({
      id: proposalId(report.sessionId, "strength_observation"),
      userId: report.userId,
      fieldPath: "strength_observation",
      claim: breakthrough,
      sourceKind: "session_observation",
      evidenceRefs: refs,
      confidence: "medium",
      sessionId: report.sessionId,
      status: "pending",
      createdAt,
    });
  }

  const weakness = report.biggestWeakness?.trim();
  if (weakness) {
    out.push({
      id: proposalId(report.sessionId, "focus_observation"),
      userId: report.userId,
      fieldPath: "focus_observation",
      claim: weakness,
      sourceKind: "session_observation",
      evidenceRefs: refs,
      confidence: "medium",
      sessionId: report.sessionId,
      status: "pending",
      createdAt,
    });
  }

  if (typeof report.confidence === "number") {
    out.push({
      id: proposalId(report.sessionId, "session_confidence"),
      userId: report.userId,
      fieldPath: "session_confidence",
      claim: `Observed session confidence score: ${report.confidence}`,
      sourceKind: "session_observation",
      evidenceRefs: refs,
      confidence: "low",
      sessionId: report.sessionId,
      status: "pending",
      createdAt,
    });
  }

  if (report.fillerWords >= 5) {
    out.push({
      id: proposalId(report.sessionId, "habit_filler_words"),
      userId: report.userId,
      fieldPath: "speaking_habit_observation",
      claim: "Uses filler words when thinking under pressure",
      sourceKind: "session_observation",
      evidenceRefs: refs,
      confidence: "medium",
      sessionId: report.sessionId,
      status: "pending",
      createdAt,
    });
  } else if (report.interruptions >= 3) {
    out.push({
      id: proposalId(report.sessionId, "habit_interruptions"),
      userId: report.userId,
      fieldPath: "speaking_habit_observation",
      claim: "Tends to jump in quickly — may cut space short",
      sourceKind: "session_observation",
      evidenceRefs: refs,
      confidence: "medium",
      sessionId: report.sessionId,
      status: "pending",
      createdAt,
    });
  } else if (report.questionsAsked >= 3) {
    out.push({
      id: proposalId(report.sessionId, "habit_questions"),
      userId: report.userId,
      fieldPath: "speaking_habit_observation",
      claim: "Asks clarifying questions when engaged",
      sourceKind: "session_observation",
      evidenceRefs: refs,
      confidence: "medium",
      sessionId: report.sessionId,
      status: "pending",
      createdAt,
    });
  }

  return out;
}
