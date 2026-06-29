/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vite'

import { contentPlugin } from './vite-plugin-content'
import { generateSeoFiles } from './vite-plugin-seo'

const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8')) as {
    version: string
}

export default defineConfig({
    plugins: [react(), tailwindcss(), contentPlugin()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './'),
        },
    },
    define: {
        __APP_VERSION__: JSON.stringify(pkg.version),
    },
    build: {
        outDir: 'dist',
    },
    ssgOptions: {
        entry: 'src/main.tsx',
        script: 'async',
        onFinished: () => {
            generateSeoFiles(path.resolve(__dirname, 'dist'))
        },
    },
    test: {
        environment: 'happy-dom',
        globals: true,
        setupFiles: ['./vitest.setup.ts'],
        css: false,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json-summary', 'html'],
            include: ['components/tools/**'],
        },
    },
})
