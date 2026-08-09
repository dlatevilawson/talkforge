/**
 * Adaptive Coach Homepage copy (Continuity Home).
 * Keep the choice set short — curiosity without a catalog (IV-REJ-005).
 */

export const APP_HOME_SCREEN_COPY = {
  headline: "Where do you need to be heard today?",
  subheadline:
    "Forge listens before it coaches. Pick a starting place—you can change direction anytime.",
  loadingHeadline: "Preparing today’s training.",
  notReadyHeadline: "Your Coach is almost ready.",
  notReadySubheadline: "Standing by while your profile loads.",

  cards: [
    {
      id: "continue",
      title: "Continue active drill",
      subtitle: "Stay calm, think clearly, and lead through conflict.",
      practiceTitle: "Stay calm, think clearly, and lead through conflict.",
    },
    {
      id: "custom",
      title: "Bring a custom scenario",
      subtitle: "Tell Forge who you're meeting with and what's at stake.",
      practiceTitle: "What brings you in today?",
    },
    {
      id: "replay",
      title: "Stop replaying it at 2 AM",
      subtitle: "Re-run that awkward moment until you get it right.",
      practiceTitle: "Stop replaying it at 2 AM",
    },
    {
      id: "avoided",
      title: "The conversation I've been avoiding",
      subtitle: "Build the composure to say what needs to be said.",
      practiceTitle: "The conversation I've been avoiding",
    },
  ],

  /**
   * Explorer (new-user) paths — no completed practice_sessions yet.
   * Neither option pre-selects a topic or scenario.
   */
  explorerCards: [
    {
      id: "living-plan",
      title: "Build My Living Training Plan",
      subtitle: "Shape what Forge trains with you—start from what matters now.",
      href: "/app/profile#goal",
    },
    {
      id: "talk-forge",
      title: "Talk to Coach Forge",
      subtitle: "Open the floor. Forge listens first—no scenario required.",
    },
  ],

  footerLink: "Tune Forge's memory & preferences →",
  footerHref: "/app/profile#goal",
} as const;
