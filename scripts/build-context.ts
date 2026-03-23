/**
 * Generates cumulative lesson context for the chat system prompt.
 *
 * For each lesson, sends the content to Claude to extract:
 * - Grammar points introduced
 * - Key vocabulary with kana readings
 * - Cure Dolly's conceptual framings
 *
 * Outputs content/context/cumulative.json.
 *
 * Requires ANTHROPIC_API_KEY environment variable.
 * Run: npx tsx scripts/build-context.ts
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Anthropic from "@anthropic-ai/sdk";

import { LESSON_ORDER } from "../src/lib/lesson-order.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "content", "context");
const OUT_FILE = path.join(OUT_DIR, "cumulative.json");

const anthropic = new Anthropic();

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

const EXTRACTION_PROMPT = `Extract structured information from this Japanese grammar lesson by Cure Dolly. Return ONLY valid JSON with no additional text.

{
  "grammarPoints": ["list of grammar points introduced in this lesson, e.g. 'the が particle marks the subject', 'だ is the copula'"],
  "keyVocabulary": ["list of key Japanese words introduced, with readings, e.g. 'あるく (歩く) - to walk', 'にほんじん (日本人) - Japanese person'"],
  "conceptualFramings": ["list of Cure Dolly's unique conceptual framings, e.g. 'every sentence is a train with a carriage (A) and engine (B)', 'い-adjectives have the copula built in'"]
}

Keep each list concise — capture what a tutor would need to know about what has been taught, not a full lesson summary. Grammar points and framings are more important than exhaustive vocabulary lists.`;

async function extractContext(
  slug: string,
  mdContent: string,
): Promise<{
  grammarPoints: string[];
  keyVocabulary: string[];
  conceptualFramings: string[];
}> {
  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: `${EXTRACTION_PROMPT}\n\n---\n\n${mdContent}`,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Parse JSON from the response (handle potential markdown code blocks)
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.warn(`  Warning: Could not extract JSON for ${slug}`);
    return { grammarPoints: [], keyVocabulary: [], conceptualFramings: [] };
  }

  return JSON.parse(jsonMatch[0]);
}

function parseTitle(line: string): { number: string; title: string } {
  const match = line.match(
    /^#\s+\*?\*?(\d+(?:\.\d+)?[a-z]?)[\.\s]+(.+?)(?:\*\*)?$/,
  );
  if (match) {
    return { number: match[1], title: match[2].replace(/\*+$/g, "").trim() };
  }
  return {
    number: "",
    title: line
      .replace(/^#+\s*\**/g, "")
      .replace(/\*+$/g, "")
      .trim(),
  };
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  // Load existing context to support incremental builds
  let existing: CumulativeContext = { lessons: {} };
  if (existsSync(OUT_FILE)) {
    existing = JSON.parse(readFileSync(OUT_FILE, "utf-8"));
  }

  const forceAll = process.argv.includes("--force");
  let processed = 0;
  let skipped = 0;

  for (const slug of LESSON_ORDER) {
    if (!forceAll && existing.lessons[slug]) {
      skipped++;
      continue;
    }

    const mdPath = path.join(ROOT, `${slug}.md`);
    const md = readFileSync(mdPath, "utf-8");
    const lines = md.split("\n");
    const { number, title } = parseTitle(lines[0] || "");

    console.log(`Processing ${number}. ${title}...`);

    try {
      const extracted = await extractContext(slug, md);
      existing.lessons[slug] = {
        number,
        title,
        ...extracted,
      };
      processed++;

      // Write after each lesson so we don't lose progress on failure
      writeFileSync(OUT_FILE, JSON.stringify(existing, null, 2));
    } catch (err) {
      console.error(`  Error processing ${slug}:`, err);
    }
  }

  console.log(
    `Done. Processed: ${processed}, Skipped (already exists): ${skipped}`,
  );
}

main();
