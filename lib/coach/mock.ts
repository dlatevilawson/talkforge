type HistoryItem = {
  role: "user" | "npc";
  text: string;
};

type Scenario = {
  title?: string;
  mission?: string;
  missionPrompt?: string;
};

export function buildMockCoachResponse(
  message: string,
  history: HistoryItem[],
  scenario?: Scenario
) {
  const turn = history.filter((item) => item.role === "user").length + 1;
  const scenarioHint =
    scenario?.mission?.trim() ||
    scenario?.missionPrompt?.trim() ||
    "this practice scenario";

  return {
    npc:
      turn === 1
        ? `That caught my attention. In ${scenarioHint.toLowerCase()}, I appreciate you starting the conversation. What made you say that just now?`
        : "Interesting — tell me a bit more about that. I'm curious how that usually goes for you.",
    forge: {
      score: Math.min(92, 62 + Math.min(message.length, 40)),
      clarity: 70,
      confidence: 68,
      warmth: 74,
      curiosity: 78,
      doneWell:
        "You stayed in the conversation and offered a clear next step instead of shutting it down.",
      improve:
        "Add one short personal detail so the exchange feels mutual, then ask one open question.",
      rewrite: message
        ? `${message.trim().replace(/\?*$/, "")} — I've been thinking about that a lot lately. How about you?`
        : "I've been thinking about that a lot lately. How about you?",
    },
  };
}
