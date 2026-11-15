function isSubstantiveTranscript(text: string): boolean {
  const words = text.trim().match(/[a-z0-9']+/gi) ?? [];
  const letters = text.replace(/[^a-z]/gi, "").length;
  return words.length >= 3 && letters >= 8;
}

export function hasAdmittedPracticeSpeech(
  turns: Array<{ role: string; text?: string }>
): boolean {
  return turns.some(
    (turn) =>
      (turn.role === "user" || turn.role === "npc") &&
      isSubstantiveTranscript(turn.text ?? "")
  );
}
