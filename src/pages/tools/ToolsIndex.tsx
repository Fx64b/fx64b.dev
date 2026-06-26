import { getToolsByCategory } from '@/data/toolsData'
import type { Tool } from '@/types/tool'
import { ArrowRight, Wrench } from 'lucide-react'

import { BackgroundGrid } from '@/components/background-grid'
import Link from '@/components/link'
import { Section } from '@/components/section'
import { Seo } from '@/components/seo'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export default function ToolsIndex() {
    const conversionTools = getToolsByCategory('conversion')
    const formattingTools = getToolsByCategory('formatting')
    const generatorTools = getToolsByCategory('generators')
    const utilityTools = getToolsByCategory('utilities')

    const allCategories = [
        { name: 'Conversion Tools', tools: conversionTools, icon: '🔄' },
        { name: 'Formatting Tools', tools: formattingTools, icon: '📝' },
        { name: 'Generator Tools', tools: generatorTools, icon: '⚡' },
        { name: 'Utility Tools', tools: utilityTools, icon: '🛠️' },
    ].filter((category) => category.tools.length > 0)

    return (
        <>
            <Seo
                title="Developer Tools - Fx64b.dev"
                description="Free online tools for developers and everyday tasks. No ads, no tracking, just tools that work."
                path="/tools"
                jsonLd={{
                    '@context': 'https://schema.org',
                    '@type': 'CollectionPage',
                    '@id': 'https://fx64b.dev/tools',
                    name: 'Developer Tools',
                    description:
                        'Free online tools for developers and everyday tasks. No ads, no tracking, just tools that work.',
                    hasPart: allCategories.flatMap((category) =>
                        category.tools.map((tool) => ({
                            '@type': 'WebApplication',
                            name: tool.title,
                            description: tool.description,
                            url: `https://fx64b.dev/tools/${tool.slug}`,
                            applicationCategory: 'DeveloperApplication',
                            operatingSystem: 'Any',
                            offers: {
                                '@type': 'Offer',
                                price: '0',
                                priceCurrency: 'USD',
                            },
                        }))
                    ),
                }}
            />
            <BackgroundGrid />

            <main className="relative">
                <Section className="pt-24">
                    <div className="mb-16 text-center">
                        <div className="mb-6 flex items-center justify-center">
                            <div className="bg-foreground/10 flex h-12 w-12 items-center justify-center rounded-full">
                                <Wrench className="h-6 w-6" />
                            </div>
                        </div>
                        <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
                            Developer Tools
                        </h1>
                        <p className="text-foreground/70 mx-auto max-w-2xl text-lg">
                            A collection of free, browser-based tools for
                            developers and everyday tasks. No ads, no tracking,
                            just tools that work.
                        </p>
                    </div>

                    {allCategories.map((category, categoryIndex) => (
                        <div key={category.name} className="mb-16">
                            <div className="mb-8 flex items-center gap-3">
                                <span className="text-2xl">
                                    {category.icon}
                                </span>
                                <h2 className="text-2xl font-semibold">
                                    {category.name}
                                </h2>
                                <Badge variant="secondary" className="ml-2">
                                    {category.tools.length}
                                </Badge>
                            </div>

                            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                                {category.tools.map((tool) => (
                                    <ToolCard key={tool.slug} tool={tool} />
                                ))}
                            </div>

                            {categoryIndex < allCategories.length - 1 && (
                                <Separator className="mt-16" />
                            )}
                        </div>
                    ))}

                    {allCategories.length === 0 && (
                        <div className="py-16 text-center">
                            <p className="text-foreground/60 text-lg">
                                Tools are coming soon. Check back later!
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
            <Card className="border-border/50 bg-card/50 hover:border-border hover:bg-card/80 h-full backdrop-blur-sm transition-all duration-300 hover:shadow-lg">
                <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                        <h3 className="group-hover:text-foreground/90 text-lg font-semibold transition-colors">
                            {tool.title}
                        </h3>
                        <ArrowRight className="text-foreground/40 group-hover:text-foreground/70 h-4 w-4 transition-all group-hover:translate-x-1" />
                    </div>
                </CardHeader>
                <CardContent>
                    <p className="text-foreground/70 mb-4 text-sm leading-relaxed">
                        {tool.description}
                    </p>
                    <div className="flex flex-wrap gap-2">
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
