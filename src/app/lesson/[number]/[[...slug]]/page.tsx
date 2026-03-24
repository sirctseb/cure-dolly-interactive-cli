import { notFound } from "next/navigation";
import {
  getLessonByNumber,
  getAdjacentLessonsByNumber,
  getAllLessonSummaries,
  getVanitySlug,
} from "@/lib/lessons";
import { LessonContent } from "@/components/LessonContent";
import { YouTubeEmbed } from "@/components/YouTubeEmbed";
import { LessonNav } from "@/components/LessonNav";
import { Exercise } from "@/components/Exercise";
import Link from "next/link";

export function generateStaticParams() {
  return getAllLessonSummaries().map((l) => ({
    number: l.number,
    slug: [getVanitySlug(l.slug)],
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  const { number } = await params;
  const lesson = getLessonByNumber(number);
  if (!lesson) return { title: "Not Found" };
  return { title: `${lesson.number}. ${lesson.title} — Cure Dolly` };
}

export default async function LessonPage({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  const { number } = await params;
  const lesson = getLessonByNumber(number);
  if (!lesson) notFound();

  const { prev, next } = getAdjacentLessonsByNumber(number);

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

      <Exercise lessonSlug={lesson.slug} />

      <LessonNav prev={prev} next={next} />
    </main>
  );
}
