import type { Metadata } from "next";
import AssistantCoachClient from "./AssistantCoachClient";
import {
  COACH_META_DESCRIPTION,
  COACH_META_TITLE,
} from "@/lib/assistant-coach/coach-copy";
import "./coach.css";

export const metadata: Metadata = {
  title: COACH_META_TITLE,
  description: COACH_META_DESCRIPTION,
  robots: { index: false, follow: false },
};

export default function CoachPage() {
  return <AssistantCoachClient />;
}
