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
