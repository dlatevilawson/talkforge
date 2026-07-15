import TrainingArena from "@/app/components/TrainingArena";

export default function StorytellingPage() {
  return (
    <TrainingArena
      title="Storytelling Forge"
      headline="Stories People Remember."
      description="Facts inform. Stories inspire."
      mission="Tell a story about a challenge that changed you."
      difficulty="⭐⭐☆☆☆"
      duration="10 Minutes"
      skill1="Creativity"
      skill2="Emotion"
      skill3="Structure"
      coachMessage="People rarely remember perfect words. They remember how your story made them feel."
      missionPrompt="Share a personal story about overcoming a challenge. Focus on what you learned."
      placeholder="Begin your story..."
    />
  );
}