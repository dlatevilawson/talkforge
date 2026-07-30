import type { Metadata } from "next";
import AppShell from "@/app/components/AppShell";

export const metadata: Metadata = {
  title: "App",
  description: "TalkForge Communication Gym — practice the conversations that matter.",
  robots: { index: false, follow: false },
};

export default function AppSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AppShell>{children}</AppShell>;
}
