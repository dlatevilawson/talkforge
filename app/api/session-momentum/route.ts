import OpenAI from "openai";
import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/api-guard";
import { loadCoachPromptContextForUser } from "@/lib/coach/memory-server";
import { analyzeTranscriptText, clampScore } from "@/lib/coach/metrics";
import { FORGE_MENTOR_PHILOSOPHY } from "@/lib/coach/philosophy";

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
      strength: "You showed up. That already counts.",
      improve: "Next time, say one full thought out loud — even a messy one.",
      nextAction:
        "Before your next real conversation, notice one thing you want to sound clear about.",
      breakthrough: "You showed up to practice.",
      biggestWeakness: "We still need one full spoken thought to work with.",
      homework: "Speak one complete opening line out loud before your next conversation.",
      coachSummary:
        "Short session. Showing up mattered. Next time we’ll sit with one real thought together.",
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
    strength: `${name} practiced out loud instead of only thinking it through.`,
    improve:
      "Would it help to start your next answer with one clear sentence before expanding?",
    nextAction:
      "In your next real conversation, try leading with that one sentence — see how it feels.",
    breakthrough: "Practiced out loud, not just in your head.",
    biggestWeakness: "Starting with one clear sentence before expanding.",
    homework: "Open your next real conversation with one crisp point.",
    coachSummary:
      "Good rep. You spoke. Next time we can slow the opening and find the line that feels like you.",
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
You are Forge, a mentor wrapping a short practice session inside TalkForge.

${FORGE_MENTOR_PHILOSOPHY}

Create a permanent session wrap that sounds like someone who was paying attention — not a report card.

Member context:
- Name: ${memory.firstName}
- Sessions completed before today: ${memory.sessionsCompleted}
- Patterns noticed: ${memory.speakingHabits.join("; ") || "none yet"}
- Pattern insight: ${memory.adaptiveInsight ?? "none"}

Rules:
- Honor courage first with evidence — never empty praise.
- Celebrate one small win before naming a focus.
- Name the single highest-impact improvement — one, not a list.
- Phrase improvement as an invitation ("would something like this…") not a command ("try this").
- coachSummary should sound like a mentor noticing a pattern in 2–3 short sentences.
- Never shame. Never diagnose identity. Behaviors only.
- Score dimensions 1–100 from transcript evidence only.
- Optimize for transfer outside the app.
- Sound like someone who was in the room — not a report card or chatbot wrap.

Target event context: ${eventTitle}

Transcript:
${lines.join("\n")}

Return ONLY valid JSON:
{
  "strength": "one evidenced strength (1–2 short sentences)",
  "improve": "one invited improvement (1 sentence, not a command)",
  "nextAction": "one real-world next step that feels owned by them (1–2 sentences)",
  "breakthrough": "today's breakthrough in one short sentence",
  "biggestWeakness": "focus area in one short, kind sentence",
  "homework": "one homework action for the real world",
  "coachSummary": "2–3 short mentor sentences — noticed pattern + warm close",
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
