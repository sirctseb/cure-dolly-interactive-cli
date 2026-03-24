import Link from "next/link";
import { lessonUrl } from "@/lib/lessons";
import type { LessonSummary } from "@/lib/lessons";

export function LessonNav({
  prev,
  next,
}: {
  prev: LessonSummary | null;
  next: LessonSummary | null;
}) {
  return (
    <nav className="flex justify-between items-center py-6 border-t border-gray-200 dark:border-gray-700 mt-8">
      {prev ? (
        <Link
          href={lessonUrl(prev)}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          &larr; {prev.number}. {prev.title}
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link
          href={lessonUrl(next)}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline text-right"
        >
          {next.number}. {next.title} &rarr;
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
