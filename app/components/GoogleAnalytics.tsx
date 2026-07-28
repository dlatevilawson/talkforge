import { GoogleAnalytics as NextGoogleAnalytics } from "@next/third-parties/google";

/**
 * Loads GA4 when NEXT_PUBLIC_GA_MEASUREMENT_ID is set (e.g. G-XXXXXXXX).
 * Omit the env var to keep analytics off.
 */
export default function GoogleAnalytics() {
  const id = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();
  if (!id) return null;
  return <NextGoogleAnalytics gaId={id} />;
}
