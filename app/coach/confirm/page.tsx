import type { Metadata } from "next";
import ConfirmClient from "./ConfirmClient";
import { COACH_META_TITLE } from "@/lib/assistant-coach/coach-copy";
import "../coach.css";

export const metadata: Metadata = {
  title: `${COACH_META_TITLE} — Confirm`,
  robots: { index: false, follow: false },
};

export default function CoachConfirmPage() {
  return <ConfirmClient />;
}
