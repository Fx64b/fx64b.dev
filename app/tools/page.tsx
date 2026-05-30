import { getToolsByCategory } from '@/data/toolsData'
import type { Tool } from '@/types/tool'
import {
    ArrowLeftRight,
    ArrowRight,
    BookOpen,
    Lock,
    Text,
    Wrench,
    Zap,
} from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'

import { BackgroundGrid } from '@/components/background-grid'
import { Section } from '@/components/section'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export const metadata: Metadata = {
    title: 'Developer Tools - Fx64b.dev',
    description:
        'Free online tools for developers and everyday tasks. No ads, no tracking, just tools that work.',
    openGraph: {
        title: 'Free Online Tools for Developers',
        description:
            'Collection of free browser-based tools for developers and everyday tasks.',
        url: 'https://fx64b.dev/tools',
    },
}

const CATEGORY_META = {
    conversion: { label: 'Conversion', icon: ArrowLeftRight },
    encoding: { label: 'Encoding & Hashing', icon: Lock },
    formatting: { label: 'Formatting', icon: Text },
    generators: { label: 'Generators', icon: Zap },
    utilities: { label: 'Utilities', icon: Wrench },
} as const

export default function ToolsPage() {
    const conversionTools = getToolsByCategory('conversion')
    const encodingTools = getToolsByCategory('encoding')
    const formattingTools = getToolsByCategory('formatting')
    const generatorTools = getToolsByCategory('generators')
    const utilityTools = getToolsByCategory('utilities')

    const allCategories = [
        { key: 'conversion' as const, tools: conversionTools },
        { key: 'encoding' as const, tools: encodingTools },
        { key: 'formatting' as const, tools: formattingTools },
        { key: 'generators' as const, tools: generatorTools },
        { key: 'utilities' as const, tools: utilityTools },
    ].filter((c) => c.tools.length > 0)

    return (
        <>
            <BackgroundGrid />
            <main className="relative">
                <Section className="pt-24">
                    <div className="mb-12">
                        <h1 className="mb-2 text-3xl font-bold tracking-tight">
                            Tools
                        </h1>
                        <p className="text-muted-foreground">
                            Free, browser-based tools for developers and
                            everyday tasks. No ads, no tracking.
                        </p>
                    </div>

                    <div className="space-y-12">
                        {allCategories.map((category) => {
                            const { label, icon: Icon } =
                                CATEGORY_META[category.key]
                            return (
                                <div key={category.key}>
                                    <div className="mb-5 flex items-center gap-2.5">
                                        <Icon className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
                                        <span className="text-muted-foreground shrink-0 text-xs font-medium uppercase tracking-wider">
                                            {label}
                                        </span>
                                        <div className="bg-border h-px flex-1" />
                                        <Badge
                                            variant="secondary"
                                            className="shrink-0 text-xs"
                                        >
                                            {category.tools.length}
                                        </Badge>
                                    </div>

                                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                                        {category.tools.map((tool) => (
                                            <ToolCard
                                                key={tool.slug}
                                                tool={tool}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {allCategories.length === 0 && (
                        <div className="py-16 text-center">
                            <p className="text-muted-foreground text-sm">
                                No tools available yet.
                            </p>
                        </div>
                    )}
                </Section>
            </main>
        </>
    )
}

function ToolCard({ tool }: { tool: Tool }) {
    return (
        <Link href={`/tools/${tool.slug}`} className="group block">
            <Card className="hover:bg-card h-full transition-colors">
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between gap-2">
                        <span className="font-medium">{tool.title}</span>
                        <ArrowRight className="text-muted-foreground h-3.5 w-3.5 shrink-0 transition-transform group-hover:translate-x-0.5" />
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground mb-3 text-sm leading-relaxed">
                        {tool.description}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {tool.tags.map((tag: string) => (
                            <Badge
                                key={tag}
                                variant="outline"
                                className="text-xs"
                            >
                                {tag}
                            </Badge>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </Link>
    )
}
