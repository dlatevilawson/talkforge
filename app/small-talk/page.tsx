import TrainingArena from "@/app/components/TrainingArena";

export default async function SmallTalkPage({
  searchParams,
}: {
  searchParams: Promise<{ mission?: string | string[] }>;
}) {
  const params = await searchParams;

  return (
    <TrainingArena
      scenarioId="small-talk"
      missionStarted={
        params.mission === "1" ||
        (Array.isArray(params.mission) && params.mission.includes("1"))
      }
      title="Small Talk Forge"
      headline="Every Conversation Starts Somewhere."
      description="Confidence grows one conversation at a time."
      mission="You're standing in line at a coffee shop. The person next to you smiles."
      difficulty="⭐☆☆☆☆"
      duration="5 Minutes"
      skill1="Confidence"
      skill2="Curiosity"
      skill3="Connection"
      coachMessage="Small talk isn't small. It's the beginning of every relationship."
      missionPrompt="Someone smiles at you while waiting in line. How do you start the conversation?"
      placeholder="Type your opening..."
    />
  );
}
