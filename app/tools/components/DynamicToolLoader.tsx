'use client'

import ByteConverter from '@/components/tools/byte-converter'
import CharacterWordCounter from '@/components/tools/character-word-counter'
import ColorConverter from '@/components/tools/color-converter'
import HourDecimalConverter from '@/components/tools/hour-decimal-converter'
import TextCaseConverter from '@/components/tools/text-case-converter'

import type React from 'react'

const TOOLS: Record<string, React.ComponentType> = {
    'byte-converter': ByteConverter,
    'text-case-converter': TextCaseConverter,
    'color-converter': ColorConverter,
    'hour-decimal-converter': HourDecimalConverter,
    'character-word-counter': CharacterWordCounter,
}

export default function DynamicToolLoader({ slug }: { slug: string }) {
    const Component = TOOLS[slug]
    if (!Component) return null
    return <Component />
}
