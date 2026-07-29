import { GoogleAnalytics as NextGoogleAnalytics } from "@next/third-parties/google";

/** Founder GA4 property (Decision 039 / main integration). Env overrides if set. */
const DEFAULT_GA_ID = "G-6Y0CCE4X1Q";

/**
 * Loads GA4. Uses NEXT_PUBLIC_GA_MEASUREMENT_ID when present, else the
 * TalkForge production Measurement ID committed on main.
 */
export default function GoogleAnalytics() {
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim() || DEFAULT_GA_ID;
  return <NextGoogleAnalytics gaId={id} />;
}
