# Fx64b.dev

Personal site - blog, projects, small tools, and an interactive OSCP cheat sheet.
Built as a statically generated React app and deployed to Vercel.

## Stack

- **React 19** + **TypeScript**, routed with **react-router** and
  pre-rendered to static HTML by **vite-react-ssg**.
- **Vite 8** build; **Tailwind CSS v4** (via `@tailwindcss/vite`).
- **radix-ui** primitives, **lucide-react** icons, **@xyflow/react** for the
  OSCP graph, **react-markdown** + `remark-gfm`/`rehype-raw` for content.
- **Vitest** + Testing Library for tests, **ESLint** + **Prettier** for lint/format.
- **pnpm** for package management, **release-please** for versioning & releases.

## Requirements

- Node **24.x** (see `engines` in `package.json`)
- pnpm **11.x** (`packageManager` is pinned)

## Getting started

```bash
pnpm install
pnpm dev        # dev server (vite-react-ssg dev)
```

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` | Start the local dev server. |
| `pnpm build` | Static build to `dist/` (SSG). |
| `pnpm preview` | Serve the built `dist/` locally. |
| `pnpm lint` | ESLint over the repo. |
| `pnpm format` | Prettier write (sorted imports, Tailwind class sort). |
| `pnpm test` | Run the Vitest suite once. |
| `pnpm test:watch` | Vitest in watch mode. |
| `pnpm test:coverage` | Coverage report (covers `components/tools/**`). |

## Project layout

```
components/        Reusable UI (radix-based ui/, tools/, oscp/, icons/)
content/           Markdown collections: blog/ and projects/
data/              Typed data sources (projectData, toolsData, oscp/)
lib/               Framework-agnostic helpers (posts, projects, oscp-graph, utils)
src/
  routes.tsx       Route table (feeds SSG static path generation)
  layouts.tsx      Section layouts (blog / projects / tools)
  pages/           Page components per section
  App.tsx          Root layout (header/footer)
  globals.css      Tailwind entry + design tokens
types/             Shared type declarations (e.g. oscp.d.ts)
vite-plugin-content.ts   Build-time markdown loader (gray-matter, Node-only)
vite-plugin-seo.ts       Generates sitemap.xml after the SSG build
```

The `@` import alias resolves to the repo root (see `vite.config.ts`).

## Routing & static generation

Routes live in `src/routes.tsx`. Dynamic sections (`blog/:slug`,
`projects/:slug`, `tools/:slug`) expose `getStaticPaths` so vite-react-ssg
pre-renders one HTML file per entry. After the build, `vite-plugin-seo.ts`
writes `sitemap.xml` into `dist/`. `robots.txt` is a static file in `public/`
(it declares the `Sitemap:` URL and welcomes AI/search crawlers).

`/military` is intentionally unlisted: no nav link and absent from the sitemap
(it also sits outside the App layout). `/cheatsheet` has no nav link yet but is
included in the sitemap.

## Adding content

- **Blog post** - add `content/blog/<slug>.md` with frontmatter
  (`title`, `date`, `description`, `read`, `author`). Markdown is parsed at build
  time by `vite-plugin-content.ts`, so nothing ships gray-matter to the client.
- **Project** - add `content/projects/<slug>.md` (frontmatter incl.
  `status`, `projectSlug`, `featured` metadata in `data/projectData.ts`). Only
  `featured` projects get a pre-rendered detail page.
- **Tool** - register it in `data/toolsData.ts`; the page renders via the
  dynamic tool loader under `src/pages/tools/`.
- **OSCP cheat sheet** - see the section below.

## Testing

Vitest runs under `happy-dom` with Testing Library. Config lives in
`vite.config.ts` (`test` block) and `vitest.setup.ts`. Coverage is scoped to
`components/tools/**`; the OSCP content graph has its own integrity tests in
`tests/data/oscp.test.ts`.

## Deployment

Static build (`pnpm build`) deployed to Vercel (`vercel.json`). Releases and the
changelog are handled by release-please (`.github/workflows/release.yml`) from
Conventional Commit messages: it maintains a release PR that bumps the version
and `CHANGELOG.md`, and on merge tags the commit and cuts a GitHub release.

## Adding OSCP cheat sheet entries

The interactive OSCP cheat sheet at `/cheatsheet` is a DAG built from plain
TypeScript data. Nodes are the things you find, do, or reach on a box; edges are
the conditional transitions between them. To add your own material you only edit
the data files - no component changes needed.

### Where the content lives

- `types/oscp.d.ts` - the data model (`OscpNode`, `OscpEdge`, `OscpContent`).
- `data/oscp/*.ts` - one module per phase, each a default-exported `OscpContent`
  (`{ nodes, edges }`).
- `data/oscp/index.ts` - merges every module, defines the phases, and runs an
  integrity check.

### 1. Pick the phase file

Each phase has its own module: `enumeration.ts`, `service-enum.ts`, `web.ts`,
`passwords.ts`, `shells.ts`, `linux-privesc.ts`, `windows-privesc.ts`,
`pivoting.ts`, `ad-enum.ts`, `ad-attacks.ts`, `ad-lateral.ts`. Add your entry to
the file matching its phase. (New phase? Add it to `OscpPhase` in
`types/oscp.d.ts`, add a `PhaseMeta` row to `PHASES` in `index.ts`, create the
module, and import it into the `CONTENT` array.)

### 2. Add a node

Append an `OscpNode` to that module's `nodes` array. The `id` is a stable slug
that edges reference - keep it unique across **all** files.

```ts
{
    id: 'smb-writable-share',            // unique slug, referenced by edges
    title: 'Writable SMB share',         // short label shown on the node
    type: 'finding',                     // 'finding' | 'technique' | 'state'
    phase: 'service-enum',               // must match this module's phase
    os: 'windows',                       // 'linux' | 'windows' | 'ad' | 'agnostic'
    description:
        'A share you can write to. Drop a payload, a .scf/.url file for a ' +
        'hash grab, or a webshell if it maps to a web root.',
    commands: [                          // optional, copyable blocks
        {
            label: 'Confirm write access',
            code: 'smbcacls //<target>/<share> -N',
            note: 'Optional one-line caveat shown under the block.',
        },
    ],
    references: [                         // optional external links
        { label: 'PayloadsAllTheThings - SMB', url: 'https://...' },
    ],
    tags: ['smb', 'share', 'writable'],  // optional, matched by search only
}
```

Node-type guide: `finding` = something you observed, `technique` = an action you
run, `state` = a position you reached (a shell, creds, DA). Reuse a shared state
node (e.g. `foothold-windows`) by pointing an edge at it rather than duplicating
it.

### 3. Wire it up with edges

Every node must sit on at least one edge (no orphans allowed). Add `OscpEdge`
entries to the module's `edges` array. The `label` is the condition that makes
the transition true.

```ts
{ from: 'smb-enum', to: 'smb-writable-share', label: 'share is writable' },
{ from: 'smb-writable-share', to: 'foothold-windows', label: 'dropped a payload' },
```

`from`/`to` may reference nodes in **any** file - cross-phase edges are fine and
expected (that's how a finding leads to a foothold in a later phase).

### 4. (Optional) make it a guided entry point

If the node is a realistic "here's what I found" starting point, add its id to
`ENTRY_POINTS` in `data/oscp/index.ts` so it shows up in guided mode.

### 5. Validate

```bash
pnpm test        # checks for duplicate ids, dangling edges, and orphan nodes
pnpm dev         # DEV build also warns in the console on content issues
```

The test suite (`tests/data/oscp.test.ts`) enforces: unique ids, every edge
endpoint resolves to a real node, no orphan nodes, and that a fresh target still
chains through to Domain Admin. Fix any reported issue before committing.
