import type { ForgeCheckInPayload, ForgeCueKind } from "./types.ts";

const KIND_LABEL: Record<ForgeCueKind, string> = {
  upcoming_conversation: "upcoming conversation",
  practice_follow_up: "practice follow-up",
  homework: "homework",
};

export function practiceHrefForTitle(title: string): string {
  const trimmed = title.trim();
  return `/app/practice?start=1&title=${encodeURIComponent(trimmed)}`;
}

/** Deterministic in-app check-in. No LLM. States why the cue exists. */
export function buildCheckInCopy(input: {
  kind: ForgeCueKind;
  title: string;
  successCriteria?: string | null;
}): ForgeCheckInPayload {
  const title = input.title.trim();
  const label = KIND_LABEL[input.kind];
  const success = input.successCriteria?.trim();
  return {
    whySent: `This check-in exists because you declared a ${label}: "${title}".`,
    body: success
      ? `One next move: rehearse "${title}" until ${success}.`
      : `One next move: rehearse "${title}" before that moment arrives.`,
    practiceHref: practiceHrefForTitle(title),
  };
}
