import TrainingArena from "@/app/components/TrainingArena";

export default async function DifficultConversationsPage({
  searchParams,
}: {
  searchParams: Promise<{ mission?: string | string[] }>;
}) {
  const params = await searchParams;

  return (
    <TrainingArena
      missionStarted={
        params.mission === "1" ||
        (Array.isArray(params.mission) && params.mission.includes("1"))
      }
      title="Difficult Conversations"
      headline="Lead With Courage."
      description="The hardest conversations often create the strongest relationships."
      mission="A close friend hurt you with something they said."
      difficulty="⭐⭐⭐⭐☆"
      duration="15 Minutes"
      skill1="Empathy"
      skill2="Honesty"
      skill3="Respect"
      coachMessage="Avoiding difficult conversations protects discomfort today but creates distance tomorrow."
      missionPrompt="Your friend said something that deeply hurt you. How do you begin this conversation?"
      placeholder="Type what you would say..."
    />
  );
}
