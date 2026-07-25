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
  title: "TalkForge — Master the Art of Communication",
  description:
    "TalkForge is an AI Communication Gym. Practice the conversations that matter, build confidence, and never feel voiceless again. Join the Founding Members waitlist.",
  metadataBase: new URL("https://talkforge.io"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "TalkForge — Master the Art of Communication",
    description:
      "You weren't born a poor communicator. Nobody ever taught you how to practice. Join the Founding Members.",
    url: "https://talkforge.io",
    siteName: "TalkForge",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "TalkForge — Master the Art of Communication",
    description:
      "An AI Communication Gym for the conversations that matter. Join the Founding Members.",
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
