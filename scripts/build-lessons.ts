/**
 * Build script: converts lesson markdown files into JSON for the Next.js app.
 *
 * For each lesson in LESSON_ORDER, reads the .md file from the project root,
 * parses it into HTML (handling VitePress containers and cross-references),
 * extracts metadata (title, lesson number, YouTube ID), and writes a JSON file
 * to content/lessons/<slug>.json.
 *
 * Run: npx tsx scripts/build-lessons.ts
 */

import { readFileSync, writeFileSync, mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import rehypeRaw from "rehype-raw";
import rehypeStringify from "rehype-stringify";

// Import lesson order — tsx handles TS imports from scripts
import { LESSON_ORDER } from "../src/lib/lesson-order.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "content", "lessons");

interface LessonData {
  slug: string;
  number: string; // "1", "7.5", "8b", etc.
  title: string;
  youtubeId: string | null;
  html: string;
}

/** Extract YouTube video ID from a YouTube URL. */
function extractYoutubeId(url: string): string | null {
  const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

/** Extract lesson number and title from the first heading. */
function parseTitle(line: string): { number: string; title: string } {
  // Headings look like: # **1. The Basic Types of Sentences**
  // or: # **7.5. Conjugation**
  // or: # **8b. Particles explained.**
  const match = line.match(
    /^#\s+\*?\*?(\d+(?:\.\d+)?[a-z]?)[\.\s]+(.+?)(?:\*\*)?$/
  );
  if (match) {
    return { number: match[1], title: match[2].replace(/\*+$/g, "").trim() };
  }
  // Fallback: just use the whole heading
  return {
    number: "",
    title: line.replace(/^#+\s*\**/g, "").replace(/\*+$/g, "").trim(),
  };
}

/**
 * Pre-process markdown to handle VitePress-specific syntax before
 * passing to the unified pipeline.
 */
function preprocessMarkdown(md: string): string {
  let result = md;

  // Convert ::: containers to HTML divs
  // ::: info          → <div class="container info">
  // ::: tip           → <div class="container tip">
  // ::: details Title → <details><summary>Title</summary>
  // :::               → closing tag
  const lines = result.split("\n");
  const output: string[] = [];
  const containerStack: string[] = [];

  for (const line of lines) {
    const containerMatch = line.match(/^:::\s*(info|tip|warning|danger)\s*$/);
    const detailsMatch = line.match(/^:::\s*details\s+(.+)$/);
    const closeMatch = line.match(/^:::\s*$/);

    if (containerMatch) {
      const type = containerMatch[1];
      containerStack.push("div");
      output.push(`<div class="container ${type}">`);
    } else if (detailsMatch) {
      containerStack.push("details");
      output.push(
        `<details><summary>${detailsMatch[1]}</summary>`,
        ""
      );
    } else if (closeMatch && containerStack.length > 0) {
      const tag = containerStack.pop()!;
      if (tag === "details") {
        output.push("</details>");
      } else {
        output.push("</div>");
      }
    } else {
      output.push(line);
    }
  }

  result = output.join("\n");

  // Convert cross-reference links from ./filename.md to /lesson/number/vanity-slug
  // Filename: "4-japanese-verb-tenses" → "/lesson/4/japanese-verb-tenses"
  result = result.replace(
    /\(\.\/([^)]+)\.md\)/g,
    (_match, filename) => {
      // Extract lesson number and vanity slug from filename
      const is75 = filename.match(/^(\d+)-5-(.+)$/); // e.g., 7-5-conjugation → 7.5, conjugation
      const normal = filename.match(/^(\d+[a-z]?)-(.+)$/); // e.g., 8b-foo → 8b, foo
      if (is75) {
        return `(/lesson/${is75[1]}.5/${is75[2]})`;
      }
      if (normal) {
        return `(/lesson/${normal[1]}/${normal[2]})`;
      }
      return `(/lesson/${filename})`;
    }
  );

  // Fix image paths: ./media/ → /media/
  result = result.replace(/\(\.\/media\//g, "(/media/");

  return result;
}

async function buildLesson(slug: string): Promise<LessonData> {
  const mdPath = path.join(ROOT, `${slug}.md`);
  const md = readFileSync(mdPath, "utf-8");
  const lines = md.split("\n");

  // Extract title from first line
  const { number, title } = parseTitle(lines[0] || "");

  // Extract YouTube ID from the link on line 2 or 3
  let youtubeId: string | null = null;
  for (let i = 1; i < Math.min(5, lines.length); i++) {
    const match = lines[i].match(/https?:\/\/(?:www\.)?youtube\.com\/watch\?v=[^\s)]+/);
    if (match) {
      youtubeId = extractYoutubeId(match[0]);
      break;
    }
  }

  // Pre-process and convert to HTML
  const preprocessed = preprocessMarkdown(md);

  const file = await unified()
    .use(remarkParse)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeStringify)
    .process(preprocessed);

  const html = String(file);

  return { slug, number, title, youtubeId, html };
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  console.log(`Building ${LESSON_ORDER.length} lessons...`);
  let built = 0;

  for (const slug of LESSON_ORDER) {
    try {
      const lesson = await buildLesson(slug);
      const outPath = path.join(OUT_DIR, `${slug}.json`);
      writeFileSync(outPath, JSON.stringify(lesson, null, 2));
      built++;
    } catch (err) {
      console.error(`Error building ${slug}:`, err);
    }
  }

  console.log(`Built ${built}/${LESSON_ORDER.length} lessons to ${OUT_DIR}`);
}

main();
