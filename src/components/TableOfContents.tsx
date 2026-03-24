import Link from "next/link";
import { lessonUrl } from "@/lib/lessons";
import type { LessonSummary } from "@/lib/lessons";

export function TableOfContents({ lessons }: { lessons: LessonSummary[] }) {
  return (
    <ol className="space-y-1">
      {lessons.map((lesson) => (
        <li key={lesson.slug}>
          <Link
            href={lessonUrl(lesson)}
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            {lesson.number}. {lesson.title}
          </Link>
        </li>
      ))}
    </ol>
  );
}
