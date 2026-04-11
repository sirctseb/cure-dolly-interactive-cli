import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt } from "@/lib/system-prompt";
import { getLessonByNumber } from "@/lib/lessons";
import { NextRequest } from "next/server";

const anthropic = new Anthropic();

/**
 * GET /api/test-exercises?lesson=5&count=10
 *
 * Generates a batch of exercise prompts for review.
 * Returns plain text, one exercise per line.
 */
export async function GET(request: NextRequest) {
  const lessonNumber = request.nextUrl.searchParams.get("lesson") ?? "5";
  const count = parseInt(request.nextUrl.searchParams.get("count") ?? "10", 10);

  const lesson = getLessonByNumber(lessonNumber);
  if (!lesson) {
    return Response.json({ error: `No lesson ${lessonNumber}` }, { status: 400 });
  }

  const systemPrompt = buildSystemPrompt(lesson.slug);

  const response = await anthropic.messages.create({
    model: "claude-opus-4-6",
    max_tokens: 2048,
    system: [
      {
        type: "text",
        text: systemPrompt,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: `Generate ${count} exercise prompts for this lesson. Output ONLY the English text, one per line, no numbering. Each exercise should require the learner to use the grammar point(s) from this lesson.`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  return new Response(text, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
