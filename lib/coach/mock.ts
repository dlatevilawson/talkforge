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

  const shortOrFrustrated =
    message.trim().split(/\s+/).length <= 4 ||
    /lecture|tired|frustrated|ugh|whatever/i.test(message);

  return {
    npc: shortOrFrustrated
      ? "Got it. Sounds heavy. What happened?"
      : turn === 1
        ? `Okay. For ${scenarioHint.toLowerCase()} — what's the part that feels hardest right now?`
        : "Hmm. What breaks if that assumption is wrong?",
    forge: {
      score: Math.min(92, 62 + Math.min(message.length, 40)),
      clarity: 70,
      confidence: 68,
      warmth: 60,
      curiosity: 72,
      doneWell:
        "You stayed in the exchange and offered a concrete next step instead of freezing.",
      improve:
        "Would naming one constraint before expanding help you feel steadier?",
      whyItMatters: `In ${eventHint}, structured thinking under probe transfers to the real room.`,
      evidence,
      rewrite: message
        ? `${message.trim().replace(/\?*$/, "")} — Before I go further: I'm assuming X and optimizing for Y. Does that match what you care about?`
        : "Before I go further: I'm assuming X and optimizing for Y. Does that match what you care about?",
    },
  };
}
