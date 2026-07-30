import OpenAI from "openai";
import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/api-guard";
import { loadCoachPromptContextForUser } from "@/lib/coach/memory-server";
import { analyzeTranscriptText, clampScore } from "@/lib/coach/metrics";

type TurnIn = {
  role?: string;
  text?: string;
};

export type SessionMomentum = {
  strength: string;
  improve: string;
  nextAction: string;
  breakthrough: string;
  biggestWeakness: string;
  homework: string;
  coachSummary: string;
  overallScore: number;
  confidence: number;
  empathy: number;
  listening: number;
  clarity: number;
  questionsAsked: number;
  interruptions: number;
  fillerWords: number;
};

function heuristicScores(userTexts: string[]): {
  overallScore: number;
  confidence: number;
  empathy: number;
  listening: number;
  clarity: number;
  questionsAsked: number;
  interruptions: number;
  fillerWords: number;
} {
  const habits = analyzeTranscriptText(userTexts);
  const words = habits.wordCount;
  const clarity = clampScore(
    Math.min(88, 48 + Math.min(words, 120) / 3 - habits.fillerWords * 2)
  )!;
  const confidence = clampScore(
    Math.min(90, 50 + Math.min(userTexts.length, 8) * 4)
  )!;
  const listening = clampScore(
    Math.min(92, 45 + habits.questionsAsked * 8)
  )!;
  const empathy = clampScore(Math.min(88, 55 + habits.questionsAsked * 5))!;
  const overallScore = clampScore(
    Math.round((clarity + confidence + listening + empathy) / 4)
  )!;

  return {
    overallScore,
    confidence,
    empathy,
    listening,
    clarity,
    questionsAsked: habits.questionsAsked,
    interruptions: habits.interruptions,
    fillerWords: habits.fillerWords,
  };
}

function fallbackMomentum(
  hasUserSpeech: boolean,
  userTexts: string[],
  firstName?: string
): SessionMomentum {
  const scores = heuristicScores(userTexts);
  if (!hasUserSpeech) {
    return {
      strength:
        "You chose to show up and begin — that courage already sets you apart from waiting forever.",
      improve:
        "Next time, say one full thought out loud so we can reveal what you’re already capable of.",
      nextAction:
        "Before your next real conversation, name one thing you want to sound clear about — then practice it once with Forge.",
      breakthrough: "You showed up to practice.",
      biggestWeakness: "Need one full spoken thought to coach specifically.",
      homework: "Speak one complete opening line out loud before your next conversation.",
      coachSummary:
        "Session was brief. Showing up matters — next time, give Forge one full thought to work with.",
      ...scores,
      overallScore: 55,
      confidence: 58,
      empathy: 55,
      listening: 55,
      clarity: 55,
    };
  }

  const name = firstName && firstName !== "there" ? firstName : "You";
  return {
    strength:
      `${name} practiced out loud instead of only thinking it through — that is real preparation.`,
    improve:
      "Slow down at the start of your next answer and state your main point in one sentence first.",
    nextAction:
      "In your next real conversation, lead with that one-sentence point — you’re becoming someone who prepares.",
    breakthrough: "Practiced out loud with a real coach loop.",
    biggestWeakness: "Lead with one clear sentence before expanding.",
    homework: "In your next real conversation, open with one crisp point.",
    coachSummary:
      "Solid practice rep. Strength: speaking out loud. Focus: lead with one sentence. Homework: use that opener in the real conversation.",
    ...scores,
  };
}

