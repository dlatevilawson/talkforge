import TrainingArena from "@/app/components/TrainingArena";

export default function LeadershipPage() {
  return (
    <TrainingArena
      title="Leadership Forge"
      headline="Become the Leader People Remember."
      description="Leadership is communication under pressure."
      mission="Help a talented employee who has started missing deadlines."
      difficulty="⭐⭐⭐☆☆"
      duration="10 Minutes"
      skill1="Listening"
      skill2="Empathy"
      skill3="Leadership"
      coachMessage="Leadership isn't about having all the answers. It's about asking better questions."
      missionPrompt="Your employee has missed three deadlines. Before you respond... what do you think is happening?"
      placeholder="Type your response..."
    />
  );
}