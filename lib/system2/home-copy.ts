/**
 * Adaptive Coach Homepage copy (Continuity Home).
 * One recommendation above the fold (IV-UX-001). Alternatives stay secondary.
 */

export const APP_HOME_SCREEN_COPY = {
  headline: "Today, we’re training this.",
  loadingHeadline: "Preparing today’s training.",
  notReadyHeadline: "Your Coach is almost ready.",
  notReadySubheadline: "Standing by while your profile loads.",
  alternativesLabel: "Not this today",
  beginFallback: "Begin today’s training",

  /** Demoted Explorer path — Assessment is not the Coach recommendation. */
  explorerAlternative: {
    id: "living-plan",
    title: "Start with a short living plan instead",
    subtitle: "A brief conversation so Forge can get a sense of you.",
    mode: "assessment" as const,
  },

  /** Returning-member alternatives — never equal to the recommendation. */
  alternatives: [
    {
      id: "custom",
      title: "Bring a different conversation",
      subtitle: "Tell Forge who you’re meeting and what’s at stake.",
      practiceTitle: "What brings you in today?",
    },
    {
      id: "avoided",
      title: "The conversation I’ve been avoiding",
      subtitle: "Build the composure to say what needs to be said.",
      practiceTitle: "The conversation I've been avoiding",
    },
  ],

  footerLink: "Tune Forge's memory & preferences →",
  footerHref: "/app/profile#goal",
} as const;

export const HOME_ALTERNATIVE_CATALOG = {
  explorer: {
    id: APP_HOME_SCREEN_COPY.explorerAlternative.id,
    title: APP_HOME_SCREEN_COPY.explorerAlternative.title,
    blurb: APP_HOME_SCREEN_COPY.explorerAlternative.subtitle,
    practiceTitle: "",
    mode: APP_HOME_SCREEN_COPY.explorerAlternative.mode,
  },
  returning: APP_HOME_SCREEN_COPY.alternatives.map((card) => ({
    id: card.id,
    title: card.title,
    blurb: card.subtitle,
    practiceTitle: card.practiceTitle,
  })),
} as const;
