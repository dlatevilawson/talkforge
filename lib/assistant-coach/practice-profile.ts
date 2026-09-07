/**
 * Decision 060 member practice-profile contract.
 *
 * Catalog IDs and labels are persisted product contracts. This module is pure:
 * it validates member declarations and projects the verification template
 * without model calls, inference, or System 1 evidence writes.
 */

export const PRACTICE_PROFILE_CATALOG_VERSION = 1;
export const PRACTICE_PROFILE_CUSTOM_TEXT_MAX_LENGTH = 280;

export const PRACTICE_TOPIC_CATALOG = [
  { id: "job_interview", label: "Job interview" },
  { id: "salary_raise_negotiation", label: "Salary / raise negotiation" },
  { id: "giving_difficult_feedback", label: "Giving difficult feedback" },
  { id: "setting_a_boundary", label: "Setting a boundary" },
  { id: "pitch_or_presentation", label: "Pitch or presentation" },
  { id: "handling_conflict", label: "Handling conflict" },
  {
    id: "asking_for_something_i_need",
    label: "Asking for something I need",
  },
  { id: "receiving_critical_feedback", label: "Receiving critical feedback" },
  { id: "ending_a_relationship", label: "Ending a relationship" },
  { id: "something_else", label: "Something else" },
] as const;

export const PRACTICE_AUDIENCE_CATALOG = [
  { id: "manager_boss", label: "Manager/boss" },
  { id: "peer_colleague", label: "Peer/colleague" },
  { id: "client_customer", label: "Client/customer" },
  { id: "recruiter_hr", label: "Recruiter/HR" },
  { id: "business_partner", label: "Business partner" },
  { id: "family_friend", label: "Family/friend" },
  { id: "stranger_new_contact", label: "Stranger/new contact" },
] as const;

export const PRACTICE_PATTERN_CATALOG = [
  { id: "freeze", label: "I freeze and don't know what to say" },
  { id: "ramble", label: "I ramble and lose the thread" },
  { id: "emotional_defensive", label: "I get emotional or defensive" },
  { id: "harsh_aggressive", label: "I sound too harsh or aggressive" },
  { id: "cave_under_pushback", label: "I cave as soon as they push back" },
  { id: "avoid_entirely", label: "I avoid the conversation entirely" },
] as const;

export const PRACTICE_URGENCY_CATALOG = [
  { id: "today", label: "Today" },
  { id: "this_week", label: "This week" },
  { id: "next_2_weeks", label: "In the next 2 weeks" },
  { id: "no_specific_deadline", label: "No specific deadline" },
] as const;

export type PracticeTopicId = (typeof PRACTICE_TOPIC_CATALOG)[number]["id"];
export type PracticeAudienceId =
  (typeof PRACTICE_AUDIENCE_CATALOG)[number]["id"];
export type PracticePatternId =
  (typeof PRACTICE_PATTERN_CATALOG)[number]["id"];
export type PracticeUrgencyId =
  (typeof PRACTICE_URGENCY_CATALOG)[number]["id"];

export type PracticeTopicSelection = {
  id: PracticeTopicId;
  customText: string | null;
};

/** Member-controlled declarations only; timestamps/provenance are added server-side. */
export type MemberPracticeProfileSelection = {
  topics: PracticeTopicSelection[];
  audiences: PracticeAudienceId[];
  pattern: PracticePatternId;
  urgency: PracticeUrgencyId;
};

export type MemberPracticeProfile = MemberPracticeProfileSelection & {
  verifiedAt: string;
  updatedAt: string;
  provenance: {
    kind: "member_declared";
    source: "coach_card_wizard";
    sourceSessionId: string;
  };
};

export type PracticeProfileProjection = {
  mappingVersion: typeof PRACTICE_PROFILE_CATALOG_VERSION;
  focusAreas: {
    topics: string[];
    audiences: string[];
    urgency: string;
  };
  patternTemplate: string;
  initialForgeTarget: string;
};

export class PracticeProfileValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PracticeProfileValidationError";
  }
}

const topicById = new Map(PRACTICE_TOPIC_CATALOG.map((item) => [item.id, item]));
const audienceById = new Map(
  PRACTICE_AUDIENCE_CATALOG.map((item) => [item.id, item])
);
const patternById = new Map(
  PRACTICE_PATTERN_CATALOG.map((item) => [item.id, item])
);
const urgencyById = new Map(
  PRACTICE_URGENCY_CATALOG.map((item) => [item.id, item])
);

