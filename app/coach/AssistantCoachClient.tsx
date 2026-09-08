"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import TopicCard from "@/app/components/TopicCard";
import {
  COACH_TOPICS,
  type CoachTopic,
  type CoachTopicId,
} from "@/lib/assistant-coach/coach-topics";
import { COACH_PRODUCT_NAME } from "@/lib/assistant-coach/coach-copy";

export default function AssistantCoachClient() {
  const router = useRouter();
  const [selectedTopicId, setSelectedTopicId] = useState<CoachTopicId | null>(
    null
  );

  function selectTopic(topic: CoachTopic) {
    setSelectedTopicId(topic.id);
    router.push(`/forge?topic=${encodeURIComponent(topic.id)}`);
  }

  return (
    <main className="ac-shell">
      <header className="ac-header">
        <p className="ac-kicker">TalkForge</p>
        <h1 className="ac-title">{COACH_PRODUCT_NAME}</h1>
        <p className="ac-lede">What conversation are you preparing for?</p>
      </header>

      <ul className="ac-topic-grid" role="list" aria-label="Conversation topics">
        {COACH_TOPICS.map((topic, index) => (
          <TopicCard
            key={topic.id}
            option={topic}
            index={index}
            selected={topic.id === selectedTopicId}
            onSelect={selectTopic}
          />
        ))}
      </ul>
    </main>
  );
}
