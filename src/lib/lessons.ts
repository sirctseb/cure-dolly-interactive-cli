import { readFileSync } from "fs";
import path from "path";
import { LESSON_ORDER } from "./lesson-order";

export interface Lesson {
  slug: string;
  number: string;
  title: string;
  youtubeId: string | null;
  html: string;
}

export interface LessonSummary {
  slug: string;
  number: string;
  title: string;
}

const CONTENT_DIR = path.join(process.cwd(), "content", "lessons");

export function getLesson(slug: string): Lesson {
  const filePath = path.join(CONTENT_DIR, `${slug}.json`);
  const data = readFileSync(filePath, "utf-8");
  return JSON.parse(data) as Lesson;
}

export function getLessonByIndex(index: number): Lesson {
  return getLesson(LESSON_ORDER[index]);
}

export function getAllLessonSummaries(): LessonSummary[] {
  return LESSON_ORDER.map((slug) => {
    const lesson = getLesson(slug);
    return { slug: lesson.slug, number: lesson.number, title: lesson.title };
  });
}

export function getLessonIndex(slug: string): number {
  return LESSON_ORDER.indexOf(slug);
}

export function getLessonByNumber(number: string): Lesson | null {
  const slug = LESSON_ORDER.find((s) => {
    const lesson = getLesson(s);
    return lesson.number === number;
  });
  return slug ? getLesson(slug) : null;
}

export function getAdjacentLessonsByNumber(number: string): {
  prev: LessonSummary | null;
  next: LessonSummary | null;
} {
  const lesson = getLessonByNumber(number);
  if (!lesson) return { prev: null, next: null };
  return getAdjacentLessons(lesson.slug);
}

export function getAllLessonNumbers(): string[] {
  return LESSON_ORDER.map((slug) => getLesson(slug).number);
}

export function getAdjacentLessons(slug: string): {
  prev: LessonSummary | null;
  next: LessonSummary | null;
} {
  const idx = getLessonIndex(slug);
  return {
    prev:
      idx > 0
        ? (() => {
            const l = getLesson(LESSON_ORDER[idx - 1]);
            return { slug: l.slug, number: l.number, title: l.title };
          })()
        : null,
    next:
      idx < LESSON_ORDER.length - 1
        ? (() => {
            const l = getLesson(LESSON_ORDER[idx + 1]);
            return { slug: l.slug, number: l.number, title: l.title };
          })()
        : null,
  };
}