const patternTemplateById: Record<PracticePatternId, string> = {
  freeze: "You tend to freeze when the stakes are high.",
  ramble: "You tend to ramble and lose the thread when the pressure rises.",
  emotional_defensive:
    "You tend to get emotional or defensive when a conversation gets difficult.",
  harsh_aggressive:
    "You tend to sound too harsh or aggressive when you need to be heard.",
  cave_under_pushback: "You tend to cave when someone pushes back.",
  avoid_entirely: "You tend to avoid conversations that feel difficult.",
};

const topicTargetPhraseById: Record<
  Exclude<PracticeTopicId, "something_else">,
  string
> = {
  job_interview: "a job interview",
  salary_raise_negotiation: "a salary / raise negotiation",
  giving_difficult_feedback: "giving difficult feedback",
  setting_a_boundary: "setting a boundary",
  pitch_or_presentation: "a pitch or presentation",
  handling_conflict: "handling conflict",
  asking_for_something_i_need: "asking for something you need",
  receiving_critical_feedback: "receiving critical feedback",
  ending_a_relationship: "ending a relationship",
};

function asRecord(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new PracticeProfileValidationError(`${field} must be an object.`);
  }
  return value as Record<string, unknown>;
}

function assertExactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
  field: string
): void {
  const allowed = new Set(keys);
  if (Object.keys(value).some((key) => !allowed.has(key))) {
    throw new PracticeProfileValidationError(
      `${field} contains an unsupported field.`
    );
  }
}

function requireCatalogId<T extends string>(
  value: unknown,
  catalog: ReadonlyMap<string, unknown>,
  field: string
): T {
  if (typeof value !== "string" || !catalog.has(value)) {
    throw new PracticeProfileValidationError(`${field} has an unknown ID.`);
  }
  return value as T;
}

function assertUnique(values: readonly string[], field: string): void {
  if (new Set(values).size !== values.length) {
    throw new PracticeProfileValidationError(`${field} must not repeat IDs.`);
  }
}

function isIsoTimestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) &&
    Number.isFinite(Date.parse(value))
  );
}

export function validateMemberPracticeProfileSelection(
  value: unknown
): MemberPracticeProfileSelection {
  const input = asRecord(value, "memberPracticeProfile");
  assertExactKeys(input, ["topics", "audiences", "pattern", "urgency"], "memberPracticeProfile");

  if (!Array.isArray(input.topics) || input.topics.length < 1 || input.topics.length > 3) {
    throw new PracticeProfileValidationError("topics must contain 1–3 selections.");
  }
  const topics = input.topics.map((raw, index): PracticeTopicSelection => {
    const topic = asRecord(raw, `topics[${index}]`);
    assertExactKeys(topic, ["id", "customText"], `topics[${index}]`);
    const id = requireCatalogId<PracticeTopicId>(
      topic.id,
      topicById,
      `topics[${index}].id`
    );
    if (id !== "something_else" && topic.customText != null) {
      throw new PracticeProfileValidationError(
        "customText is allowed only for something_else."
      );
    }
    if (topic.customText != null && typeof topic.customText !== "string") {
      throw new PracticeProfileValidationError("customText must be text or null.");
    }
    const customText =
      typeof topic.customText === "string" ? topic.customText.trim() : null;
    if (customText !== null && (customText.length < 1 || customText.length > PRACTICE_PROFILE_CUSTOM_TEXT_MAX_LENGTH)) {
      throw new PracticeProfileValidationError(
        `customText must contain 1–${PRACTICE_PROFILE_CUSTOM_TEXT_MAX_LENGTH} characters.`
      );
    }
    return { id, customText };
  });
  assertUnique(topics.map((topic) => topic.id), "topics");

  if (
    !Array.isArray(input.audiences) ||
    input.audiences.length < 1 ||
    input.audiences.length > PRACTICE_AUDIENCE_CATALOG.length
  ) {
    throw new PracticeProfileValidationError(
      "audiences must contain at least one selection."
    );
  }
  const audiences = input.audiences.map((id, index) =>
    requireCatalogId<PracticeAudienceId>(
      id,
      audienceById,
      `audiences[${index}]`
    )
  );
  assertUnique(audiences, "audiences");

  return {
    topics,
    audiences,
    pattern: requireCatalogId<PracticePatternId>(
      input.pattern,
      patternById,
      "pattern"
    ),
    urgency: requireCatalogId<PracticeUrgencyId>(
      input.urgency,
      urgencyById,
      "urgency"
    ),
  };
}

