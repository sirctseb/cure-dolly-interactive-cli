import { notFound } from "next/navigation";
import { getLesson, getAdjacentLessons, getLessonIndex } from "@/lib/lessons";
import { LESSON_ORDER } from "@/lib/lesson-order";
import { LessonContent } from "@/components/LessonContent";
import { YouTubeEmbed } from "@/components/YouTubeEmbed";
import { LessonNav } from "@/components/LessonNav";
import { Chat } from "@/components/Chat";
import Link from "next/link";

export function generateStaticParams() {
  return LESSON_ORDER.map((slug) => ({ slug }));
}

export function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  // This is fine as a sync-like usage since generateStaticParams provides all slugs
  return params.then(({ slug }) => {
    const idx = getLessonIndex(slug);
    if (idx === -1) return { title: "Not Found" };
    const lesson = getLesson(slug);
    return { title: `${lesson.number}. ${lesson.title} — Cure Dolly` };
  });
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const idx = getLessonIndex(slug);
  if (idx === -1) notFound();

  const lesson = getLesson(slug);
  const { prev, next } = getAdjacentLessons(slug);

  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <Link
        href="/"
        className="text-sm text-gray-500 dark:text-gray-400 hover:underline mb-4 inline-block"
      >
        &larr; All lessons
      </Link>

      {lesson.youtubeId && <YouTubeEmbed videoId={lesson.youtubeId} />}

      <LessonContent html={lesson.html} />

      <Chat lessonSlug={slug} />

      <LessonNav prev={prev} next={next} />
    </main>
  );
}