export async function POST(req: Request) {
  const gate = await requireApiUser();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  try {
    const body = (await req.json()) as {
      turns?: TurnIn[];
      eventTitle?: string;
    };

    const turns = Array.isArray(body.turns) ? body.turns : [];
    const userTexts = turns
      .filter(
        (t) =>
          (t.role === "founder" || t.role === "user") &&
          typeof t.text === "string" &&
          t.text.trim()
      )
      .map((t) => t.text!.trim());

    const lines = turns
      .filter((t) => typeof t.text === "string" && t.text.trim())
      .map((t) => {
        const role =
          t.role === "founder" || t.role === "user" ? "You" : "Forge";
        return `${role}: ${t.text!.trim()}`;
      });

    const hasUserSpeech = userTexts.length > 0;
    const memory = await loadCoachPromptContextForUser(gate.userId);

    const eventTitle =
      typeof body.eventTitle === "string" && body.eventTitle.trim()
        ? body.eventTitle.trim()
        : "an upcoming high-stakes conversation";

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || lines.length === 0) {
      return NextResponse.json(
        fallbackMomentum(hasUserSpeech, userTexts, memory.firstName)
      );
    }

    const client = new OpenAI({ apiKey });
    const completion = await client.responses.create({
      model: "gpt-5",
      input: `
You are Forge, the warm practice coach inside TalkForge (a communication gym).

The user just finished a short voice practice. Create a permanent session wrap for their communication history.

Member context:
- Name: ${memory.firstName}
- Sessions completed before today: ${memory.sessionsCompleted}
- Last focus: ${memory.topicsWorkingOn[0] ?? "general communication"}
- Adaptive insight: ${memory.adaptiveInsight ?? "none"}

Rules (FLA-001 + AMD-001 Human Dignity Standard):
- Honor courage first: acknowledge that showing up to practice matters.
- Reflect genuine capability with evidence — do not invent empty praise.
- Guide ONE clear, achievable behavioral improvement.
- Reinforce identity: they are becoming someone who prepares before conversations that matter.
- Coach behaviors only. Never diagnose identity. Never shame.
- Score dimensions 1–100 based only on evidence in the transcript.
- Optimize for transfer outside the app.

Target event context: ${eventTitle}

Transcript:
${lines.join("\n")}

Return ONLY valid JSON:
{
  "strength": "Honor courage + one evidenced capability (1–2 sentences)",
  "improve": "one concrete behavioral improvement (1 sentence)",
  "nextAction": "one clear real-world action (1–2 sentences)",
  "breakthrough": "today's breakthrough in one short sentence",
  "biggestWeakness": "biggest weakness / focus area in one short sentence",
  "homework": "one homework action for the real world",
  "coachSummary": "2–3 sentence coach summary of the session",
  "overallScore": 72,
  "confidence": 70,
  "empathy": 68,
  "listening": 74,
  "clarity": 71
}
`,
    });

    const raw = completion.output_text?.trim() ?? "";
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned) as Partial<SessionMomentum>;
    const scores = heuristicScores(userTexts);

    if (
      typeof parsed.strength !== "string" ||
      typeof parsed.improve !== "string" ||
      typeof parsed.nextAction !== "string"
    ) {
      return NextResponse.json(
        fallbackMomentum(hasUserSpeech, userTexts, memory.firstName)
      );
    }

    return NextResponse.json({
      strength: parsed.strength.trim(),
      improve: parsed.improve.trim(),
      nextAction: parsed.nextAction.trim(),
      breakthrough:
        typeof parsed.breakthrough === "string"
          ? parsed.breakthrough.trim()
          : parsed.strength.trim(),
      biggestWeakness:
        typeof parsed.biggestWeakness === "string"
          ? parsed.biggestWeakness.trim()
          : parsed.improve.trim(),
      homework:
        typeof parsed.homework === "string"
          ? parsed.homework.trim()
          : parsed.nextAction.trim(),
      coachSummary:
        typeof parsed.coachSummary === "string"
          ? parsed.coachSummary.trim()
          : `${parsed.strength.trim()} Focus: ${parsed.improve.trim()}`,
      overallScore:
        clampScore(parsed.overallScore) ?? scores.overallScore,
      confidence: clampScore(parsed.confidence) ?? scores.confidence,
      empathy: clampScore(parsed.empathy) ?? scores.empathy,
      listening: clampScore(parsed.listening) ?? scores.listening,
      clarity: clampScore(parsed.clarity) ?? scores.clarity,
      questionsAsked: scores.questionsAsked,
      interruptions: scores.interruptions,
      fillerWords: scores.fillerWords,
    } satisfies SessionMomentum);
  } catch (err) {
    console.error("session-momentum", err);
    return NextResponse.json(fallbackMomentum(true, [], "there"), {
      status: 200,
    });
  }
}
