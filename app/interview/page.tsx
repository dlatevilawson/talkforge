import TrainingArena from "@/app/components/TrainingArena";

export default function InterviewPage() {
  return (
    <TrainingArena
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