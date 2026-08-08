/**
 * Member-facing billing copy (BILL-001 refinements).
 * Never expose technical quota/limit language externally.
 */

export const COMPLIMENTARY_COMPLETE_HEADLINE =
  "You’ve completed your complimentary coaching sessions.";

export const COMPLIMENTARY_COMPLETE_BODY = [
  "Communication isn’t mastered in a single conversation.",
  "It’s built through consistent, deliberate practice.",
  "Whenever you’re ready, Forge will be here.",
] as const;

export const BECOME_PRO_MEMBER_CTA = "Become a Pro Member";
export const CLAIM_FOUNDING_PASS_CTA = "Claim Your Founding Pass →";
export const MAYBE_LATER_CTA = "Maybe Later";

/** In-app Billing page copy (Founding Pass framing). */
export const BILLING_PAGE_COPY = {
  header: {
    title: "Billing & Access",
    subtitle:
      "Build unshakeable presence in private—so you never choke when the stakes are high.",
  },
  canceledBanner: "No pressure. Step into the arena whenever you're ready.",
  successBanner: "Welcome to the arena. Your Founding Pass is updating.",
  currentPlan: {
    title: "TalkForge Explorer",
    badge: "Free Tier",
    proTitle: "TalkForge Founding Pass",
  },
  proPlan: {
    tagline: "FOUNDING MEMBER ACCESS",
    title: "Become a Founding Member",
    description:
      "Unlimited high-stakes practice reps, full psychological breakdowns, and continuous progress tracking—so you step into every crucial conversation knowing you will be heard.",
    price: "$19.99",
    originalPrice: "$29",
    billingCycle: "/ month",
    priceSubtext: "Rate locked for life · Cancel anytime",
    ctaButton: CLAIM_FOUNDING_PASS_CTA,
    footerSubtext:
      "Secure Stripe Checkout. Zero commitments—cancel in one click anytime.",
  },
} as const;

export const MEANINGFUL_PROGRESS_LINE = "That’s meaningful progress.";

export const CANCELLATION_HEADLINE = "Your membership has been canceled.";

export const CANCELLATION_BODY = [
  "You’ll continue to have full access until your current billing period ends.",
  "You’re always welcome back whenever another important conversation comes along.",
] as const;

export const COMPLIMENTARY_HOME_NOTE =
  "You’ve completed your complimentary coaching sessions.";

export const CONTINUE_JOURNEY_LINE = "Continue your communication journey anytime.";
