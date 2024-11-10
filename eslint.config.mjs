import { FlatCompat } from '@eslint/eslintrc'
import js from '@eslint/js'
import unusedImports from 'eslint-plugin-unused-imports'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all,
})

export default [
    {
        ignores: ['**/content/'],
    },
    ...compat.extends('next/core-web-vitals'),
    {
        plugins: {
            'unused-imports': unusedImports,
        },

        rules: {
            'react-hooks/exhaustive-deps': 'off',
            'no-unused-vars': 'off',
            'unused-imports/no-unused-imports': 'error',
            'no-console': 'warn',
            eqeqeq: 'error',
            curly: 'error',
            quotes: ['warn', 'single'],
            'comma-dangle': ['error', 'always-multiline'],
        },
    },
]
