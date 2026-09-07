import { redirect } from "next/navigation";
import ForgePreviewClient from "./ForgePreviewClient";
import { coachTopicById } from "@/lib/assistant-coach/coach-topics";
import { authenticatedPracticePath } from "@/lib/forge/preview-claim";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function ForgePreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string | string[] }>;
}) {
  const rawTopic = (await searchParams).topic;
  const topicId = typeof rawTopic === "string" ? rawTopic : "";
  const topic = coachTopicById(topicId);
  if (!topic) redirect("/coach");

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(authenticatedPracticePath(topic.id));

  return <ForgePreviewClient topic={topic} />;
}
