export type FocusItem = {
  id: string;
  title: string;
  why: string;
  status: "active" | "blocked" | "done";
};

export type Priority = {
  id: string;
  title: string;
  outcome: string;
  horizon: string;
};

export type Decision = {
  id: string;
  question: string;
  context: string;
  owner: string;
  urgency: "high" | "medium" | "low";
};

export type Risk = {
  id: string;
  title: string;
  detail: string;
  missionImpact: string;
  severity: "high" | "medium" | "low";
};

export const todayFocus: FocusItem = {
  id: "focus-1",
  title: "Ship Atlas MVP and validate the daily operating loop",
  why: "Atlas exists to turn strategy into disciplined execution. The minimum dashboard must help the founder surface focus, decisions, and mission risk every day.",
  status: "active",
};

export const strategicPriorities: Priority[] = [
  {
    id: "prio-1",
    title: "Protect mission clarity in product",
    outcome:
      "Every product surface strengthens voice, trust, and relationship skill—not generic confidence content.",
    horizon: "Near-term",
  },
  {
    id: "prio-2",
    title: "Finish the conversation engine loop",
    outcome:
      "Users can practice realistic dialogues and receive coaching that improves judgment and expression.",
    horizon: "Near-term",
  },
  {
    id: "prio-3",
    title: "Establish Atlas as institutional memory",
    outcome:
      "Priorities, open decisions, and risks live in one place and inform founder decisions consistently.",
    horizon: "Foundational",
  },
];

export const openDecisions: Decision[] = [
  {
    id: "dec-1",
    question: "Should Atlas own operating data in-app, or mirror an external Founder Brief for now?",
    context:
      "MVP uses seeded data. Choosing the source of truth early avoids duplicate systems and mission drift.",
    owner: "Founder",
    urgency: "high",
  },
  {
    id: "dec-2",
    question: "What is the first Forge Law Atlas must protect in every recommendation?",
    context:
      "Charter references Forge Laws; they are not yet encoded. Atlas cannot fully check alignment without them.",
    owner: "Founder",
    urgency: "medium",
  },
  {
    id: "dec-3",
    question: "Is public-facing product messaging aligned enough with purpose to ship as-is?",
    context:
      "Current landing copy leans personal power. Charter purpose centers relationships, trust, and ending voicelessness.",
    owner: "Founder",
    urgency: "medium",
  },
];

export const risks: Risk[] = [
  {
    id: "risk-1",
    title: "Mission drift in marketing language",
    detail:
      "Hero messaging emphasizes self-expansion more than helping people express themselves and build trust.",
    missionImpact:
      "Weakens the signal that TalkForge exists to end voicelessness and strengthen relationships.",
    severity: "medium",
  },
  {
    id: "risk-2",
    title: "Missing Founder Brief and Forge Laws",
    detail:
      "Atlas cannot fully steward alignment without encoded constitutional references beyond the charter.",
    missionImpact:
      "Recommendations may optimize for short-term product progress while missing governing constraints.",
    severity: "high",
  },
  {
    id: "risk-3",
    title: "API credential hygiene",
    detail:
      "An OpenAI key was previously committed then removed. Confirm rotation if the secret was ever exposed.",
    missionImpact:
      "Operational trust and stewardship standards are undermined if secrets remain compromised.",
    severity: "high",
  },
];
