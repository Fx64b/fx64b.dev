import { getAllTools, getToolBySlug } from '@/data/toolsData'

import { Metadata } from 'next'
import { notFound } from 'next/navigation'

import DynamicToolLoader from '@/app/tools/components/DynamicToolLoader'

import { BackgroundGrid } from '@/components/background-grid'
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
            <div className="mx-auto max-w-(--breakpoint-lg)">
                <h1 className="mb-2 text-2xl font-bold">{tool.title}</h1>
                <p className="text-muted-foreground mb-6">{tool.description}</p>

                <Separator className="my-6" />

                <DynamicToolLoader slug={params.slug} />

                <div className="mt-12">
                    <h3 className="mb-4 text-lg font-semibold">
                        About this tool
                    </h3>
                    <p>
                        This is a free online tool that works entirely in your
                        browser.
                    </p>

                    {tool.tags.length > 0 && (
                        <div className="mt-4">
                            <h4 className="mb-2 font-medium">Tags</h4>
                            <div className="flex flex-wrap gap-2">
                                {tool.tags.map((tag) => (
                                    <span
                                        key={tag}
                                        className="bg-secondary rounded-full px-3 py-1 text-sm"
                                    >
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}
