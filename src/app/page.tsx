import { getAllLessonSummaries } from "@/lib/lessons";
import { TableOfContents } from "@/components/TableOfContents";

export default function Home() {
  const lessons = getAllLessonSummaries();
  return (
    <main className="max-w-3xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">
        Cure Dolly&apos;s Organic Japanese
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        Interactive Japanese grammar course based on Cure Dolly&apos;s video
        series. {lessons.length} lessons.
      </p>
      <TableOfContents lessons={lessons} />
    </main>
  );
}
