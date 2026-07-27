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
  title: "TalkForge — Communication changes lives. Master yours.",
  description:
    "Nobody is born a great communicator. Every great communicator is forged. Enter TalkForge — where practice becomes confidence, and conversations change lives.",
  metadataBase: new URL("https://talkforge.io"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "TalkForge — Communication changes lives. Master yours.",
    description:
      "Nobody is born a great communicator. Every great communicator is forged.",
    url: "https://talkforge.io",
    siteName: "TalkForge",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "TalkForge — Forge Your Voice",
    description:
      "Every relationship begins with a conversation. Begin the Forge.",
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
