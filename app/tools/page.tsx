import { getAllTags, getAllTools, getPopularTools } from '@/data/toolsData'
import type { ToolCategory } from '@/types/tool'

import type { Metadata } from 'next'

import ToolsExplorer from '@/app/tools/components/ToolsExplorer'

import { BackgroundGrid } from '@/components/background-grid'
import { Section } from '@/components/section'

const BASE_URL = 'https://fx64b.dev'

const VALID_CATEGORIES: ToolCategory[] = [
    'conversion',
    'encoding',
    'formatting',
    'generators',
    'utilities',
    'security',
    'fun',
]

export const metadata: Metadata = {
    title: 'Developer Tools - Fx64b.dev',
    description:
        'Free online tools for developers and everyday tasks. Encode, convert, hash, generate and more — no ads, no tracking, everything runs in your browser.',
    keywords: [
        'developer tools',
        'online tools',
        'free tools',
        'encoder',
        'decoder',
        'converter',
        'hash generator',
        'base64',
    ],
    alternates: {
        canonical: '/tools',
    },
    openGraph: {
        title: 'Free Online Tools for Developers',
        description:
            'Collection of free browser-based tools for developers and everyday tasks.',
        url: `${BASE_URL}/tools`,
        type: 'website',
    },
}

interface ToolsPageProps {
    searchParams: Promise<{
        q?: string
        tags?: string
        category?: string
    }>
}

export default async function ToolsPage(props: ToolsPageProps) {
    const searchParams = await props.searchParams
    const tools = getAllTools()
    const popularTools = getPopularTools()
    const allTags = getAllTags()

    const initialQuery = searchParams.q ?? ''
    const initialTags = searchParams.tags
        ? searchParams.tags.split(',').filter(Boolean)
        : []
    const initialCategory =
        searchParams.category &&
        VALID_CATEGORIES.includes(searchParams.category as ToolCategory)
            ? (searchParams.category as ToolCategory)
            : 'all'

    const itemListJsonLd = {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        name: 'Developer Tools',
        description:
            'Free browser-based tools for developers and everyday tasks.',
        numberOfItems: tools.length,
        itemListElement: tools.map((tool, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            url: `${BASE_URL}/tools/${tool.slug}`,
            name: tool.title,
        })),
    }

    return (
        <>
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{
                    __html: JSON.stringify(itemListJsonLd),
                }}
            />
            <BackgroundGrid />
            <main className="relative">
                <Section className="pt-24">
                    <div className="mb-12">
                        <h1 className="mb-2 text-3xl font-bold tracking-tight">
                            Tools
                        </h1>
                        <p className="text-muted-foreground">
                            Free, browser-based tools for developers and
                            everyday tasks. No ads, no tracking — search by name
                            or tag below.
                        </p>
                    </div>

                    <ToolsExplorer
                        tools={tools}
                        popularTools={popularTools}
                        allTags={allTags}
                        initialQuery={initialQuery}
                        initialTags={initialTags}
                        initialCategory={initialCategory}
                    />
                </Section>
            </main>
        </>
    )
}
