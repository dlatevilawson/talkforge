import TrainingArena from "@/app/components/TrainingArena";

export default async function NegotiationPage({
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
      title="Negotiation Forge"
      headline="Create Win-Win Outcomes."
      description="The best negotiators seek understanding before agreement."
      mission="Your client says your price is too expensive."
      difficulty="⭐⭐⭐☆☆"
      duration="10 Minutes"
      skill1="Listening"
      skill2="Influence"
      skill3="Confidence"
      coachMessage="Negotiation isn't about winning. It's about creating value while protecting what matters."
      missionPrompt="A client says your price is too high. How do you respond without immediately lowering your price?"
      placeholder="Type your negotiation strategy..."
    />
  );
}
