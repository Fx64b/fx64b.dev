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

Run `pnpm new:tool <slug> "Tool Title" [category]` to scaffold the component
and test, then complete the steps below.

1. Create `components/tools/<slug>.tsx` following the existing component pattern
   (reuse `components/tools/copy-button.tsx` for copy-to-clipboard actions)
2. Add the tool metadata entry to `data/toolsData.ts`
3. Register the component in `app/tools/components/DynamicToolLoader.tsx` using a
   lazy `dynamic(() => import('@/components/tools/<slug>'))` entry (keeps each
   tool in its own bundle)
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
`utilities`, `security`, or `fun`.

### Search & SEO infrastructure

- Catalog search/filtering lives in `app/tools/components/ToolsExplorer.tsx`
  (text + tag + category, URL-synced). Scoring is in `scoreTools()` in
  `data/toolsData.ts` — keep it dependency-free.
- Per-tool pages emit `WebApplication`, `BreadcrumbList`, and `FAQPage` JSON-LD,
  and dynamic OG images via `app/tools/[slug]/opengraph-image.tsx`.
- `app/robots.ts`, `app/sitemap.ts`, and `app/llms.txt/route.ts` are generated
  from `toolsData` — no manual edits needed when adding a tool.

## Tool UI/UX standard

Every tool must follow these rules so the catalog feels consistent and is
genuinely pleasant to use. Treat them as acceptance criteria.

**Layout & structure**

- Wrap the tool in `<div className="mx-auto max-w-3xl">` (add `space-y-4` when
  stacking cards). Inputs and outputs live in `Card` / `CardContent`.
- Results render in a `bg-secondary/20` rounded container. Monospace
  (`font-mono`) for code, hashes, IDs and other machine output.
- Output is **live**: recompute on input change via `useMemo`/`useEffect`. Use
  an explicit action button only when the result is an intentional event
  (generate, roll, format) or the computation is expensive.

**Inputs**

- Every input has an associated `<label htmlFor>` or an `aria-label`. Query by
  that accessible name in tests.
- **Numbers: always use `components/tools/number-input.tsx` (`NumberInput`),
  never a raw `type="number"` input.** It keeps a local text buffer so the
  field can be cleared, never snaps a forced `0` back in, avoids leading-zero
  bugs, selects-all on focus, and clamps to `min`/`max` only in the value it
  emits. Pass `value`/`onValueChange` plus optional `min`/`max`/`step`.
- Never clamp or coerce a controlled input's value on every keystroke — it
  traps the user (e.g. you can't delete the last digit). Clamp the derived
  number, not the field.
- Autofocus the primary input when a tool has one obvious entry point
  (`useEffect` + `ref`), as the encoder/decoder tools do.

**Output & feedback**

- Copy-to-clipboard uses `components/tools/copy-button.tsx` (`CopyButton`);
  don't hand-roll copy buttons.
- Show a placeholder ("Output will appear here…") for empty output and a
  distinct empty state for "no results".
- Errors render inline as `text-destructive` text near the input — never throw
  or leave the user guessing.
- Wrap dynamically-updating result summaries in `role="status"` +
  `aria-live="polite"` so screen readers announce changes.

**Safety**

- Tools that could be misread as authoritative (health, security) carry a
  visible disclaimer (see `bac-calculator.tsx`). Everything runs client-side —
  never send user input to a server.

## Testing

Tests live in `tests/` and mirror the `components/` structure. Run them with `pnpm test`.

**Rules:**

- Every new tool must have a corresponding test file before the PR is merged.
- When adding new functionality to an existing tool (new modes, options, outputs), update or extend its test file in the same commit.
- Query checkboxes and inputs by their accessible name (`getByRole('checkbox', { name: '…' })`), not by role alone, to stay resilient to future UI additions.
- Run `pnpm test` before pushing — a failing test suite blocks the pipeline.
