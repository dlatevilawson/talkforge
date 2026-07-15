import TrainingArena from "@/app/components/TrainingArena";

export default async function InterviewPage({
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
      title="Interview Forge"
      headline="Land The Opportunity."
      description="Great interviews aren't about perfect answers. They're about clear thinking and authentic communication."
      mission='The interviewer smiles and says, "Tell me about yourself."'
      difficulty="⭐⭐☆☆☆"
      duration="10 Minutes"
      skill1="Confidence"
      skill2="Clarity"
      skill3="Authenticity"
      coachMessage="Great interviews aren't won by memorizing answers. They're won by communicating your value."
      missionPrompt='The interviewer smiles and says, "Tell me about yourself." What do you want them to remember about you?'
      placeholder="Type your response..."
    />
  );
}
