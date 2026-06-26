import matter from 'gray-matter'
import fs from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'

/**
 * Reads a markdown collection from `content/<dir>` at build time, parsing
 * frontmatter with gray-matter. This keeps gray-matter and the `fs` access
 * entirely on the build/dev (Node) side so nothing ships to the client.
 */
export interface CollectionItem {
    slug: string
    data: Record<string, unknown>
    content: string
}

export function loadCollection(dir: string): CollectionItem[] {
    const full = path.resolve(process.cwd(), 'content', dir)
    if (!fs.existsSync(full)) {
        return []
    }
    return fs
        .readdirSync(full)
        .filter((file) => file.endsWith('.md'))
        .map((file) => {
            const raw = fs.readFileSync(path.join(full, file), 'utf8')
            const { data, content } = matter(raw)
            return {
                slug: file.replace(/\.md$/, ''),
                data,
                content,
            }
        })
}

const MODULES: Record<string, string> = {
    'virtual:content/posts': 'blog',
    'virtual:content/projects': 'projects',
}

export function contentPlugin(): Plugin {
    const resolved = new Map<string, string>()
    for (const id of Object.keys(MODULES)) {
        resolved.set(`\0${id}`, MODULES[id])
    }

    return {
        name: 'fx64b-content',
        resolveId(id) {
            if (id in MODULES) {
                return `\0${id}`
            }
            return null
        },
        load(id) {
            const dir = resolved.get(id)
            if (!dir) {
                return null
            }
            const collection = loadCollection(dir)
            return `export default ${JSON.stringify(collection)}`
        },
        handleHotUpdate(ctx) {
            // Invalidate the virtual modules when any markdown file changes
            // so content edits hot-reload during development.
            if (ctx.file.includes(`${path.sep}content${path.sep}`)) {
                const mods = []
                for (const virtualId of resolved.keys()) {
                    const mod = ctx.server.moduleGraph.getModuleById(virtualId)
                    if (mod) {
                        ctx.server.moduleGraph.invalidateModule(mod)
                        mods.push(mod)
                    }
                }
                return mods
            }
        },
    }
}
