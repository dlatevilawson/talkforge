import type { Metadata } from "next";
import { Fraunces, Manrope } from "next/font/google";
import LandingPage from "@/app/components/landing/LandingPage";

const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-lp-display",
  display: "swap",
});

const sans = Manrope({
  subsets: ["latin"],
  variable: "--font-lp-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TalkForge — Find Your Voice.",
  description:
    "Every life is shaped by conversations. Practice the ones that matter. Join the Founding Members.",
  metadataBase: new URL("https://talkforge.io"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "TalkForge — Find Your Voice.",
    description:
      "Every life is shaped by conversations. Practice the ones that matter.",
    url: "https://talkforge.io",
    siteName: "TalkForge",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "TalkForge — Find Your Voice.",
    description:
      "Every life is shaped by conversations. Practice the ones that matter.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function HomePage() {
  return (
    <div className={`${display.variable} ${sans.variable} font-[family-name:var(--font-lp-sans)]`}>
      <LandingPage />
    </div>
  );
}
