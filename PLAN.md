# Cure Dolly Interactive Japanese Course — Web Application

## Context

The current CLI-based course works well: Claude presents Cure Dolly's lesson content and runs interactive English→Japanese practice exercises. But it requires local files and the Claude Code CLI, limiting who can use it. We're building a web app so anyone can access the course with a browser. The existing lesson content (99 markdown files + 1,160 images) stays as the source of truth.

An existing static site at https://kellenok.github.io/cure-script/ already renders the lessons — we're building something new that adds the interactive practice layer.

## Architecture

**Next.js app on Vercel.** Static lesson pages generated at build time. Chat powered by Claude API via a serverless API route.

```
cure-dolly-app/
  public/
    media/                        # 1,160 WebP images (copied from source)

  content/
    lessons/                      # Build-generated JSON (one per lesson)
    context/
      cumulative.json             # Pre-generated grammar/vocab summaries per lesson

  scripts/
    build-lessons.ts              # Markdown → JSON at build time
    build-context.ts              # Generate cumulative context summaries

  src/
    app/
      layout.tsx                  # Root layout, fonts, global styles
      page.tsx                    # Home — table of contents
      lesson/[number]/page.tsx    # Lesson page (SSG)
      api/chat/route.ts           # Claude chat endpoint (streaming)

    components/
      LessonContent.tsx           # Renders lesson HTML
      YouTubeEmbed.tsx            # Responsive video embed
      LessonNav.tsx               # Prev/next navigation
      TableOfContents.tsx         # Home page lesson list
      Chat.tsx                    # Chat container (client component)
      ChatMessage.tsx             # Message bubble
      ChatInput.tsx               # Input with submit

    lib/
      lessons.ts                  # Load/list lesson data
      lesson-order.ts             # Canonical ordered list of lessons
      system-prompt.ts            # Build system prompt from guidelines + context
```

## Key Design Decisions

### Content Pipeline
Convert markdown to HTML at **build time** using unified/remark/rehype. Each lesson becomes a JSON file with metadata (title, lesson number, YouTube ID, HTML content). This avoids shipping a markdown parser to the client and handles the VitePress-specific syntax (`:::info` containers, `<sup>` cross-references) during the build step.

### Images
Copy all 1,160 images (46MB) into `public/media/`. Vercel's CDN serves them. Simpler and more reliable than depending on the GitHub Pages site.

### Lesson Context for Claude (the critical piece)
In the CLI, Claude can read all 99 lesson files. We can't stuff ~240K tokens into every API call. Instead:

**Pre-generate a cumulative context document.** A build script extracts from each lesson:
- Grammar points introduced
- Key vocabulary with kana readings
- Cure Dolly's conceptual framings

For lesson N, the system prompt includes:
1. Course guidelines (~1K tokens) — adapted from CLAUDE.md
2. Cumulative summary of lessons 1 through N-1 (~50-100 tokens per lesson, so ~5-10K for late lessons)
3. Full current lesson content (~2-4K tokens)

**Worst case (lesson 97): ~15K tokens.** Very manageable.

This lets Claude know what's been taught, what vocabulary is available, and what hasn't been covered yet — matching the CLI experience.

**Generation approach:** Run each lesson through Claude once to extract structured summaries, review/edit the output, and check the result into the repo as `content/context/cumulative.json`.

### Chat
- Client component with streaming responses
- API route calls Anthropic SDK in streaming mode, returns SSE
- Model: Claude Sonnet (fast, affordable for exercises)
- No persistence — refresh clears chat
- Learners can input kana/kanji or romaji
- An initial prompt or "Start practice" button kicks off the exercise session

### Adaptations from CLAUDE.md
- Remove references to reading local files / CLI interaction
- Remove "cannot display images" caveat (images render in the browser)
- Add: accept romaji input in addition to kana/kanji
- System prompt is injected server-side, not read from a file

## Implementation Phases

### Phase 1: Static content site (no chat)
1. Initialize Next.js + TypeScript + Tailwind project
2. Write `scripts/build-lessons.ts` — parse markdown, handle VitePress syntax, extract metadata
3. Copy images to `public/media/`
4. Build `lesson-order.ts`, `lessons.ts`
5. Build lesson pages: `LessonContent`, `YouTubeEmbed`, `LessonNav`
6. Build home page with `TableOfContents`
7. Deploy to Vercel — verify all 99 lessons render with images

### Phase 2: Chat integration
1. Generate cumulative context (`build-context.ts` + review)
2. Build `system-prompt.ts`
3. Build `api/chat/route.ts` with streaming
4. Build `Chat`, `ChatMessage`, `ChatInput` components
5. Integrate chat below lesson content
6. Test end-to-end

### Phase 3: Polish
1. Mobile responsiveness
2. Loading/error states for chat
3. Basic rate limiting on API route
4. Meta tags

## Dependencies

- `next`, `react`, `react-dom` — framework
- `@anthropic-ai/sdk` — Claude API
- `@tailwindcss/typography` — prose styling for lesson content
- `unified`, `remark-parse`, `remark-rehype`, `rehype-stringify`, `rehype-raw` — markdown processing (dev only, build time)
- `typescript`, `@types/react`, `@types/node` — dev tooling

## Verification
- All 99 lesson pages render correctly with images and YouTube embeds
- VitePress `:::info` containers render as styled callouts
- Cross-reference links between lessons work
- Chat streams responses in real-time
- Claude's exercises reference only vocabulary/grammar from current and prior lessons
- Chat works with both kana/kanji and romaji input
- Deploys successfully to Vercel
