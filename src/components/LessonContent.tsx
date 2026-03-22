export function LessonContent({ html }: { html: string }) {
  return (
    <article
      className="prose prose-lg dark:prose-invert max-w-none
        prose-img:rounded-lg prose-img:mx-auto
        [&_.container]:rounded-lg [&_.container]:p-4 [&_.container]:my-4
        [&_.container.info]:bg-blue-50 [&_.container.info]:dark:bg-blue-950 [&_.container.info]:border [&_.container.info]:border-blue-200 [&_.container.info]:dark:border-blue-800
        [&_.container.tip]:bg-green-50 [&_.container.tip]:dark:bg-green-950 [&_.container.tip]:border [&_.container.tip]:border-green-200 [&_.container.tip]:dark:border-green-800
        [&_.container.warning]:bg-yellow-50 [&_.container.warning]:dark:bg-yellow-950 [&_.container.warning]:border [&_.container.warning]:border-yellow-200 [&_.container.warning]:dark:border-yellow-800
        [&_.container.danger]:bg-red-50 [&_.container.danger]:dark:bg-red-950 [&_.container.danger]:border [&_.container.danger]:border-red-200 [&_.container.danger]:dark:border-red-800"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
