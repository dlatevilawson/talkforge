type HistoryItem = {
  role: "user" | "npc";
  text: string;
};

type Scenario = {
  title?: string;
  mission?: string;
  missionPrompt?: string;
};

type EventContext = {
  title?: string;
  whenLabel?: string;
  audience?: string;
  successCriteria?: string;
  track?: string;
};

export function buildMockCoachResponse(
  message: string,
  history: HistoryItem[],
  scenario?: Scenario,
  event?: EventContext
) {
  const turn = history.filter((item) => item.role === "user").length + 1;
  const scenarioHint =
    scenario?.mission?.trim() ||
    scenario?.missionPrompt?.trim() ||
    "this practice scenario";
  const eventHint = event?.title
    ? `your upcoming ${event.title}`
    : "your target interview";

  const userTurns = history.filter((item) => item.role === "user").length;
  const evidence =
    userTurns === 0
      ? `In this opening turn you said: "${message.slice(0, 120)}${
          message.length > 120 ? "…" : ""
        }"`
      : `Across ${userTurns + 1} of your turns, including: "${message.slice(0, 100)}${
          message.length > 100 ? "…" : ""
        }"`;

  return {
    npc:
      turn === 1
        ? `Interesting start. For ${scenarioHint.toLowerCase()}, I want a bit more structure before we go deeper. What constraints are you assuming?`
        : "Okay — push one level deeper on the tradeoff. What breaks if that assumption is wrong?",
    forge: {
      score: Math.min(92, 62 + Math.min(message.length, 40)),
      clarity: 70,
      confidence: 68,
      warmth: 60,
      curiosity: 72,
      doneWell:
        "You stayed in the exchange and offered a concrete next step instead of freezing.",
      improve:
        "Name one constraint or tradeoff explicitly before expanding the solution.",
      whyItMatters: `In ${eventHint}, interviewers reward structured thinking under probe — clarity here transfers to the real room.`,
      evidence,
      rewrite: message
        ? `${message.trim().replace(/\?*$/, "")} — Before I go further: I'm assuming X and optimizing for Y. Does that match what you care about?`
        : "Before I go further: I'm assuming X and optimizing for Y. Does that match what you care about?",
    },
  };
}
