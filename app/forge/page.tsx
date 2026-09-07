import { redirect } from "next/navigation";
import ForgePreviewClient from "./ForgePreviewClient";
import { coachTopicById } from "@/lib/assistant-coach/coach-topics";

export default async function ForgePreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string | string[] }>;
}) {
  const rawTopic = (await searchParams).topic;
  const topicId = typeof rawTopic === "string" ? rawTopic : "";
  const topic = coachTopicById(topicId);
  if (!topic) redirect("/coach");

  return <ForgePreviewClient topic={topic} />;
}
