import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import GoogleAnalytics from "@/app/components/GoogleAnalytics";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#050505",
};

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://talkforge.io"),
  title: {
    default: "TalkForge — Find Your Voice.",
    template: "%s · TalkForge",
  },
  description:
    "Every life is shaped by conversations. Practice the ones that matter.",
  applicationName: "TalkForge",
  keywords: [
    "TalkForge",
    "communication practice",
    "AI communication gym",
    "find your voice",
    "conversation coaching",
  ],
  authors: [{ name: "TalkForge" }],
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <GoogleAnalytics />
      </body>
    </html>
  );
}
