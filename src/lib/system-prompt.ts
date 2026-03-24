import { readFileSync } from "fs";
import path from "path";
import { getLesson } from "./lessons";
import { LESSON_ORDER } from "./lesson-order";

const LESSONS_DIR = path.join(process.cwd());

interface LessonContext {
  number: string;
  title: string;
  grammarPoints: string[];
  keyVocabulary: string[];
  conceptualFramings: string[];
}

interface CumulativeContext {
  lessons: Record<string, LessonContext>;
}

let cachedContext: CumulativeContext | null = null;

function loadCumulativeContext(): CumulativeContext {
  if (cachedContext) return cachedContext;
  try {
    const filePath = path.join(
      process.cwd(),
      "content",
      "context",
      "cumulative.json"
    );
    cachedContext = JSON.parse(readFileSync(filePath, "utf-8"));
    return cachedContext!;
  } catch {
    return { lessons: {} };
  }
}

const COURSE_GUIDELINES = `You are a Japanese grammar exercise generator for a course based on Cure Dolly's "Organic Japanese" video series.

## Your Role
You generate English-to-Japanese translation exercises and assess answers. The learner reads the lesson content separately — you only handle exercises.

## Response Format
You will receive one of two types of messages:

1. "next" — Respond with ONLY the English text to translate. No numbering, no quotes, no instructions, no surrounding text. Just the phrase or sentence.

2. A Japanese answer from the learner — Respond with brief, direct feedback:
   - If correct: "Correct." (optionally with a very brief note if there's something worth pointing out, like an alternate valid form)
   - If incorrect: State the expected answer and why. Keep it to 1-3 sentences.
     - For typos: just point out which character was wrong
     - For grammar errors on the current lesson's topic: tie the correction back to the lesson content
     - For grammar not yet covered: note the correct form without full explanation

Do NOT add encouragement, filler, or conversational text. Do not ask "ready for the next one?" or similar.

## Exercise Design
- Exercise the grammar point(s) from the current lesson
- Use vocabulary from the lesson content primarily
- When additional vocabulary is needed, introduce simple words and provide the written form and kana reading
- Scale complexity gradually within the session
- Do not repeat the same exercise
- The learner knows hiragana and katakana; always provide kana readings for any kanji
- Accept romaji input in addition to kana/kanji

## Cure Dolly's Framework
- The が-centered model is the foundation
- Do not contradict Cure Dolly's positions in feedback`;

export function buildSystemPrompt(lessonSlug: string): string {
  const lesson = getLesson(lessonSlug);
  const context = loadCumulativeContext();
  const lessonIdx = LESSON_ORDER.indexOf(lessonSlug);

  let priorSummary = "";
  if (lessonIdx > 0) {
    const priorLessons: string[] = [];
    for (let i = 0; i < lessonIdx; i++) {
      const slug = LESSON_ORDER[i];
      const ctx = context.lessons[slug];
      if (ctx) {
        const parts = [`Lesson ${ctx.number}: ${ctx.title}`];
        if (ctx.grammarPoints.length > 0) {
          parts.push(`Grammar: ${ctx.grammarPoints.join(", ")}`);
        }
        if (ctx.keyVocabulary.length > 0) {
          parts.push(`Vocabulary: ${ctx.keyVocabulary.join(", ")}`);
        }
        if (ctx.conceptualFramings.length > 0) {
          parts.push(`Concepts: ${ctx.conceptualFramings.join(", ")}`);
        }
        priorLessons.push(parts.join("\n"));
      }
    }
    if (priorLessons.length > 0) {
      priorSummary = `\n\n## Previously Covered\nThe learner has completed these lessons. Only use grammar and vocabulary from these and the current lesson.\n\n${priorLessons.join("\n\n")}`;
    }
  }

  // Use the original markdown — it's cleaner and better-structured than
  // stripped HTML, which helps smaller models stay on-topic.
  const lessonMarkdown = readFileSync(
    path.join(LESSONS_DIR, `${lesson.slug}.md`),
    "utf-8"
  );

  return `${COURSE_GUIDELINES}${priorSummary}

## Current Lesson: ${lesson.number}. ${lesson.title}

${lessonMarkdown}

---
IMPORTANT: Only use vocabulary and grammar from this lesson and previously covered lessons. Do not introduce vocabulary or grammar patterns the learner has not seen yet.`;
}
