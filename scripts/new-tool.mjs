#!/usr/bin/env node
/**
 * Scaffold a new tool: component, test, and reminders for the registry steps.
 *
 * Usage:
 *   pnpm new:tool <slug> "Tool Title" [category]
 *
 * Example:
 *   pnpm new:tool slug-generator "Slug Generator" generators
 */
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

const CATEGORIES = [
    'conversion',
    'encoding',
    'formatting',
    'generators',
    'utilities',
    'security',
]

const [slug, title, category = 'utilities'] = process.argv.slice(2)

if (!slug || !title) {
    console.error(
        'Usage: pnpm new:tool <slug> "Tool Title" [category]\n' +
            `Categories: ${CATEGORIES.join(', ')}`
    )
    process.exit(1)
}

if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    console.error(`Invalid slug "${slug}". Use kebab-case, e.g. my-new-tool.`)
    process.exit(1)
}

if (!CATEGORIES.includes(category)) {
    console.error(
        `Invalid category "${category}". Choose one of: ${CATEGORIES.join(', ')}`
    )
    process.exit(1)
}

const pascal = slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')

const componentPath = join(ROOT, 'components', 'tools', `${slug}.tsx`)
const testPath = join(ROOT, 'tests', 'components', 'tools', `${slug}.test.tsx`)

if (existsSync(componentPath)) {
    console.error(`Component already exists: ${componentPath}`)
    process.exit(1)
}

const componentSource = `'use client'

import { useState } from 'react'

import { CopyButton } from '@/components/tools/copy-button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'

export default function ${pascal}() {
    const [input, setInput] = useState('')

    return (
        <div className="mx-auto max-w-3xl">
            <Card>
                <CardContent className="space-y-4 pt-6">
                    <div>
                        <label
                            htmlFor="${slug}-input"
                            className="mb-1.5 block text-sm font-medium"
                        >
                            Input
                        </label>
                        <div className="flex gap-2">
                            <Input
                                id="${slug}-input"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                aria-label="Input"
                            />
                            <CopyButton value={input} />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
`

const testSource = `import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import ${pascal} from '@/components/tools/${slug}'

describe('${pascal}', () => {
    it('renders the input', () => {
        render(<${pascal} />)
        expect(screen.getByLabelText('Input')).toBeInTheDocument()
    })
})
`

mkdirSync(dirname(componentPath), { recursive: true })
mkdirSync(dirname(testPath), { recursive: true })
writeFileSync(componentPath, componentSource)
writeFileSync(testPath, testSource)

console.log(`✓ Created components/tools/${slug}.tsx`)
console.log(`✓ Created tests/components/tools/${slug}.test.tsx`)
console.log('\nNext steps:')
console.log(`  1. Add the metadata entry to data/toolsData.ts:`)
console.log(
    `       { slug: '${slug}', title: '${title}', category: '${category}', tags: [], ... }`
)
console.log(
    `  2. Register the component in app/tools/components/DynamicToolLoader.tsx:`
)
console.log(
    `       '${slug}': dynamic(() => import('@/components/tools/${slug}')),`
)
console.log('  3. Flesh out the component + tests, then run: pnpm test')