/** Server boundary: adds verification timestamps and trusted source reference. */
export function createVerifiedMemberPracticeProfile(input: {
  selection: unknown;
  sourceSessionId: string;
  now?: Date;
}): MemberPracticeProfile {
  const selection = validateMemberPracticeProfileSelection(input.selection);
  const sourceSessionId =
    typeof input.sourceSessionId === "string"
      ? input.sourceSessionId.trim()
      : "";
  if (!sourceSessionId || sourceSessionId.length > 200) {
    throw new PracticeProfileValidationError(
      "sourceSessionId must contain 1–200 characters."
    );
  }
  const timestamp = (input.now ?? new Date()).toISOString();
  return {
    ...selection,
    verifiedAt: timestamp,
    updatedAt: timestamp,
    provenance: {
      kind: "member_declared",
      source: "coach_card_wizard",
      sourceSessionId,
    },
  };
}

export function parseMemberPracticeProfile(
  value: unknown
): MemberPracticeProfile | null {
  if (
    value == null ||
    (typeof value === "object" &&
      !Array.isArray(value) &&
      Object.keys(value).length === 0)
  ) {
    return null;
  }
  try {
    const input = asRecord(value, "memberPracticeProfile");
    assertExactKeys(
      input,
      [
        "topics",
        "audiences",
        "pattern",
        "urgency",
        "verifiedAt",
        "updatedAt",
        "provenance",
      ],
      "memberPracticeProfile"
    );
    const selection = validateMemberPracticeProfileSelection({
      topics: input.topics,
      audiences: input.audiences,
      pattern: input.pattern,
      urgency: input.urgency,
    });
    if (
      !isIsoTimestamp(input.verifiedAt) ||
      !isIsoTimestamp(input.updatedAt) ||
      Date.parse(input.updatedAt) < Date.parse(input.verifiedAt)
    ) {
      throw new PracticeProfileValidationError(
        "verifiedAt and updatedAt must be ordered ISO-8601 timestamps."
      );
    }
    const provenance = asRecord(input.provenance, "provenance");
    assertExactKeys(
      provenance,
      ["kind", "source", "sourceSessionId"],
      "provenance"
    );
    if (
      provenance.kind !== "member_declared" ||
      provenance.source !== "coach_card_wizard" ||
      typeof provenance.sourceSessionId !== "string" ||
      !provenance.sourceSessionId.trim() ||
      provenance.sourceSessionId.trim().length > 200
    ) {
      throw new PracticeProfileValidationError(
        "provenance must be a verified member wizard declaration."
      );
    }
    return {
      ...selection,
      verifiedAt: input.verifiedAt,
      updatedAt: input.updatedAt,
      provenance: {
        kind: "member_declared",
        source: "coach_card_wizard",
        sourceSessionId: provenance.sourceSessionId.trim(),
      },
    };
  } catch {
    return null;
  }
}

export function projectMemberPracticeProfile(
  value: MemberPracticeProfileSelection
): PracticeProfileProjection {
  const selection = validateMemberPracticeProfileSelection(value);
  const topicLabels = selection.topics.map(
    (topic) =>
      topic.customText ?? topicById.get(topic.id)!.label
  );
  const audienceLabels = selection.audiences.map(
    (audience) => audienceById.get(audience)!.label
  );
  const urgencyLabel = urgencyById.get(selection.urgency)!.label;
  const firstTopic = selection.topics[0];
  const targetPhrase =
    firstTopic.id === "something_else"
      ? `the moment “${firstTopic.customText}”`
      : topicTargetPhraseById[firstTopic.id];

  return {
    mappingVersion: PRACTICE_PROFILE_CATALOG_VERSION,
    focusAreas: {
      topics: topicLabels,
      audiences: audienceLabels,
      urgency: urgencyLabel,
    },
    patternTemplate: patternTemplateById[selection.pattern],
    initialForgeTarget: `Practice ${targetPhrase} with ${audienceLabels[0]}.`,
  };
}
