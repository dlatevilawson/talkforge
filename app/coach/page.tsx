import type { Metadata } from "next";
import AssistantCoachClient from "./AssistantCoachClient";
import "./coach.css";

export const metadata: Metadata = {
  title: "Coach",
  description:
    "Choose your communication moments and build a focused practice profile.",
  robots: { index: false, follow: false },
};

export default function CoachPage() {
  return <AssistantCoachClient />;
}
