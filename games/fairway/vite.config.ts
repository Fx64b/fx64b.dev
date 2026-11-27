import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vite'

/*
 * Builds the game as its own page. The site serves it from
 * public/games/fairway.html with its scripts in public/games/fairway/.
 */
const root = import.meta.dirname
const out = path.resolve(root, '../../public/games/fairway')

export default defineConfig({
    root,
    base: '/games/fairway/',
    build: {
        outDir: out,
        emptyOutDir: true,
        target: 'es2022',
    },
    server: { port: 5175 },
    plugins: [
        {
            name: 'fairway-page',
            apply: 'build',
            closeBundle() {
                fs.renameSync(
                    path.join(out, 'index.html'),
                    path.resolve(out, '../fairway.html')
                )
            },
        },
    ],
})
