---
title: 'Obsidianator'
description: 'Turn an Obsidian vault into a self-contained static website, or serve it directly in the browser without writing anything to disk.'
lastUpdated: '2026-04-23'
author: 'Fx64b'
status: 'published'
projectSlug: 'obsidianator'
version: '0.1.0-beta'
readTime: '5 mins'
---

# Obsidianator
Turn an Obsidian vault into a self-contained static website, or serve it directly in the browser without writing anything to disk.

## History & Vision
I wanted an easy way to render my Obsidian notes into some kind of HTML output that can either be published on my own website or be used for private viewing with advanced search functionalities.

There is of course [Obsidian Publish](https://obsidian.md/publish) but I wanted to have a small challenge in creating my own tool.

## How it works
There are two modes you can either export your vault as a vite build or serve it directly as a site.
When running the `obsidianator` it will scan the files and folders in the provided path, takes the content of the markdown files to parse them and then write everything into a `vault-data.json` file, which will then be loaded by the vite build.

## Installation
Currently you can either download the pre-compiled binaries from the [latest release](https://github.com/Fx64b/obsidianator/releases/latest) or you can build it from source:

```bash
git clone https://github.com/Fx64b/obsidianator
cd obsidianator
make all          # builds frontend then Go binary
make install      # adds to path
```

Requirements: Go 1.21+, Node 18+, pnpm.

## Usage
**Serve a vault in memory (no disk output)**
```bash
obsidianator serve ./my-vault
obsidianator serve ./my-vault --watch          # live reload on file changes
obsidianator serve ./my-vault --port 8080
```

**Export to a static site:**
```bash
obsidianator export ./my-vault
obsidianator export ./my-vault --output ./dist
obsidianator export ./my-vault --output ./dist --serve   # export then serve
obsidianator export ./my-vault --output ./dist --watch   # export, watch, serve
```

**Filter to specific folders or files:**
```bash
obsidianator serve ./my-vault --include Notes --include Diary/2026.md
```

**Other options**
```bash
obsidianator --version    # print version
obsidianator --help
obsidianator serve --help
obsidianator export --help
```

> **Important:** The serve options primary purpose is for checking how the output looks and not for serving the site publicly! While some steps to secure the serve option were taken it is by far not ready to be used for public hosting. Instead you should do an export and host that using a real webserver. 

## Architecture

| Layer | Location | Role |
|-------|----------|------|
| Go CLI | `main.go` | `serve` / `export` commands via cobra |
| Vault parser | `internal/vault/` | Walk filesystem, parse frontmatter, resolve wikilinks, build folder tree |
| Exporter | `internal/export/` | Write static files to disk, serve in-memory, SSE live reload |
| Frontend | `web/src/` | React + Vite app, embedded into the binary at build time |

The Go binary embeds the compiled frontend (`web/` → `./static`) via `//go:embed`. In `serve` mode nothing touches disk — vault data is served as JSON from memory and attachments are proxied directly from the vault directory.