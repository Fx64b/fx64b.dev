'use client'

import type React from 'react'

import dynamic from 'next/dynamic'

// Lazily load each tool so a tool page only ships its own bundle.
const TOOLS: Record<string, React.ComponentType> = {
    'byte-converter': dynamic(
        () => import('@/components/tools/byte-converter')
    ),
    'text-case-converter': dynamic(
        () => import('@/components/tools/text-case-converter')
    ),
    'color-converter': dynamic(
        () => import('@/components/tools/color-converter')
    ),
    'hour-decimal-converter': dynamic(
        () => import('@/components/tools/hour-decimal-converter')
    ),
    'character-word-counter': dynamic(
        () => import('@/components/tools/character-word-counter')
    ),
    'base64-encoder-decoder': dynamic(
        () => import('@/components/tools/base64-encoder-decoder')
    ),
    'hash-generator': dynamic(
        () => import('@/components/tools/hash-generator')
    ),
    'url-encoder-decoder': dynamic(
        () => import('@/components/tools/url-encoder-decoder')
    ),
    'ip-subnet-calculator': dynamic(
        () => import('@/components/tools/ip-subnet-calculator')
    ),
    'reverse-shell-generator': dynamic(
        () => import('@/components/tools/reverse-shell-generator')
    ),
    'lorem-ipsum-generator': dynamic(
        () => import('@/components/tools/lorem-ipsum-generator')
    ),
    'jwt-decoder': dynamic(() => import('@/components/tools/jwt-decoder')),
    'uuid-generator': dynamic(
        () => import('@/components/tools/uuid-generator')
    ),
    'json-formatter': dynamic(
        () => import('@/components/tools/json-formatter')
    ),
    'timestamp-converter': dynamic(
        () => import('@/components/tools/timestamp-converter')
    ),
    'number-base-converter': dynamic(
        () => import('@/components/tools/number-base-converter')
    ),
    'regex-tester': dynamic(() => import('@/components/tools/regex-tester')),
    'qr-code-generator': dynamic(
        () => import('@/components/tools/qr-code-generator')
    ),
}

export default function DynamicToolLoader({ slug }: { slug: string }) {
    const Component = TOOLS[slug]
    if (!Component) return null
    return <Component />
}
