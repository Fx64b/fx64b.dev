# fx64b.dev

Personal portfolio and tools site built with Next.js, TypeScript, and Tailwind CSS.

## Package Manager

**Use `pnpm`** — do not use `npm` or `yarn`. `package-lock.json` and `yarn.lock` are gitignored.

```bash
pnpm install
pnpm dev
pnpm build
```

## Tech Stack

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Testing:** Vitest + Testing Library

## Project Structure

- `app/` — Next.js routes and pages
- `components/tools/` — Individual tool implementations (one file per tool)
- `data/toolsData.ts` — Tool metadata registry
- `app/tools/components/DynamicToolLoader.tsx` — Maps slugs to tool components

## Adding a New Tool

1. Create `components/tools/<slug>.tsx` following the existing component pattern
2. Add the tool metadata entry to `data/toolsData.ts`
3. Import and register the component in `app/tools/components/DynamicToolLoader.tsx`
4. **Write tests** — add `tests/components/tools/<slug>.test.tsx` covering the core behaviours

### Tool metadata (`data/toolsData.ts`)

Each `Tool` (see `types/tool.d.ts`) supports search and SEO fields. For new
tools, fill in the optional fields — they feed search relevance, structured
data, and discoverability:

- `keywords` — search-only synonyms/aliases (e.g. `b64`, `epoch`); not shown in the UI.
- `summary` — one-to-two sentence blurb used for the meta description and tool header.
- `faq` — Q&A pairs rendered on the page **and** emitted as `FAQPage` JSON-LD.
- `useCases` — "When to use" bullet points.
- `relatedSlugs` — slugs for the Related tools section (internal linking).
- `addedAt` / `updatedAt` — ISO dates driving the sitemap `lastModified`.

`category` may be one of `conversion`, `encoding`, `formatting`, `generators`,
`utilities`, or `security`.

### Search & SEO infrastructure

- Catalog search/filtering lives in `app/tools/components/ToolsExplorer.tsx`
  (text + tag + category, URL-synced). Scoring is in `scoreTools()` in
  `data/toolsData.ts` — keep it dependency-free.
- Per-tool pages emit `WebApplication`, `BreadcrumbList`, and `FAQPage` JSON-LD,
  and dynamic OG images via `app/tools/[slug]/opengraph-image.tsx`.
- `app/robots.ts`, `app/sitemap.ts`, and `app/llms.txt/route.ts` are generated
  from `toolsData` — no manual edits needed when adding a tool.

## Testing

Tests live in `tests/` and mirror the `components/` structure. Run them with `pnpm test`.

**Rules:**
- Every new tool must have a corresponding test file before the PR is merged.
- When adding new functionality to an existing tool (new modes, options, outputs), update or extend its test file in the same commit.
- Query checkboxes and inputs by their accessible name (`getByRole('checkbox', { name: '…' })`), not by role alone, to stay resilient to future UI additions.
- Run `pnpm test` before pushing — a failing test suite blocks the pipeline.
