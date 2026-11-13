export function hasRepeatedCoachTurn(
  turns: Array<{ role: string; text: string }>,
  repeatCount = 3
): boolean {
  if (repeatCount < 2 || turns.length < repeatCount) return false;
  const recent = turns.slice(-repeatCount);
  if (recent.some((turn) => turn.role !== "forge")) return false;
  const normalized = recent.map((turn) => turn.text.trim().replace(/\s+/g, " ").toLowerCase());
  return normalized.every((text) => text && text === normalized[0]);
}
