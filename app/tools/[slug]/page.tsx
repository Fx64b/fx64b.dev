import { getAllTools, getToolBySlug } from '@/data/toolsData'
import { ChevronRight } from 'lucide-react'
import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import DynamicToolLoader from '@/app/tools/components/DynamicToolLoader'

import { BackgroundGrid } from '@/components/background-grid'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

interface ToolPageProps {
    params: Promise<{
        slug: string
    }>
}

interface GenerateMetadataProps {
    params: Promise<{
        slug: string
    }>
}

export async function generateMetadata(
    props: GenerateMetadataProps
): Promise<Metadata> {
    const params = await props.params
    const slug: string = params.slug
    const tool = getToolBySlug(slug)

    if (!tool) {
        return {
            title: 'Tool Not Found - Fx64b.dev',
        }
    }

    return {
        title: `${tool.title} - Fx64b.dev`,
        description: tool.description,
        openGraph: {
            title: `${tool.title}`,
            description: tool.description,
            url: `https://fx64b.dev/tools/${tool.slug}`,
            images: [
                {
                    url: 'https://fx64b.dev/logo.svg',
                    width: 200,
                    height: 200,
                    alt: 'Fx64b.dev',
                },
            ],
        },
    }
}

export async function generateStaticParams() {
    const tools = getAllTools()
    return tools.map((tool) => ({
        slug: tool.slug,
    }))
}

export default async function ToolPage(props: ToolPageProps) {
    const params = await props.params
    const slug: string = params.slug
    const tool = getToolBySlug(slug)

    if (!tool) {
        notFound()
    }

    return (
        <>
            <BackgroundGrid />
            <div className="container mx-auto max-w-(--breakpoint-lg) px-4 py-8">
                <nav className="text-muted-foreground mb-6 flex items-center gap-1.5 text-sm">
                    <Link
                        href="/tools"
                        className="hover:text-foreground transition-colors"
                    >
                        Tools
                    </Link>
                    <ChevronRight className="h-3.5 w-3.5 shrink-0" />
                    <span className="text-foreground truncate">{tool.title}</span>
                </nav>

                <div className="mb-6">
                    <div className="mb-1.5 flex items-start gap-3">
                        <h1 className="text-2xl font-bold tracking-tight">
                            {tool.title}
                        </h1>
                        <Badge
                            variant="secondary"
                            className="mt-1 shrink-0 capitalize"
                        >
                            {tool.category}
                        </Badge>
                    </div>
                    <p className="text-muted-foreground">{tool.description}</p>
                </div>

                <Separator className="mb-8" />

                <DynamicToolLoader slug={params.slug} />

                {tool.tags.length > 0 && (
                    <div className="mt-10 flex flex-wrap items-center gap-2">
                        <span className="text-muted-foreground text-xs uppercase tracking-wider">
                            Tags
                        </span>
                        {tool.tags.map((tag) => (
                            <Badge
                                key={tag}
                                variant="outline"
                                className="text-xs"
                            >
                                {tag}
                            </Badge>
                        ))}
                    </div>
                )}
            </div>
        </>
    )
}
