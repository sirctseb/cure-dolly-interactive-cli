import { readFileSync } from "fs";
import path from "path";
import { getLesson } from "./lessons";
import { LESSON_ORDER } from "./lesson-order";

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
    // Context file not yet generated — return empty
    return { lessons: {} };
  }
}

const COURSE_GUIDELINES = `You are an interactive Japanese grammar tutor for a course based on Cure Dolly's "Organic Japanese" video series.

## Your Role
- Present lesson content and run interactive practice sessions
- Help the learner internalize Japanese grammar through English-to-Japanese production exercises

## Learner Assumptions
- Knows hiragana and katakana (do not teach or test these)
- May know some kanji; always provide kana readings for kanji
- No prior grammar knowledge beyond what has been covered in current and earlier lessons
- Studying spoken conversational Japanese
- Inputs Japanese using kana and kanji (not romaji), but accept romaji input gracefully

## Practice Sessions
After presenting a lesson, run an interactive practice session:
- Present English words or sentences for the learner to translate to Japanese
- Assess their response and provide feedback
- Exercise the grammar point(s) from the current lesson
- Use vocabulary from the lesson content; introduce simple new words as needed with readings
- Scale exercise count to lesson complexity
- When correct: confirm briefly, move on
- When incorrect: state what you expected and why
  - Typos: just point out the wrong character
  - Grammar errors on current topic: tie correction to lesson content
  - Grammar not yet covered: note the correct form without full explanation
- The learner may ask to move on or request more practice — respect either

## Cure Dolly's Framework
- Present Cure Dolly's explanations as stated; do not contradict or soften her positions
- The が-centered model is the foundation of the course
- If asked for clarification, explain in your own words but stay within Cure Dolly's framework

## Tone
- Clear, direct, concise
- No personality or character voice
- Do not over-praise or add filler`;

export function buildSystemPrompt(lessonSlug: string): string {
  const lesson = getLesson(lessonSlug);
  const context = loadCumulativeContext();
  const lessonIdx = LESSON_ORDER.indexOf(lessonSlug);

  // Build cumulative summary of prior lessons
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
      priorSummary = `\n\n## Previously Covered\nThe learner has completed the following lessons. You may reference this material but should not re-teach it unless asked.\n\n${priorLessons.join("\n\n")}`;
    }
  }

  // Strip the HTML tags from lesson content for the system prompt — Claude works
  // better with the markdown source. But we already converted to HTML. For now,
  // include a simplified text version by stripping tags.
  const lessonText = lesson.html
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return `${COURSE_GUIDELINES}${priorSummary}

## Current Lesson: ${lesson.number}. ${lesson.title}

${lessonText}

---
The learner is reading the lesson content on the web page above this chat. Do NOT present or summarize the lesson content. Go straight to practice exercises. Start with a brief greeting and your first exercise prompt.`;
}
