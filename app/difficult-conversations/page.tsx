import TrainingArena from "@/app/components/TrainingArena";

export default function DifficultConversationsPage() {
  return (
    <TrainingArena
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