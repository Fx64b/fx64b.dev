import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vite'

/*
 * Builds the game as its own page. The site serves it from
 * public/games/thornwick.html (the URL the tool page embeds) with its
 * scripts in public/games/thornwick/.
 */
const root = import.meta.dirname
const out = path.resolve(root, '../../public/games/thornwick')

export default defineConfig({
    root,
    base: '/games/thornwick/',
    build: {
        outDir: out,
        emptyOutDir: true,
        target: 'es2022',
    },
    server: { port: 5174 },
    plugins: [
        {
            name: 'thornwick-page',
            apply: 'build',
            closeBundle() {
                fs.renameSync(
                    path.join(out, 'index.html'),
                    path.resolve(out, '../thornwick.html')
                )
            },
        },
    ],
})
