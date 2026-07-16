import AppShell from "@/app/components/AppShell";
import MissionPicker from "@/app/components/MissionPicker";

export default function TrainingPage() {
  return (
    <AppShell>
      <MissionPicker
        title="What would you like to forge today?"
        subtitle="Every conversation is another opportunity to become more confident, more thoughtful, and more capable."
      />
    </AppShell>
  );
}
