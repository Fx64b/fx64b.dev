import { getToolsByCategory } from '@/data/toolsData'
import { Tool } from '@/types/tool'

import { Metadata } from 'next'
import Link from 'next/link'

import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export const metadata: Metadata = {
    title: 'Online Tools - Fx64b.dev',
    description:
        'Free online tools for developers and everyday tasks. No ads, no tracking, just tools that work.',
    openGraph: {
        title: 'Free Online Tools for Developers and Daily Tasks',
        description:
            'Collection of free browser-based tools for developers and everyday tasks. No ads, no tracking.',
        url: 'https://fx64b.dev/tools',
    },
}

export default function ToolsPage() {
    const conversionTools = getToolsByCategory('conversion')
    const formattingTools = getToolsByCategory('formatting')
    const generatorTools = getToolsByCategory('generators')
    const utilityTools = getToolsByCategory('utilities')

    return (
        <div className="container mx-auto max-w-(--breakpoint-lg) p-4">
            <h1 className="mb-6 text-2xl font-bold">Online Tools</h1>

            <p className="mb-6">
                A collection of tools for developers that I need in my day to
                day work. All tools work directly in your browser.
            </p>

            <Separator className="my-6" />

            {conversionTools.length > 0 && (
                <section className="mb-8">
                    <h2 className="mb-4 text-xl font-semibold">
                        Conversion Tools
                    </h2>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {conversionTools.map((tool) => (
                            <ToolCard key={tool.slug} tool={tool} />
                        ))}
                    </div>
                </section>
            )}

            {formattingTools.length > 0 && (
                <section className="mb-8">
                    <h2 className="mb-4 text-xl font-semibold">
                        Formatting Tools
                    </h2>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {formattingTools.map((tool) => (
                            <ToolCard key={tool.slug} tool={tool} />
                        ))}
                    </div>
                </section>
            )}

            {generatorTools.length > 0 && (
                <section className="mb-8">
                    <h2 className="mb-4 text-xl font-semibold">
                        Generator Tools
                    </h2>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {generatorTools.map((tool) => (
                            <ToolCard key={tool.slug} tool={tool} />
                        ))}
                    </div>
                </section>
            )}

            {utilityTools.length > 0 && (
                <section className="mb-8">
                    <h2 className="mb-4 text-xl font-semibold">
                        Utility Tools
                    </h2>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {utilityTools.map((tool) => (
                            <ToolCard key={tool.slug} tool={tool} />
                        ))}
                    </div>
                </section>
            )}
        </div>
    )
}

function ToolCard({ tool }: { tool: Tool }) {
    return (
        <Link
            href={`/tools/${tool.slug}`}
            className="block transition-all hover:no-underline"
        >
            <Card className="hover:bg-muted/50 h-full transition-colors">
                <CardHeader className="pb-2">
                    <h3 className="text-lg font-semibold">{tool.title}</h3>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-sm">
                        {tool.description}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1">
                        {tool.tags.map((tag: string) => (
                            <span
                                key={tag}
                                className="bg-secondary rounded-full px-2 py-1 text-xs"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </Link>
    )
}
