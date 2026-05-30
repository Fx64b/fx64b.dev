'use client'

import Base64EncoderDecoder from '@/components/tools/base64-encoder-decoder'
import ByteConverter from '@/components/tools/byte-converter'
import CharacterWordCounter from '@/components/tools/character-word-counter'
import ColorConverter from '@/components/tools/color-converter'
import HashGenerator from '@/components/tools/hash-generator'
import HourDecimalConverter from '@/components/tools/hour-decimal-converter'
import IpSubnetCalculator from '@/components/tools/ip-subnet-calculator'
import LoremIpsumGenerator from '@/components/tools/lorem-ipsum-generator'
import ReverseShellGenerator from '@/components/tools/reverse-shell-generator'
import TextCaseConverter from '@/components/tools/text-case-converter'
import UrlEncoderDecoder from '@/components/tools/url-encoder-decoder'

import type React from 'react'

const TOOLS: Record<string, React.ComponentType> = {
    'byte-converter': ByteConverter,
    'text-case-converter': TextCaseConverter,
    'color-converter': ColorConverter,
    'hour-decimal-converter': HourDecimalConverter,
    'character-word-counter': CharacterWordCounter,
    'base64-encoder-decoder': Base64EncoderDecoder,
    'hash-generator': HashGenerator,
    'url-encoder-decoder': UrlEncoderDecoder,
    'ip-subnet-calculator': IpSubnetCalculator,
    'reverse-shell-generator': ReverseShellGenerator,
    'lorem-ipsum-generator': LoremIpsumGenerator,
}

export default function DynamicToolLoader({ slug }: { slug: string }) {
    const Component = TOOLS[slug]
    if (!Component) return null
    return <Component />
}
