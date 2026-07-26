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
  title: "TalkForge — AI Communication Gym",
  description:
    "TalkForge is an AI Communication Gym. Practice the conversations that matter with Forge, then walk into the real moment ready. Join the Founding Waitlist.",
  metadataBase: new URL("https://talkforge.io"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "TalkForge — AI Communication Gym",
    description:
      "Practice the conversations that matter. Rehearse with Forge — then walk into the real moment ready.",
    url: "https://talkforge.io",
    siteName: "TalkForge",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "TalkForge — AI Communication Gym",
    description:
      "An AI Communication Gym for the conversations that matter. Join the Founding Waitlist.",
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
