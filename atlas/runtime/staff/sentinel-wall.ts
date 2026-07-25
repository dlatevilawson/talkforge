/**
 * ATLAS-P5 §4.6 — GUARD ≠ Sentinel conformance helpers.
 */

export type SentinelRiskNotice = {
  id: string;
  summary: string;
  body: string;
  source: "EXEC-SENTINEL";
};

export function assertGuardIsNotSentinel(guardClaims: string[]): void {
  const banned = [
    /chief engineering/i,
    /sentinel inside atlas/i,
    /engineering authority/i,
    /i am sentinel/i,
    /override sentinel/i,
  ];
  for (const claim of guardClaims) {
    for (const re of banned) {
      if (re.test(claim)) {
        throw new Error(`GUARD≠Sentinel breach: "${claim}"`);
      }
    }
  }
}

export function preserveRiskNotice(
  notice: SentinelRiskNotice
): SentinelRiskNotice {
  // Structural freeze — callers must not mutate returned object fields in place for tests
  return Object.freeze({ ...notice, source: "EXEC-SENTINEL" as const });
}

export function riskNoticeAltered(
  original: SentinelRiskNotice,
  candidate: { summary: string; body: string }
): boolean {
  return original.summary !== candidate.summary || original.body !== candidate.body;
}

export function runSentinelWallConformance(): void {
  assertGuardIsNotSentinel([
    "Atlas Integrity gate PASS",
    "Emission allowed for Founder brief",
  ]);
  let threw = false;
  try {
    assertGuardIsNotSentinel(["I am Sentinel inside Atlas"]);
  } catch {
    threw = true;
  }
  if (!threw) throw new Error("Expected Sentinel-impersonation claim to fail");

  const n = preserveRiskNotice({
    id: "RN-1",
    summary: "Integrity risk",
    body: "Do not ship",
    source: "EXEC-SENTINEL",
  });
  if (!riskNoticeAltered(n, { summary: "softened", body: n.body })) {
    throw new Error("Expected alteration detector to fire");
  }
  if (riskNoticeAltered(n, { summary: n.summary, body: n.body })) {
    throw new Error("Identical notice must not count as altered");
  }
}
