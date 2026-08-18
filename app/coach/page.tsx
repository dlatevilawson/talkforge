import type { Metadata } from "next";
import AssistantCoachClient from "./AssistantCoachClient";
import "./coach.css";

export const metadata: Metadata = {
  title: "Assistant Coach",
  description:
    "Talk through a real conversation and feel understood before you create an account.",
  robots: { index: false, follow: false },
};

export default function CoachPage() {
  return <AssistantCoachClient />;
}
