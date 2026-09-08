import { redirect } from "next/navigation";
import PreviewClaimClient from "./PreviewClaimClient";
import { coachTopicById } from "@/lib/assistant-coach/coach-topics";
import { previewClaimLoginPath } from "@/lib/forge/preview-claim";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function PreviewClaimPage({
  searchParams,
}: {
  searchParams: Promise<{ topic?: string | string[] }>;
}) {
  const params = await searchParams;
  const rawTopic = Array.isArray(params.topic) ? params.topic[0] : params.topic;
  const topic = coachTopicById(rawTopic);
  if (!topic) redirect("/coach");

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(previewClaimLoginPath(topic.id));
  }
  return <PreviewClaimClient topicId={topic.id} />;
}
