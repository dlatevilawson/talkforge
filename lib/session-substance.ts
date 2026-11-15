/** The completion gate shared by live, retry, and abandoned-session recovery. */
export function hasSubstantiveFounderSpeech(
  turns: Array<{ role: string; text?: string }>
): boolean {
  return turns.some((turn) => {
    if (turn.role !== "founder" && turn.role !== "user") return false;
    const text = (turn.text ?? "").trim();
    const words = text.split(/\s+/).filter(Boolean);
    const letters = (text.match(/[A-Za-zÀ-ÖØ-öø-ÿ]/g) ?? []).length;
    return words.length >= 3 && letters >= 8;
  });
}
